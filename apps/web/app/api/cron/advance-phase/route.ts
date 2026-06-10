import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchGroupStandings } from "@/lib/wc2026";
import { resolveSource } from "@/lib/advance-phase";
import { championBonus } from "@bolao/scoring";
import { notifyAllApproved } from "@/lib/notify";

export const dynamic = "force-dynamic";

const PHASE_ORDER = ["group", "r32", "r16", "qf", "sf", "third", "final"] as const;

type AdminClient = ReturnType<typeof createAdminClient>;

type Standing = {
  group_code: string;
  position: number;
  team_id: number;
  points: number;
  gd: number;
};

async function fetchAllStandings(admin: AdminClient): Promise<Standing[]> {
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const { data: teams } = await admin.from("teams").select("id, fifa_code");
  const codeToLocalId = new Map((teams ?? []).map((t: { id: number; fifa_code: string }) => [t.fifa_code, t.id]));
  const allStandings: Standing[] = [];
  for (const g of groups) {
    let api;
    try {
      api = await fetchGroupStandings(g);
    } catch {
      continue;
    }
    api.forEach((row, idx) => {
      const teamId = codeToLocalId.get(row.team_code);
      if (!teamId) return;
      allStandings.push({
        group_code: g,
        position: idx + 1,
        team_id: teamId as number,
        points: row.points,
        gd: row.goal_difference,
      });
    });
  }
  return allStandings;
}

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new NextResponse("forbidden", { status: 403 });

  const admin = createAdminClient();
  const { data: phases } = await admin.from("phases").select("*").order("order_idx");
  const current = phases?.find((p: { status: string }) => p.status === "open");
  if (!current) return NextResponse.json({ note: "no open phase" });

  // Every fixture in current phase finished?
  const { data: pending } = await admin
    .from("fixtures")
    .select("id")
    .eq("phase_id", current.id)
    .is("scored_at", null);
  if ((pending?.length ?? 0) > 0)
    return NextResponse.json({ note: "phase incomplete", remaining: pending!.length });

  // Close current
  await admin.from("phases").update({ status: "closed" }).eq("id", current.id);

  // If was final → score champion picks
  if (current.code === "final") {
    const { data: finalFix } = await admin
      .from("fixtures")
      .select("home_team_id, away_team_id, home_score_ft, away_score_ft, home_score_et, away_score_et")
      .eq("phase_id", current.id)
      .single();
    const homeWon =
      (finalFix?.home_score_et ?? finalFix?.home_score_ft ?? 0) >
      (finalFix?.away_score_et ?? finalFix?.away_score_ft ?? 0);
    const champion = homeWon ? finalFix?.home_team_id : finalFix?.away_team_id;
    const { data: cps } = await admin.from("champion_picks").select("id, user_id, team_id");
    for (const cp of cps ?? []) {
      const pts = championBonus([cp.team_id], champion!);
      await admin.from("champion_picks").update({
        points: pts,
        scored_at: new Date().toISOString(),
      }).eq("id", cp.id);
    }
    return NextResponse.json({ champion_id: champion, picks_scored: cps?.length ?? 0 });
  }

  // Open next phase
  const nextIdx = PHASE_ORDER.indexOf(current.code as (typeof PHASE_ORDER)[number]) + 1;
  const nextCode = PHASE_ORDER[nextIdx];
  if (!nextCode) return NextResponse.json({ note: "no more phases" });
  const nextPhase = phases!.find((p: { code: string }) => p.code === nextCode)!;

  // Early return if we're already past group phase and next isn't r32
  // (saves 12 API calls when we're deep in knockout rounds)
  // Standings are only needed when advancing from group → r32
  let standings: Standing[] = [];
  if (current.code === "group") {
    standings = await fetchAllStandings(admin);
  }

  // Build winners map from past knockout fixtures
  const { data: pastFixtures } = await admin
    .from("fixtures")
    .select("id, phase_id, home_team_id, away_team_id, home_score_ft, away_score_ft, home_score_et, away_score_et")
    .not("scored_at", "is", null);
  const winners = new Map<string, number>();
  for (const pf of pastFixtures ?? []) {
    const phaseRow = phases!.find((p: { id: number }) => p.id === pf.phase_id)!;
    if (phaseRow.code === "group") continue;
    const phaseLabel = phaseRow.code.toUpperCase();
    const { data: siblings } = await admin
      .from("fixtures")
      .select("id")
      .eq("phase_id", pf.phase_id)
      .order("kickoff_at");
    const ordinal = (siblings ?? []).findIndex((s: { id: number }) => s.id === pf.id) + 1;
    const home = pf.home_score_et ?? pf.home_score_ft ?? 0;
    const away = pf.away_score_et ?? pf.away_score_ft ?? 0;
    if (home === away) continue;
    winners.set(`${phaseLabel}_${ordinal}`, home > away ? pf.home_team_id! : pf.away_team_id!);
    if (phaseRow.code === "sf")
      winners.set(`L_SF_${ordinal}`, home > away ? pf.away_team_id! : pf.home_team_id!);
  }

  const { data: rules } = await admin
    .from("bracket_rules")
    .select("*")
    .eq("target_phase", nextCode);
  const { data: nextFixtures } = await admin
    .from("fixtures")
    .select("id, kickoff_at")
    .eq("phase_id", nextPhase.id)
    .order("kickoff_at");

  for (const rule of rules ?? []) {
    const fixId = nextFixtures![rule.target_fixture - 1]?.id;
    if (!fixId) continue;
    const teamId = resolveSource(rule.source, standings, winners);
    if (!teamId) continue;
    const col = rule.slot === "home" ? "home_team_id" : "away_team_id";
    await admin.from("fixtures").update({ [col]: teamId }).eq("id", fixId);
  }

  const earliest = nextFixtures?.[0];
  if (earliest) {
    const closesAt = new Date(
      new Date(earliest.kickoff_at).getTime() - 10 * 60 * 1000,
    ).toISOString();
    await admin.from("phases").update({
      status: "open",
      opens_at: new Date().toISOString(),
      closes_at: closesAt,
    }).eq("code", nextCode);
    await notifyAllApproved(
      `Nova fase liberada: ${nextPhase.name}`,
      `Você tem até ${new Date(closesAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} pra palpitar.`,
    );
  }

  return NextResponse.json({ opened: nextCode });
}
