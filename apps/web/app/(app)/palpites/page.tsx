import { createClient } from "@/lib/supabase/server";
import { BetCardPro } from "@/components/ui-pro/bet-card-pro";
import { TopBar } from "@/components/ui-pro/top-bar";
import { Clock, Trophy, Dices } from "lucide-react";
import { fillRandomBets } from "./actions";

export default async function PalpitesPage() {
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

  const { data: openPhase } = await supabase
    .from("phases")
    .select("*")
    .eq("status", "open")
    .maybeSingle();

  if (!openPhase) {
    return (
      <div className="flex flex-col">
        <TopBar title="Palpites" userInitials={initials} />
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div
            className="depth-stat flex h-20 w-20 items-center justify-center rounded-full bg-card"
          >
            <Trophy size={36} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">Nenhuma fase aberta</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Espere a próxima fase abrir para fazer seus palpites.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select(
      "id, kickoff_at, home:home_team_id(id,name_pt,flag_emoji,group_code), away:away_team_id(id,name_pt,flag_emoji,group_code)"
    )
    .eq("phase_id", openPhase.id)
    .order("kickoff_at");

  const {
    data: bets,
  } = await supabase
    .from("bets")
    .select("fixture_id, home_score, away_score")
    .eq("user_id", user!.id);

  const byFixture = new Map(bets?.map((b) => [b.fixture_id, b]));

  const groups = new Map<string, typeof fixtures>();
  for (const f of fixtures ?? []) {
    const g = (f as any).home?.group_code ?? "?";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(f);
  }

  const closesAt = openPhase.closes_at ? new Date(openPhase.closes_at) : null;
  const filledCount = bets?.length ?? 0;
  const totalCount = fixtures?.length ?? 0;
  const progress = totalCount ? (filledCount / totalCount) * 100 : 0;

  return (
    <div className="flex flex-col">
      <TopBar
        title={`Palpites · ${openPhase.name}`}
        userInitials={initials}
      />

      <div className="mx-auto w-full max-w-md space-y-3 p-4 pb-6">
        {/* Progress card */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: "linear-gradient(135deg, #fef3c7, #fff)",
            borderLeft: "4px solid #ffd700",
            boxShadow:
              "0 4px 16px -4px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
          }}
        >
          {closesAt && (
            <div className="mb-2 flex items-center gap-2">
              <Clock size={13} className="text-amber-700" />
              <p className="text-xs font-bold text-amber-800">
                Trava {closesAt.toLocaleString("pt-BR")}
              </p>
            </div>
          )}
          <div
            className="h-2 overflow-hidden rounded-full"
            style={{ background: "#e5e7eb" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #006633, #ffd700)",
                transition: "width .5s ease",
              }}
            />
          </div>
          <p className="mt-1.5 text-[10px] font-semibold text-slate-500">
            {filledCount} de {totalCount} palpites preenchidos
          </p>
        </div>

        {/* Random fill — only shows if there are unfilled fixtures */}
        {filledCount < totalCount && (
          <form action={fillRandomBets}>
            <button
              type="submit"
              className="btn-3d btn-3d-dark flex w-full items-center justify-center gap-2"
            >
              <Dices size={18} />
              Gerar palpites aleatórios ({totalCount - filledCount} vazios)
            </button>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              Placares ponderados pela distribuição real de Copas do Mundo. Só preenche os vazios.
            </p>
          </form>
        )}

        {/* Groups */}
        {[...groups.entries()].sort().map(([g, list]) => (
          <details key={g} open className="rounded-2xl overflow-hidden">
            <summary
              className="cursor-pointer px-4 py-3 font-bold text-sm text-white"
              style={{
                background: "linear-gradient(135deg, #003d7a 0%, #1e3a8a 100%)",
                listStyle: "none",
              }}
            >
              Grupo {g}
            </summary>
            <div className="space-y-3 bg-background/50 p-3">
              {list!.map((f: any) => {
                const b = byFixture.get(f.id);
                return (
                  <BetCardPro
                    key={f.id}
                    fixture={f}
                    initialHome={b?.home_score}
                    initialAway={b?.away_score}
                    locked={false}
                  />
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
