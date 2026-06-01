import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchFixtures } from "@bolao/wc-api";
import { calculate, type Phase } from "@bolao/scoring";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (req.headers.get("authorization") !== expected) {
    return new NextResponse("forbidden", { status: 403 });
  }
  const admin = createAdminClient();
  const errors: any[] = [];
  let checked = 0, scored = 0;

  // find fixtures not finished, kickoff within ±4h
  const fourHours = 1000 * 60 * 60 * 4;
  const { data: candidates } = await admin
    .from("fixtures")
    .select("id, api_fixture_id, phase_id, status, scored_at")
    .neq("status", "finished")
    .gte("kickoff_at", new Date(Date.now() - fourHours).toISOString())
    .lte("kickoff_at", new Date(Date.now() + fourHours).toISOString());

  const apiIds = (candidates ?? [])
    .map(f => f.api_fixture_id)
    .filter((x): x is number => x != null);

  if (apiIds.length === 0) {
    await admin.from("cron_runs").insert({ fixtures_checked: 0, fixtures_scored: 0 });
    return NextResponse.json({ checked: 0, scored: 0 });
  }

  let apiFixtures;
  try {
    apiFixtures = await fetchFixtures(process.env.API_FOOTBALL_KEY!, { ids: apiIds });
  } catch (e: any) {
    errors.push({ stage: "fetchFixtures", message: e.message });
    await admin.from("cron_runs").insert({ fixtures_checked: 0, fixtures_scored: 0, errors });
    return NextResponse.json({ error: "api-football failed" }, { status: 502 });
  }
  checked = apiFixtures.length;

  for (const af of apiFixtures) {
    const local = candidates!.find(c => c.api_fixture_id === af.fixture_id);
    if (!local) continue;

    // sanity check absurd score
    if (af.home_score_ft != null && af.away_score_ft != null
        && Math.abs(af.home_score_ft - af.away_score_ft) > 10) {
      errors.push({ stage: "absurdScore", fixture_id: local.id, raw: af });
      continue;
    }

    await admin.from("fixtures").update({
      status: af.status,
      home_score_ft: af.home_score_ft,
      away_score_ft: af.away_score_ft,
      home_score_et: af.home_score_et,
      away_score_et: af.away_score_et,
    }).eq("id", local.id);

    if (af.status === "finished" && !local.scored_at) {
      const { data: phaseRow } = await admin.from("phases")
        .select("code").eq("id", local.phase_id).single();
      const phase = phaseRow!.code as Phase;
      const { data: bets } = await admin.from("bets")
        .select("id, home_score, away_score").eq("fixture_id", local.id);
      for (const b of bets ?? []) {
        const pts = calculate(
          { home: b.home_score, away: b.away_score },
          {
            home_ft: af.home_score_ft!, away_ft: af.away_score_ft!,
            home_et: af.home_score_et, away_et: af.away_score_et,
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
  }

  await admin.from("cron_runs").insert({
    fixtures_checked: checked,
    fixtures_scored: scored,
    errors: errors.length ? errors : null,
  });
  return NextResponse.json({ checked, scored, errors: errors.length });
}
