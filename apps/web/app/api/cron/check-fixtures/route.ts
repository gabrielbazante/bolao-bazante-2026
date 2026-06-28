import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllMatches, deriveScoreFields, type Wc2026Match } from "@/lib/wc2026";
import { fetchWorldCupData, parseKickoff } from "@/lib/openfootball";
import { EN_TO_PT } from "@/lib/team-aliases";
import { calculate, type Phase } from "@bolao/scoring";
import { randomBet } from "@/lib/random-bet";
import { buildEffectiveRatings } from "@/lib/team-ratings";
import { NEUTRAL_RATING } from "@/lib/team-strength";

/**
 * Returns true if wc2026 should be skipped this tick because it failed in
 * COOLDOWN_FAIL_THRESHOLD consecutive runs within COOLDOWN_LOOKBACK_MS.
 * Avoids burning quota on a known-down key.
 */
async function isWc2026InCooldown(
  admin: ReturnType<typeof createAdminClient>,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - COOLDOWN_LOOKBACK_MS).toISOString();
  const { data: recent } = await admin
    .from("cron_runs")
    .select("errors")
    .gte("ran_at", cutoff)
    .order("ran_at", { ascending: false })
    .limit(COOLDOWN_FAIL_THRESHOLD);
  if (!recent || recent.length < COOLDOWN_FAIL_THRESHOLD) return false;
  return recent.every(
    (r) =>
      Array.isArray(r.errors) &&
      r.errors.some(
        (e: { stage?: string }) => e?.stage === "fetchAllMatches",
      ),
  );
}

/**
 * Fallback: when wc2026 is down/disabled, fetch openfootball and convert each
 * finished match into the same shape our handler expects (Wc2026Match).
 * Live in-progress matches don't exist in openfootball — only finals — so this
 * keeps the scoring pipeline alive but won't update the Ao Vivo tab in real time.
 */
async function fetchOpenfootballAsWc2026(
  admin: ReturnType<typeof createAdminClient>,
): Promise<Wc2026Match[]> {
  const data = await fetchWorldCupData();
  const { data: teams } = await admin.from("teams").select("fifa_code, name_pt");
  const ptToCode = new Map<string, string>(
    (teams ?? []).map((t) => [t.name_pt.toLowerCase(), t.fifa_code]),
  );

  const resolveCode = (englishName: string): string => {
    const pt = EN_TO_PT[englishName];
    if (pt && ptToCode.has(pt.toLowerCase())) return ptToCode.get(pt.toLowerCase())!;
    return ptToCode.get(englishName.toLowerCase()) ?? "";
  };

  const out: Wc2026Match[] = [];
  for (const m of data.matches) {
    if (!m.score?.ft) continue; // skip unfinished matches
    const hasEt = m.score.et != null;
    const homeCode = resolveCode(m.team1);
    const awayCode = resolveCode(m.team2);
    if (!homeCode || !awayCode) continue;
    const kickoff = parseKickoff(m.date, m.time);
    out.push({
      id: 0,
      match_number: 0,
      round: m.round,
      group_name: m.group ?? null,
      home_team_id: 0,
      home_team: m.team1,
      home_team_code: homeCode,
      away_team_id: 0,
      away_team: m.team2,
      away_team_code: awayCode,
      stadium: m.ground ?? "",
      stadium_city: "",
      stadium_country: "",
      kickoff_utc: kickoff.toISOString(),
      home_score: hasEt ? m.score.et![0] : m.score.ft[0],
      away_score: hasEt ? m.score.et![1] : m.score.ft[1],
      home_pen: m.score.p?.[0] ?? null,
      away_pen: m.score.p?.[1] ?? null,
      status: "finished",
      phase: hasEt ? "AET" : "FT",
    });
  }
  return out;
}

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * For any phase whose closes_at has passed but status is still 'open', fill in
 * random bets (WC-historical distribution) for every approved user that has
 * unfilled fixtures in that phase. Runs ONCE per phase per cron tick — idempotent
 * because the existing-bets lookup filters out anything already saved.
 */
async function autoFillExpiredPhases(admin: AdminClient) {
  const { data: expired } = await admin
    .from("phases")
    .select("id, code, closes_at")
    .eq("status", "open")
    .lte("closes_at", new Date().toISOString());

  if (!expired || expired.length === 0) return { filled: 0, phases: 0 };

  const { data: users } = await admin
    .from("profiles")
    .select("id")
    .not("approved_at", "is", null);
  if (!users || users.length === 0) return { filled: 0, phases: expired.length };

  let totalFilled = 0;
  const ratings = await buildEffectiveRatings(admin);

  for (const phase of expired) {
    const { data: fixtures } = await admin
      .from("fixtures")
      .select("id, home_team_id, away_team_id")
      .eq("phase_id", phase.id)
      .not("home_team_id", "is", null)
      .not("away_team_id", "is", null);
    if (!fixtures || fixtures.length === 0) continue;

    const fixtureIds = fixtures.map((f) => f.id);
    const { data: existing } = await admin
      .from("bets")
      .select("user_id, fixture_id")
      .in("fixture_id", fixtureIds);
    const taken = new Set(
      (existing ?? []).map((b) => `${b.user_id}|${b.fixture_id}`),
    );

    const toInsert: {
      user_id: string;
      fixture_id: number;
      home_score: number;
      away_score: number;
    }[] = [];
    for (const u of users) {
      for (const f of fixtures) {
        if (taken.has(`${u.id}|${f.id}`)) continue;
        const r = randomBet(
          ratings.get(f.home_team_id!) ?? NEUTRAL_RATING,
          ratings.get(f.away_team_id!) ?? NEUTRAL_RATING,
        );
        toInsert.push({
          user_id: u.id,
          fixture_id: f.id,
          home_score: r.home,
          away_score: r.away,
        });
      }
    }

    if (toInsert.length > 0) {
      const { error } = await admin
        .from("bets")
        .upsert(toInsert, { onConflict: "user_id,fixture_id" });
      if (!error) totalFilled += toInsert.length;
    }
  }

  return { filled: totalFilled, phases: expired.length };
}

export const dynamic = "force-dynamic";

// Observed wc2026 phases: PRE, LIVE, HT, ET, FT, AET, PEN, FT_PEN, AET_PEN.
// Treat anything containing FT/AET/PEN as finished (match is over), anything with
// LIVE/HT/ET as in-progress.
const FINISHED_TOKENS = ["FT", "AET", "PEN"];
const LIVE_TOKENS = ["LIVE", "HT", "ET"];
function isFinishedPhase(p: string) {
  return FINISHED_TOKENS.some((t) => p.includes(t));
}
function isLivePhase(p: string) {
  return !isFinishedPhase(p) && LIVE_TOKENS.some((t) => p.includes(t));
}
const WINDOW_PRE_MS = 5 * 60 * 1000;
// 6h post-kickoff covers normal matches (~2h), extra time (~2.5h), and the
// occasional long interruption (saw FRA×IRQ at ~4h with a paused match).
// Restored after wc2026 quota was bumped to 700/day — comfortable headroom.
const WINDOW_POST_MS = 6 * 60 * 60 * 1000;
// Cooldown: if wc2026 fetch failed in 3 consecutive recent runs, skip it for
// 15 min to avoid wasting quota on a key that's likely still disabled.
const COOLDOWN_LOOKBACK_MS = 15 * 60 * 1000;
const COOLDOWN_FAIL_THRESHOLD = 3;

/**
 * Group-phase standings token ("1A", "2C", ...) per team_code, computed from the
 * wc2026 group matches we already fetched. Used to map a confirmed R32 pairing to
 * the right local fixture by its home slot (always an exact group position).
 */
function wc2026GroupTokens(apiMatches: Wc2026Match[]): Map<string, string> {
  type S = { code: string; group: string; pts: number; gd: number; gf: number };
  const st = new Map<string, S>();
  const ensure = (code: string, group: string) => {
    let s = st.get(code);
    if (!s) { s = { code, group, pts: 0, gd: 0, gf: 0 }; st.set(code, s); }
    return s;
  };
  for (const m of apiMatches) {
    if (!m.group_name) continue;
    const h = ensure(m.home_team_code, m.group_name);
    const a = ensure(m.away_team_code, m.group_name);
    if (m.home_score == null || m.away_score == null) continue;
    h.gf += m.home_score; h.gd += m.home_score - m.away_score;
    a.gf += m.away_score; a.gd += m.away_score - m.home_score;
    if (m.home_score > m.away_score) h.pts += 3;
    else if (m.home_score < m.away_score) a.pts += 3;
    else { h.pts += 1; a.pts += 1; }
  }
  const byGroup = new Map<string, S[]>();
  for (const s of st.values()) {
    const arr = byGroup.get(s.group) ?? [];
    arr.push(s); byGroup.set(s.group, arr);
  }
  const tokens = new Map<string, string>();
  for (const [g, arr] of byGroup) {
    arr.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf);
    arr.forEach((s, i) => tokens.set(s.code, `${i + 1}${g}`));
  }
  return tokens;
}

/**
 * Keep the R32 bracket in sync with wc2026: the source confirms round-of-32
 * pairings (incl. third-place assignments, via FIFA's official table) as the last
 * groups settle — often before our own group phase formally closes. Populate any
 * still-empty R32 fixture as soon as its pairing is confirmed, so the bracket
 * tracks reality instead of waiting for advance-phase. Matches a confirmed pair to
 * a fixture via the home slot's exact group token, so it works even while our DB is
 * still catching up on the final group games. wc2026-only (openfootball has no
 * pairings). Returns the number of fixtures populated.
 */
async function populateR32Pairings(
  admin: AdminClient,
  apiMatches: Wc2026Match[],
  codeToLocalId: Map<string, number>,
): Promise<number> {
  const { data: r32Phase } = await admin
    .from("phases").select("id").eq("code", "r32").single();
  if (!r32Phase) return 0;

  const { data: fixtures } = await admin
    .from("fixtures")
    .select("id, home_team_id, away_team_id")
    .eq("phase_id", r32Phase.id)
    .order("id");
  const missing = new Set(
    (fixtures ?? [])
      .filter((f) => f.home_team_id == null || f.away_team_id == null)
      .map((f) => f.id),
  );
  if (missing.size === 0) return 0;

  // slot N = Nth fixture in id order (matches bracket_rules.target_fixture)
  const slotToFixtureId = new Map<number, number>();
  (fixtures ?? []).forEach((f, i) => slotToFixtureId.set(i + 1, f.id));

  const { data: rules } = await admin
    .from("bracket_rules")
    .select("target_fixture, slot, source")
    .eq("target_phase", "r32");
  const homeTokenToSlot = new Map<string, number>();
  for (const r of rules ?? []) {
    if (r.slot === "home") homeTokenToSlot.set(r.source, r.target_fixture);
  }

  const tokenOf = wc2026GroupTokens(apiMatches);

  let populated = 0;
  for (const m of apiMatches) {
    if ((m.round ?? "").toUpperCase() !== "R32") continue;
    const aId = codeToLocalId.get(m.home_team_code);
    const bId = codeToLocalId.get(m.away_team_code);
    if (!aId || !bId) continue; // pairing not confirmed yet

    // Orient to OUR bracket: the home slot is always an exact group position, so
    // whichever side carries that token is our home and the other is our away.
    // wc2026's own home/away orientation for third-place matches isn't always
    // consistent with ours, so anchor on the exact token rather than trust it.
    let slot = homeTokenToSlot.get(tokenOf.get(m.home_team_code) ?? "");
    let homeId = aId;
    let awayId = bId;
    if (!slot) {
      slot = homeTokenToSlot.get(tokenOf.get(m.away_team_code) ?? "");
      homeId = bId;
      awayId = aId;
    }
    if (!slot) continue;

    const fixId = slotToFixtureId.get(slot);
    if (!fixId || !missing.has(fixId)) continue;
    await admin
      .from("fixtures")
      .update({ home_team_id: homeId, away_team_id: awayId })
      .eq("id", fixId);
    populated++;
  }
  return populated;
}

export async function GET(req: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (req.headers.get("authorization") !== expected) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const admin = createAdminClient();
  const errors: unknown[] = [];

  // Source-independent: mark any 'scheduled' fixture whose kickoff has passed
  // (within the last 6h) as 'live'. This keeps the Ao Vivo tab populated even
  // when the data source (e.g. openfootball fallback) only knows about finished
  // matches and never reports a match in-progress.
  await admin
    .from("fixtures")
    .update({ status: "live" })
    .lte("kickoff_at", new Date().toISOString())
    .gt("kickoff_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
    .eq("status", "scheduled")
    .is("scored_at", null);

  // Auto-fill missing bets for phases whose deadline has passed.
  // Runs before the wc2026 poll so by the time scoring kicks in, every approved
  // user has a complete bet sheet — nobody gets left out.
  let autoFillSummary: { filled: number; phases: number } = { filled: 0, phases: 0 };
  try {
    autoFillSummary = await autoFillExpiredPhases(admin);
  } catch (e) {
    errors.push({
      stage: "autoFillExpiredPhases",
      message: e instanceof Error ? e.message : String(e),
    });
  }

  // Smart-poll: skip wc2026 call if no fixture is within the active window
  const now = Date.now();
  const { data: candidates } = await admin
    .from("fixtures")
    .select("id, kickoff_at, status, scored_at, phase_id, home_team_id, away_team_id")
    .gte("kickoff_at", new Date(now - WINDOW_POST_MS).toISOString())
    .lte("kickoff_at", new Date(now + WINDOW_PRE_MS).toISOString());

  if (!candidates || candidates.length === 0) {
    // Nothing to score this tick — but still poll wc2026 if the R32 bracket has
    // unconfirmed pairings to fill (they can resolve upstream before our group
    // phase closes). Otherwise skip the poll to preserve quota.
    let r32NeedsFill = false;
    const { data: r32PhaseRow } = await admin
      .from("phases").select("id").eq("code", "r32").single();
    if (r32PhaseRow) {
      const { count } = await admin
        .from("fixtures")
        .select("id", { count: "exact", head: true })
        .eq("phase_id", r32PhaseRow.id)
        .or("home_team_id.is.null,away_team_id.is.null");
      r32NeedsFill = (count ?? 0) > 0;
    }
    if (!r32NeedsFill) {
      await admin.from("cron_runs").insert({ fixtures_checked: 0, fixtures_scored: 0 });
      return NextResponse.json({
        checked: 0,
        scored: 0,
        skipped: "no fixture in window",
        autoFilled: autoFillSummary,
      });
    }
  }

  // Fetch matches — try wc2026 first (unless in cooldown), fall back to
  // openfootball if it fails. openfootball only has final scores (no live
  // updates), but scoring still works.
  let apiMatches: Wc2026Match[];
  let dataSource: "wc2026" | "openfootball" = "wc2026";
  const cooldown = await isWc2026InCooldown(admin);

  if (cooldown) {
    // Skip wc2026 entirely this tick to preserve quota
    errors.push({
      stage: "wc2026Cooldown",
      message: `skipped wc2026 (>${COOLDOWN_FAIL_THRESHOLD} consecutive failures in last ${COOLDOWN_LOOKBACK_MS / 60000}min)`,
    });
    try {
      apiMatches = await fetchOpenfootballAsWc2026(admin);
      dataSource = "openfootball";
    } catch (ofErr) {
      const ofMsg = ofErr instanceof Error ? ofErr.message : String(ofErr);
      errors.push({ stage: "openfootballFallback", message: ofMsg });
      await admin.from("cron_runs").insert({ fixtures_checked: 0, fixtures_scored: 0, errors });
      return NextResponse.json(
        { source: "openfootball", checked: 0, scored: 0, error: ofMsg, cooldown: true },
        { status: 200 },
      );
    }
  } else {
    try {
      apiMatches = await fetchAllMatches();
    } catch (wcErr) {
      const wcMsg = wcErr instanceof Error ? wcErr.message : String(wcErr);
      errors.push({ stage: "fetchAllMatches", message: wcMsg });
      try {
        apiMatches = await fetchOpenfootballAsWc2026(admin);
        dataSource = "openfootball";
      } catch (ofErr) {
        const ofMsg = ofErr instanceof Error ? ofErr.message : String(ofErr);
        errors.push({ stage: "openfootballFallback", message: ofMsg });
        await admin.from("cron_runs").insert({ fixtures_checked: 0, fixtures_scored: 0, errors });
        return NextResponse.json(
          { checked: 0, scored: 0, error: wcMsg, fallbackError: ofMsg },
          { status: 200 },
        );
      }
    }
  }

  // Build lookup: local teams by fifa_code → id
  const { data: teams } = await admin.from("teams").select("id, fifa_code");
  const codeToLocalId = new Map<string, number>();
  for (const t of teams ?? []) codeToLocalId.set(t.fifa_code, t.id);

  // Keep the R32 bracket in sync with confirmed pairings (wc2026 only).
  let r32Populated = 0;
  if (dataSource === "wc2026") {
    try {
      r32Populated = await populateR32Pairings(admin, apiMatches, codeToLocalId);
    } catch (e) {
      errors.push({
        stage: "populateR32Pairings",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  let checked = 0;
  let scored = 0;
  let updated = 0;

  for (const m of apiMatches) {
    const homeId = codeToLocalId.get(m.home_team_code);
    const awayId = codeToLocalId.get(m.away_team_code);
    if (!homeId || !awayId) continue;

    const local = (candidates ?? []).find(
      (c) => c.home_team_id === homeId && c.away_team_id === awayId,
    );
    if (!local) continue; // not in our smart-poll window
    checked++;

    // Defensive: once a fixture is marked scored (by cron OR manual admin
    // override), trust that final state and never let a lagging wc2026
    // response overwrite it. The wc2026 API has been observed reporting
    // stale scores for hours after the match really ended.
    if (local.scored_at) continue;

    const phaseUpper = (m.phase ?? "").toUpperCase();
    const isFinished = isFinishedPhase(phaseUpper);
    // Fall back to time-based inference: if the API hasn't flipped to LIVE yet
    // (lag at kickoff is common) but our kickoff_at has passed and the match
    // isn't marked finished, treat it as live so the Ao Vivo tab lights up.
    const kickoffMs = new Date(local.kickoff_at).getTime();
    const inferredLive = !isFinished && kickoffMs <= Date.now();
    const isLive = isLivePhase(phaseUpper) || inferredLive;

    // Sanity guard — absurd score
    if (m.home_score != null && m.away_score != null && Math.abs(m.home_score - m.away_score) > 10) {
      errors.push({ stage: "absurdScore", fixture_id: local.id, raw: m });
      continue;
    }

    // Log unexpected phase strings so we can investigate without guessing
    if (phaseUpper && !isFinished && !isLive && phaseUpper !== "PRE") {
      errors.push({ stage: "unknownPhase", fixture_id: local.id, phase: m.phase });
    }

    const scoreFields = deriveScoreFields(m);
    const newStatus = isFinished ? "finished" : isLive ? "live" : "scheduled";

    // Update the fixture row with current scores + status (always — even mid-match for Ao Vivo)
    await admin
      .from("fixtures")
      .update({
        status: newStatus,
        home_score_ft: scoreFields.home_score_ft,
        away_score_ft: scoreFields.away_score_ft,
        home_score_et: scoreFields.home_score_et,
        away_score_et: scoreFields.away_score_et,
      })
      .eq("id", local.id);
    updated++;

    // Score bets only on first transition to finished
    if (isFinished && !local.scored_at) {
      const { data: phaseRow } = await admin
        .from("phases").select("code").eq("id", local.phase_id).single();
      if (!phaseRow) continue;
      const phase = phaseRow.code as Phase;

      const { data: bets } = await admin
        .from("bets").select("id, home_score, away_score").eq("fixture_id", local.id);

      for (const b of bets ?? []) {
        const pts = calculate(
          { home: b.home_score, away: b.away_score },
          {
            home_ft: scoreFields.home_score_ft ?? scoreFields.home_score_et ?? 0,
            away_ft: scoreFields.away_score_ft ?? scoreFields.away_score_et ?? 0,
            home_et: scoreFields.home_score_et,
            away_et: scoreFields.away_score_et,
          },
          phase,
        );
        await admin
          .from("bets")
          .update({ points: pts, scored_at: new Date().toISOString() })
          .eq("id", b.id);
      }
      await admin
        .from("fixtures").update({ scored_at: new Date().toISOString() }).eq("id", local.id);
      scored++;
    }
  }

  await admin.from("cron_runs").insert({
    fixtures_checked: checked,
    fixtures_scored: scored,
    errors: errors.length ? errors : null,
  });
  return NextResponse.json({
    source: dataSource,
    checked,
    scored,
    updated,
    r32Populated,
    errors: errors.length,
    autoFilled: autoFillSummary,
  });
}
