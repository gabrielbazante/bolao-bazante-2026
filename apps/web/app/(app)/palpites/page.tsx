import { createClient } from "@/lib/supabase/server";
import { BetCardPro } from "@/components/ui-pro/bet-card-pro";
import { TopBar } from "@/components/ui-pro/top-bar";
import { Clock, Trophy, Lock, ChevronDown } from "lucide-react";
import { RandomFillButton } from "./random-fill-button";
import { SubmitBetsButton } from "./submit-bets-button";

type Team = { id: number; name_pt: string; flag_emoji: string; group_code: string | null };
type Fixture = {
  id: number;
  kickoff_at: string;
  phase_id: number;
  home: Team;
  away: Team;
};

export default async function PalpitesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user!.id)
    .single();

  const name = profile?.full_name ?? "";
  const initials = name
    .split(" ").filter(Boolean).slice(0, 2)
    .map((s: string) => s[0]).join("").toUpperCase() || "?";

  // All phases that have opened at some point (open + closed + scored)
  // Order newest-first (order_idx desc).
  const { data: phases } = await supabase
    .from("phases")
    .select("*")
    .in("status", ["open", "closed", "scored"])
    .order("order_idx", { ascending: false });

  if (!phases || phases.length === 0) {
    return (
      <div className="flex flex-col">
        <TopBar title="Palpites" userInitials={initials} avatarUrl={profile?.avatar_url} />
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="depth-stat flex h-20 w-20 items-center justify-center rounded-full bg-card">
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

  const phaseIds = phases.map((p) => p.id);
  const { data: fixturesAll } = await supabase
    .from("fixtures")
    .select(
      "id, phase_id, kickoff_at, home:home_team_id(id,name_pt,flag_emoji,group_code), away:away_team_id(id,name_pt,flag_emoji,group_code)",
    )
    .in("phase_id", phaseIds)
    .not("home_team_id", "is", null)
    .not("away_team_id", "is", null)
    .order("kickoff_at");

  const { data: bets } = await supabase
    .from("bets")
    .select("fixture_id, home_score, away_score")
    .eq("user_id", user!.id);
  const byFixture = new Map((bets ?? []).map((b) => [b.fixture_id, b]));

  // Group fixtures by phase_id
  const fixturesByPhase = new Map<number, Fixture[]>();
  for (const f of (fixturesAll ?? []) as unknown as Fixture[]) {
    const arr = fixturesByPhase.get(f.phase_id) ?? [];
    arr.push(f);
    fixturesByPhase.set(f.phase_id, arr);
  }

  return (
    <div className="flex flex-col">
      <TopBar title="Palpites" userInitials={initials} avatarUrl={profile?.avatar_url} />

      <div className="mx-auto w-full max-w-md space-y-3 p-4 pb-6">
        {phases.map((phase, idx) => {
          const fixtures = fixturesByPhase.get(phase.id) ?? [];
          if (fixtures.length === 0) return null;

          const closesAt = phase.closes_at ? new Date(phase.closes_at) : null;
          const isTimeLocked = !!closesAt && closesAt.getTime() <= Date.now();
          const isStatusLocked = phase.status === "closed" || phase.status === "scored";
          const isLocked = isTimeLocked || isStatusLocked;

          const phaseBets = fixtures.filter((f) => byFixture.has(f.id));
          const filledCount = phaseBets.length;
          const totalCount = fixtures.length;
          const progress = totalCount ? (filledCount / totalCount) * 100 : 0;

          const isGroupPhase = phase.code === "group";
          const groups = new Map<string, Fixture[]>();
          if (isGroupPhase) {
            for (const f of fixtures) {
              const g = f.home?.group_code ?? "?";
              const arr = groups.get(g) ?? [];
              arr.push(f);
              groups.set(g, arr);
            }
          }

          return (
            <details
              key={phase.id}
              open={idx === 0}
              className="group rounded-2xl overflow-hidden depth-card bg-card"
            >
              <summary
                className="flex cursor-pointer items-center gap-3 px-4 py-3 list-none"
                style={{
                  background: isLocked
                    ? "linear-gradient(135deg, #475569 0%, #334155 100%)"
                    : "linear-gradient(135deg, #003d7a 0%, #1e3a8a 100%)",
                  color: "#fff",
                }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                  {isLocked ? <Lock size={14} /> : <Trophy size={14} />}
                </span>
                <div className="flex flex-1 flex-col min-w-0">
                  <span className="font-bold text-sm leading-tight">{phase.name}</span>
                  <span className="text-[10px] opacity-80">
                    {filledCount}/{totalCount} palpites · {isLocked ? "travado" : "aberto"}
                  </span>
                </div>
                <ChevronDown
                  size={20}
                  className="shrink-0 opacity-80 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>

              <div className="space-y-3 bg-background/40 p-3">
                {/* Progress + deadline */}
                <div
                  className="rounded-xl p-3"
                  style={{
                    background: isLocked
                      ? "linear-gradient(135deg, #f1f5f9, #fff)"
                      : "linear-gradient(135deg, #fef3c7, #fff)",
                    borderLeft: `4px solid ${isLocked ? "#94a3b8" : "#ffd700"}`,
                  }}
                >
                  {closesAt && (
                    <div className="mb-2 flex items-center gap-2">
                      <Clock size={12} className={isLocked ? "text-slate-600" : "text-amber-700"} />
                      <p className={`text-[11px] font-bold ${isLocked ? "text-slate-700" : "text-amber-800"}`}>
                        {isLocked
                          ? `Travado em ${closesAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
                          : `Trava ${closesAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`}
                      </p>
                    </div>
                  )}
                  <div className="h-2 overflow-hidden rounded-full" style={{ background: "#e5e7eb" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progress}%`,
                        background: isLocked
                          ? "linear-gradient(90deg, #64748b, #94a3b8)"
                          : "linear-gradient(90deg, #006633, #ffd700)",
                        transition: "width .5s ease",
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] font-semibold text-slate-500">
                    {filledCount} de {totalCount} palpites preenchidos
                  </p>
                </div>

                {/* Random fill */}
                {filledCount < totalCount && !isLocked && (
                  <RandomFillButton emptyCount={totalCount - filledCount} />
                )}

                {/* Fixtures: group view for group phase, flat list otherwise */}
                {isGroupPhase ? (
                  [...groups.entries()].sort().map(([g, list]) => (
                    <details key={g} open className="rounded-xl overflow-hidden">
                      <summary
                        className="cursor-pointer px-3 py-2 font-bold text-xs text-white"
                        style={{
                          background: "linear-gradient(135deg, #006633 0%, #003d7a 100%)",
                          listStyle: "none",
                        }}
                      >
                        Grupo {g}
                      </summary>
                      <div className="space-y-2 p-2">
                        {list.map((f) => {
                          const b = byFixture.get(f.id);
                          return (
                            <BetCardPro
                              key={f.id}
                              fixture={f}
                              initialHome={b?.home_score}
                              initialAway={b?.away_score}
                              locked={isLocked}
                            />
                          );
                        })}
                      </div>
                    </details>
                  ))
                ) : (
                  <div className="space-y-2">
                    {fixtures.map((f) => {
                      const b = byFixture.get(f.id);
                      return (
                        <BetCardPro
                          key={f.id}
                          fixture={f}
                          initialHome={b?.home_score}
                          initialAway={b?.away_score}
                          locked={isLocked}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Submit */}
                {filledCount > 0 && fixtures[0]?.kickoff_at && !isLocked && (
                  <div className="pt-1">
                    <SubmitBetsButton
                      filledCount={filledCount}
                      totalCount={totalCount}
                      firstKickoffISO={fixtures[0].kickoff_at}
                      phaseName={phase.name}
                    />
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
