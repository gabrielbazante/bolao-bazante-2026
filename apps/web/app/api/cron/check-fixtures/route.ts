import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchWorldCupData, parseKickoff } from "@/lib/openfootball";
import { resolvePtName } from "@/lib/team-aliases";
import { calculate, type Phase } from "@bolao/scoring";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (req.headers.get("authorization") !== expected) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const admin = createAdminClient();
  const errors: unknown[] = [];
  let checked = 0;
  let scored = 0;

  // Fetch openfootball source
  let ofData;
  try {
    ofData = await fetchWorldCupData();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    errors.push({ stage: "fetchWorldCupData", message });
    await admin.from("cron_runs").insert({ fixtures_checked: 0, fixtures_scored: 0, errors });
    return NextResponse.json({ error: "openfootball fetch failed" }, { status: 502 });
  }

  const matches = ofData.matches ?? [];
  checked = matches.length;

  const now = Date.now();
  const twoDays = 1000 * 60 * 60 * 48;

  // Pre-load all teams so we can resolve PT name → id
  const { data: teams } = await admin.from("teams").select("id, name_pt");
  const teamByPtName = new Map<string, number>();
  for (const t of teams ?? []) {
    teamByPtName.set(t.name_pt.toLowerCase(), t.id);
  }

  for (const m of matches) {
    const kickoff = parseKickoff(m.date, m.time);
    const kickoffMs = kickoff.getTime();

    if (!m.score?.ft) {
      // No final score yet — update status if past kickoff
      if (kickoffMs < now) {
        // Kick off has passed: mark live (only if not already finished)
        const team1Pt = resolvePtName(m.team1);
        const team2Pt = resolvePtName(m.team2);
        const homeId = teamByPtName.get(team1Pt.toLowerCase());
        const awayId = teamByPtName.get(team2Pt.toLowerCase());
        if (homeId && awayId) {
          await admin
            .from("fixtures")
            .update({ status: "live" })
            .eq("home_team_id", homeId)
            .eq("away_team_id", awayId)
            .neq("status", "finished")
            .gte("kickoff_at", new Date(kickoffMs - twoDays).toISOString())
            .lte("kickoff_at", new Date(kickoffMs + twoDays).toISOString());
        }
      } else {
        // Future match that somehow got marked live — flip back
        const team1Pt = resolvePtName(m.team1);
        const team2Pt = resolvePtName(m.team2);
        const homeId = teamByPtName.get(team1Pt.toLowerCase());
        const awayId = teamByPtName.get(team2Pt.toLowerCase());
        if (homeId && awayId) {
          await admin
            .from("fixtures")
            .update({ status: "scheduled" })
            .eq("home_team_id", homeId)
            .eq("away_team_id", awayId)
            .eq("status", "live")
            .gte("kickoff_at", new Date(kickoffMs - twoDays).toISOString())
            .lte("kickoff_at", new Date(kickoffMs + twoDays).toISOString());
        }
      }
      continue;
    }

    // Match has a final score
    const ft = m.score.ft;
    const et = m.score.et ?? null;

    // Use ET if present, else FT (ignore penalties per bolão rules)
    const finalHome = et ? et[0] : ft[0];
    const finalAway = et ? et[1] : ft[1];

    // Sanity: absurd score guard
    if (Math.abs(finalHome - finalAway) > 10) {
      errors.push({
        stage: "absurdScore",
        team1: m.team1,
        team2: m.team2,
        score: m.score,
      });
      continue;
    }

    const team1Pt = resolvePtName(m.team1);
    const team2Pt = resolvePtName(m.team2);
    const homeId = teamByPtName.get(team1Pt.toLowerCase());
    const awayId = teamByPtName.get(team2Pt.toLowerCase());

    if (!homeId || !awayId) {
      errors.push({
        stage: "teamLookup",
        team1: m.team1,
        team2: m.team2,
        resolved: { team1Pt, team2Pt },
      });
      continue;
    }

    // Find local fixture by teams + kickoff date ±2 days
    const { data: localFixtures } = await admin
      .from("fixtures")
      .select("id, phase_id, status, scored_at")
      .eq("home_team_id", homeId)
      .eq("away_team_id", awayId)
      .gte("kickoff_at", new Date(kickoffMs - twoDays).toISOString())
      .lte("kickoff_at", new Date(kickoffMs + twoDays).toISOString());

    const local = localFixtures?.[0];
    if (!local) continue;

    // Already scored — skip
    if (local.scored_at) continue;

    // Update fixture scores and status
    await admin.from("fixtures").update({
      home_score_ft: ft[0],
      away_score_ft: ft[1],
      home_score_et: et ? et[0] : null,
      away_score_et: et ? et[1] : null,
      status: "finished",
    }).eq("id", local.id);

    // Score all bets for this fixture
    const { data: phaseRow } = await admin
      .from("phases")
      .select("code")
      .eq("id", local.phase_id)
      .single();
    const phase = phaseRow!.code as Phase;

    const { data: bets } = await admin
      .from("bets")
      .select("id, home_score, away_score")
      .eq("fixture_id", local.id);

    for (const b of bets ?? []) {
      const pts = calculate(
        { home: b.home_score, away: b.away_score },
        {
          home_ft: ft[0],
          away_ft: ft[1],
          home_et: et ? et[0] : null,
          away_et: et ? et[1] : null,
        },
        phase,
      );
      await admin.from("bets").update({
        points: pts,
        scored_at: new Date().toISOString(),
      }).eq("id", b.id);
    }

    await admin.from("fixtures").update({
      scored_at: new Date().toISOString(),
    }).eq("id", local.id);

    scored++;
  }

  await admin.from("cron_runs").insert({
    fixtures_checked: checked,
    fixtures_scored: scored,
    errors: errors.length ? errors : null,
  });

  return NextResponse.json({ checked, scored, errors: errors.length });
}
