import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllMatches, deriveScoreFields, type Wc2026Match } from "@/lib/wc2026";
import { fetchWorldCupData, parseKickoff } from "@/lib/openfootball";
import { EN_TO_PT } from "@/lib/team-aliases";
import { calculate, type Phase } from "@bolao/scoring";
import { randomBet } from "@/lib/random-bet";

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
  for (const phase of expired) {
    const { data: fixtures } = await admin
      .from("fixtures")
      .select("id")
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
        const r = randomBet();
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
// 4h post-kickoff covers normal matches (~2h), extra time (~2.5h), and most
// stoppages. Longer interruptions (rare) fall back to manual /admin override.
// Trimmed from 6h to keep wc2026 quota usage low (~30% reduction).
const WINDOW_POST_MS = 4 * 60 * 60 * 1000;
// Cooldown: if wc2026 fetch failed in 3 consecutive recent runs, skip it for
// 15 min to avoid wasting quota on a key that's likely still disabled.
const COOLDOWN_LOOKBACK_MS = 15 * 60 * 1000;
const COOLDOWN_FAIL_THRESHOLD = 3;

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
    await admin.from("cron_runs").insert({ fixtures_checked: 0, fixtures_scored: 0 });
    return NextResponse.json({
      checked: 0,
      scored: 0,
      skipped: "no fixture in window",
      autoFilled: autoFillSummary,
    });
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

  let checked = 0;
  let scored = 0;
  let updated = 0;

  for (const m of apiMatches) {
    const homeId = codeToLocalId.get(m.home_team_code);
    const awayId = codeToLocalId.get(m.away_team_code);
    if (!homeId || !awayId) continue;

    const local = candidates.find(
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
    errors: errors.length,
    autoFilled: autoFillSummary,
  });
}
