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
  // public in the ranking now, so read them with the admin client (flags only) and
  // build a userId → [flag, flag] map.
  const admin = createAdminClient();
  const [{ data: picks }, { data: teamsData }] = await Promise.all([
    admin.from("champion_picks").select("user_id, team_id"),
    admin.from("teams").select("id, flag_emoji"),
  ]);
  const flagById = new Map(
    (teamsData ?? []).map((t: { id: number; flag_emoji: string }) => [t.id, t.flag_emoji]),
  );
  const championFlags: Record<string, string[]> = {};
  for (const p of (picks ?? []) as { user_id: string; team_id: number }[]) {
    (championFlags[p.user_id] ??= []).push(flagById.get(p.team_id) ?? "");
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
