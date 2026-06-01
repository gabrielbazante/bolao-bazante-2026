import { createClient } from "@/lib/supabase/server";
import { LiveMatchCard } from "@/components/live-match-card";

export default async function LivePage() {
  const supabase = await createClient();
  const { data: live } = await supabase
    .from("fixtures")
    .select("id, home_score_ft, away_score_ft, home:home_team_id(id,name_pt,flag_emoji), away:away_team_id(id,name_pt,flag_emoji)")
    .eq("status", "live");
  if (!live?.length) return (
    <div className="p-6 text-center text-muted-foreground">
      Nenhum jogo rolando agora.
    </div>
  );
  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <div className="rounded-xl bg-gradient-to-br from-red-600 to-blue-900 text-white p-3 text-center">
        <p className="text-[10px] uppercase tracking-widest opacity-90">Rolando agora</p>
        <p className="text-2xl font-black">{live.length} {live.length === 1 ? "jogo" : "jogos"}</p>
      </div>
      {live.map(f => <LiveMatchCard key={f.id} fixture={f as any} />)}
    </div>
  );
}
