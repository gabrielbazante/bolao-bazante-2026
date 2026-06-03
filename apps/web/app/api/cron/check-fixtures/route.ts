import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllMatches, deriveScoreFields, type Wc2026Match } from "@/lib/wc2026";
import { calculate, type Phase } from "@bolao/scoring";

export const dynamic = "force-dynamic";

const FINISHED_PHASES = new Set(["FT", "AET", "PEN"]);
const LIVE_PHASES = new Set(["LIVE", "HT", "ET"]);
const WINDOW_PRE_MS = 5 * 60 * 1000;
const WINDOW_POST_MS = 3 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (req.headers.get("authorization") !== expected) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const admin = createAdminClient();
  const errors: unknown[] = [];

  // Smart-poll: skip wc2026 call if no fixture is within the active window
  const now = Date.now();
  const { data: candidates } = await admin
    .from("fixtures")
    .select("id, kickoff_at, status, scored_at, phase_id, home_team_id, away_team_id")
    .gte("kickoff_at", new Date(now - WINDOW_POST_MS).toISOString())
    .lte("kickoff_at", new Date(now + WINDOW_PRE_MS).toISOString());

  if (!candidates || candidates.length === 0) {
    await admin.from("cron_runs").insert({ fixtures_checked: 0, fixtures_scored: 0 });
    return NextResponse.json({ checked: 0, scored: 0, skipped: "no fixture in window" });
  }

  // Fetch all matches (1 API call covers everything)
  let apiMatches: Wc2026Match[];
  try {
    apiMatches = await fetchAllMatches();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push({ stage: "fetchAllMatches", message: msg });
    await admin.from("cron_runs").insert({ fixtures_checked: 0, fixtures_scored: 0, errors });
    return NextResponse.json({ error: msg }, { status: 502 });
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

    const phaseUpper = (m.phase ?? "").toUpperCase();
    const isFinished = FINISHED_PHASES.has(phaseUpper);
    const isLive = LIVE_PHASES.has(phaseUpper);

    // Sanity guard — absurd score
    if (m.home_score != null && m.away_score != null && Math.abs(m.home_score - m.away_score) > 10) {
      errors.push({ stage: "absurdScore", fixture_id: local.id, raw: m });
      continue;
    }

    // Log unexpected phase strings so we can investigate without guessing
    if (phaseUpper && !FINISHED_PHASES.has(phaseUpper) && !LIVE_PHASES.has(phaseUpper) && phaseUpper !== "PRE") {
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
  return NextResponse.json({ checked, scored, updated, errors: errors.length });
}
