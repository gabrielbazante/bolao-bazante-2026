import { createClient } from "@/lib/supabase/server";
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
    .select("full_name")
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

  return (
    <div className="flex flex-col">
      <TopBar title="Ranking" userInitials={initials} />

      <div className="mx-auto w-full max-w-md space-y-3 p-4 pb-6">
        <div className="flex items-center justify-end">
          <ScoringLegendSheet />
        </div>
        <RankingList initial={(rows ?? []) as any} myId={user!.id} />
      </div>
    </div>
  );
}
