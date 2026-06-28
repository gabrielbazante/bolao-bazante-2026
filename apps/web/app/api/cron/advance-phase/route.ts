import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchGroupStandings, fetchAllMatches } from "@/lib/wc2026";
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

/**
 * Actual R32 pairings as reported by wc2026, keyed teamId -> opponent teamId.
 * Used to get the THIRD-PLACE assignment right: FIFA maps the 8 qualifying thirds
 * to round-of-32 matches via a fixed combination table, NOT "best third among a
 * subset" — so we trust the source instead of reimplementing that table. Returns
 * null if the API is unavailable (caller falls back to the local heuristic).
 */
async function fetchR32Partners(admin: AdminClient): Promise<Map<number, number> | null> {
  const { data: teams } = await admin.from("teams").select("id, fifa_code");
  const codeToLocalId = new Map(
    (teams ?? []).map((t: { id: number; fifa_code: string }) => [t.fifa_code, t.id]),
  );
  let matches;
  try {
    matches = await fetchAllMatches();
  } catch {
    return null;
  }
  const partners = new Map<number, number>();
  for (const m of matches) {
    if ((m.round ?? "").toUpperCase() !== "R32") continue;
    const h = codeToLocalId.get(m.home_team_code) as number | undefined;
    const a = codeToLocalId.get(m.away_team_code) as number | undefined;
    if (!h || !a) continue;
    partners.set(h, a);
    partners.set(a, h);
  }
  return partners;
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
    // Ordinal = bracket slot = position in id order (NOT kickoff order, which
    // diverges from slot order once real kickoff times load). W_R32_n etc. reference
    // this slot number, matching bracket_rules.target_fixture.
    const { data: siblings } = await admin
      .from("fixtures")
      .select("id")
      .eq("phase_id", pf.phase_id)
      .order("id");
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
  // Order by id: bracket_rules.target_fixture N maps to the Nth fixture in id/slot
  // order (101..116 = slots 1..16), NOT kickoff order.
  const { data: nextFixtures } = await admin
    .from("fixtures")
    .select("id, kickoff_at")
    .eq("phase_id", nextPhase.id)
    .order("id");

  // For R32, get the real pairings from wc2026 so third-place slots are assigned
  // per FIFA's official combination table (the API already applies it). null = API
  // down → third-place slots stay empty until the bracket sync can confirm them.
  const r32Partners = nextCode === "r32" ? await fetchR32Partners(admin) : null;

  const bySlot = new Map<number, { home?: string; away?: string }>();
  for (const rule of rules ?? []) {
    const entry = bySlot.get(rule.target_fixture) ?? {};
    entry[rule.slot as "home" | "away"] = rule.source;
    bySlot.set(rule.target_fixture, entry);
  }

  for (const [slot, srcs] of bySlot) {
    const fixId = nextFixtures![slot - 1]?.id;
    if (!fixId) continue;
    // Home slot is always an exact group position (1X/2X) → resolves reliably.
    const homeId = srcs.home ? resolveSource(srcs.home, standings, winners) : null;
    let awayId: number | null = null;
    if (srcs.away) {
      const awayIsThird = /^3[A-L]+$/.test(srcs.away);
      const partner = r32Partners && homeId ? r32Partners.get(homeId) ?? null : null;
      if (partner) {
        awayId = partner; // confirmed pairing from wc2026 (incl. the correct third)
      } else if (!awayIsThird) {
        awayId = resolveSource(srcs.away, standings, winners); // exact slot (2X / winner)
      }
      // Third-place + not yet confirmed by wc2026 → leave null rather than guess
      // (FIFA's combination table isn't reproduced locally). The check-fixtures
      // bracket sync fills it as soon as wc2026 publishes the assignment.
    }
    if (homeId) await admin.from("fixtures").update({ home_team_id: homeId }).eq("id", fixId);
    if (awayId) await admin.from("fixtures").update({ away_team_id: awayId }).eq("id", fixId);
  }

  // closes_at is driven by the earliest kickoff, which (post re-time) need not be
  // the slot-1 fixture — pick the true minimum.
  const earliest = (nextFixtures ?? []).reduce<{ kickoff_at: string } | undefined>(
    (min, f) => (!min || f.kickoff_at < min.kickoff_at ? f : min),
    undefined,
  );
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
