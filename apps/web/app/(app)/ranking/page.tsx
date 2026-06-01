import { createClient } from "@/lib/supabase/server";
import { RankingList } from "@/components/ranking-list";
import { ScoringLegendSheet } from "@/components/scoring-legend-sheet";

export default async function RankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: rows } = await supabase.from("ranking").select("*");
  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Ranking</h1>
        <ScoringLegendSheet />
      </div>
      <RankingList initial={(rows ?? []) as any} myId={user!.id} />
    </div>
  );
}
