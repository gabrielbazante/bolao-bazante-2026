import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RankingList } from "@/components/ranking-list";
import { ScoringLegendSheet } from "@/components/scoring-legend-sheet";
import { TopBar } from "@/components/ui-pro/top-bar";

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user!.id)
    .single();

  const name = profile?.full_name ?? "";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0])
    .join("")
    .toUpperCase() || "?";

  const { data: rows } = await supabase.from("ranking").select("*");

  // Champion picks are RLS-restricted to their owner. They're locked and meant to be
  // public in the ranking now, so read them with the admin client (flags only).
  const admin = createAdminClient();
  const [{ data: picks }, { data: teamsData }, { data: phasesData }, { data: fixturesData }] =
    await Promise.all([
      admin.from("champion_picks").select("user_id, team_id"),
      admin.from("teams").select("id, flag_emoji"),
      admin.from("phases").select("id, code"),
      admin
        .from("fixtures")
        .select(
          "phase_id, home_team_id, away_team_id, home_score_ft, away_score_ft, home_score_et, away_score_et, scored_at",
        ),
    ]);

  // A pick is "out" when its team is no longer alive: alive = qualified to R32 AND
  // hasn't lost a knockout match.
  type Fx = {
    phase_id: number;
    home_team_id: number | null;
    away_team_id: number | null;
    home_score_ft: number | null;
    away_score_ft: number | null;
    home_score_et: number | null;
    away_score_et: number | null;
    scored_at: string | null;
  };
  const fixtures = (fixturesData ?? []) as Fx[];
  const phaseCode = new Map(
    (phasesData ?? []).map((p: { id: number; code: string }) => [p.id, p.code]),
  );
  // Teams present in each phase's fixtures (the advancers we populate from wc2026).
  const teamsInPhase = new Map<string, Set<number>>();
  for (const f of fixtures) {
    const code = phaseCode.get(f.phase_id);
    if (!code) continue;
    const s = teamsInPhase.get(code) ?? new Set<number>();
    if (f.home_team_id) s.add(f.home_team_id);
    if (f.away_team_id) s.add(f.away_team_id);
    teamsInPhase.set(code, s);
  }
  const nextPhase: Record<string, string> = { r32: "r16", r16: "qf", qf: "sf", sf: "final" };
  const qualified = teamsInPhase.get("r32") ?? new Set<number>();
  const koLosers = new Set<number>();
  for (const f of fixtures) {
    const code = phaseCode.get(f.phase_id);
    if (!code || code === "group" || !f.scored_at || !f.home_team_id || !f.away_team_id) continue;
    const rh = f.home_score_et ?? f.home_score_ft;
    const ra = f.away_score_et ?? f.away_score_ft;
    if (rh == null || ra == null) continue;
    let loser: number | null = null;
    if (rh > ra) loser = f.away_team_id;
    else if (ra > rh) loser = f.home_team_id;
    else {
      // Decided on penalties (equal score, not stored): the advancer is the team that
      // shows up in the next round's fixtures.
      const adv = teamsInPhase.get(nextPhase[code] ?? "");
      if (adv?.has(f.home_team_id)) loser = f.away_team_id;
      else if (adv?.has(f.away_team_id)) loser = f.home_team_id;
    }
    if (loser) koLosers.add(loser);
  }
  const isOut = (teamId: number) => !qualified.has(teamId) || koLosers.has(teamId);

  const flagById = new Map(
    (teamsData ?? []).map((t: { id: number; flag_emoji: string }) => [t.id, t.flag_emoji]),
  );
  const championFlags: Record<string, { flag: string; out: boolean }[]> = {};
  for (const p of (picks ?? []) as { user_id: string; team_id: number }[]) {
    (championFlags[p.user_id] ??= []).push({
      flag: flagById.get(p.team_id) ?? "",
      out: isOut(p.team_id),
    });
  }

  return (
    <div className="flex flex-col">
      <TopBar title="Ranking" userInitials={initials} avatarUrl={profile?.avatar_url} />

      <div className="mx-auto w-full max-w-md space-y-3 p-4 pb-6">
        <div className="flex items-center justify-end">
          <ScoringLegendSheet />
        </div>
        <RankingList initial={(rows ?? []) as any} myId={user!.id} championFlags={championFlags} />
      </div>
    </div>
  );
}
