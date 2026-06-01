import { createClient } from "@/lib/supabase/server";
import { FixtureBetCard } from "@/components/fixture-bet-card";

export default async function PalpitesPage() {
  const supabase = await createClient();
  const { data: openPhase } = await supabase
    .from("phases").select("*").eq("status", "open").maybeSingle();

  if (!openPhase) {
    return <div className="p-6 text-center text-muted-foreground">
      Nenhuma fase aberta agora. Espere a próxima abrir.
    </div>;
  }

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("id, kickoff_at, home:home_team_id(id,name_pt,flag_emoji,group_code), away:away_team_id(id,name_pt,flag_emoji,group_code)")
    .eq("phase_id", openPhase.id)
    .order("kickoff_at");

  const { data: { user } } = await supabase.auth.getUser();
  const { data: bets } = await supabase
    .from("bets").select("fixture_id, home_score, away_score").eq("user_id", user!.id);
  const byFixture = new Map(bets?.map(b => [b.fixture_id, b]));

  const groups = new Map<string, typeof fixtures>();
  for (const f of fixtures ?? []) {
    const g = (f as any).home?.group_code ?? "?";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(f);
  }

  const closesAt = openPhase.closes_at ? new Date(openPhase.closes_at) : null;
  const filledCount = bets?.length ?? 0;
  const totalCount = fixtures?.length ?? 0;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <div className="rounded-xl border bg-card p-3">
        <p className="font-bold text-primary">⚽ {openPhase.name}</p>
        {closesAt && <p className="text-xs text-red-600 font-semibold">
          ⏰ Trava {closesAt.toLocaleString("pt-BR")}
        </p>}
        <div className="h-1.5 bg-muted rounded mt-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-600 to-yellow-400"
            style={{ width: `${totalCount ? (filledCount/totalCount)*100 : 0}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {filledCount} de {totalCount} palpites preenchidos
        </p>
      </div>
      {[...groups.entries()].sort().map(([g, list]) => (
        <details key={g} open className="rounded-xl border bg-muted/40">
          <summary className="px-3 py-2 font-semibold cursor-pointer">Grupo {g}</summary>
          <div className="p-2 space-y-2">
            {list!.map((f: any) => {
              const b = byFixture.get(f.id);
              return (
                <FixtureBetCard key={f.id} fixture={f}
                  initialHome={b?.home_score} initialAway={b?.away_score}
                  locked={false} />
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}
