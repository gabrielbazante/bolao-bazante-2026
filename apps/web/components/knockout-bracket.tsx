import { createClient } from "@/lib/supabase/server";

type Team = { id: number; name_pt: string; flag_emoji: string };
type Fixture = {
  id: number;
  phase_id: number;
  kickoff_at: string;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score_ft: number | null;
  away_score_ft: number | null;
  home_score_et: number | null;
  away_score_et: number | null;
  scored_at: string | null;
};
type Phase = { id: number; code: string; name: string; order_idx: number };
type BracketRule = {
  target_phase: string;
  target_fixture: number;
  slot: "home" | "away";
  source: string;
};

/** Token "1A" / "2C" / "3CEFHI" / "W_R32_n" / "L_SF_n" → texto amigável */
function prettifySlot(src: string): string {
  const m1 = /^([12])([A-L])$/.exec(src);
  if (m1) return `${m1[1]!}º Grupo ${m1[2]!}`;
  const m3 = /^3([A-L]+)$/.exec(src);
  if (m3) return `Melhor 3º (${m3[1]!.split("").join("/")})`;
  const mw = /^W_(R32|R16|QF|SF)_(\d+)$/.exec(src);
  if (mw) {
    const phaseMap: Record<string, string> = {
      R32: "2ª fase", R16: "Oitavas", QF: "Quartas", SF: "Semi",
    };
    return `Vencedor ${phaseMap[mw[1]!]} #${mw[2]!}`;
  }
  const ml = /^L_SF_(\d+)$/.exec(src);
  if (ml) return `Perdedor Semi #${ml[1]!}`;
  return src;
}

const PHASE_GRADIENT: Record<string, string> = {
  r32:   "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
  r16:   "linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)",
  qf:    "linear-gradient(135deg, #be185d 0%, #9d174d 100%)",
  sf:    "linear-gradient(135deg, #b45309 0%, #92400e 100%)",
  third: "linear-gradient(135deg, #047857 0%, #065f46 100%)",
  final: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%) ",
};

export async function KnockoutBracket() {
  const supabase = await createClient();

  const { data: phases } = await supabase
    .from("phases")
    .select("id, code, name, order_idx")
    .neq("code", "group")
    .order("order_idx");

  if (!phases || phases.length === 0) return null;

  const phaseIds = phases.map((p) => p.id);
  const { data: fixtures } = await supabase
    .from("fixtures")
    .select(
      "id, phase_id, kickoff_at, home_team_id, away_team_id, home_score_ft, away_score_ft, home_score_et, away_score_et, scored_at",
    )
    .in("phase_id", phaseIds)
    .order("kickoff_at");

  const { data: teamsList } = await supabase
    .from("teams").select("id, name_pt, flag_emoji");
  const teamMap = new Map<number, Team>(
    (teamsList ?? []).map((t) => [t.id, t]),
  );

  const { data: rules } = await supabase
    .from("bracket_rules")
    .select("target_phase, target_fixture, slot, source");

  const rulesByPhase = new Map<string, Map<number, { home?: string; away?: string }>>();
  for (const r of (rules ?? []) as BracketRule[]) {
    if (!rulesByPhase.has(r.target_phase)) rulesByPhase.set(r.target_phase, new Map());
    const phaseMap = rulesByPhase.get(r.target_phase)!;
    if (!phaseMap.has(r.target_fixture)) phaseMap.set(r.target_fixture, {});
    phaseMap.get(r.target_fixture)![r.slot] = r.source;
  }

  const fixturesByPhase = new Map<number, Fixture[]>();
  for (const f of (fixtures ?? []) as Fixture[]) {
    const arr = fixturesByPhase.get(f.phase_id) ?? [];
    arr.push(f);
    fixturesByPhase.set(f.phase_id, arr);
  }

  return (
    <details
      className="group rounded-2xl overflow-hidden bg-card"
      style={{
        boxShadow: "0 4px 16px -4px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
        border: "1px solid rgba(0,0,0,.05)",
      }}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 list-none">
        <div className="flex flex-col">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Chaveamento
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            2ª fase · Oitavas · Quartas · Semi · Final
          </p>
        </div>
        <svg
          className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>

      <div className="space-y-2 px-3 pb-3">
        {(phases as Phase[]).map((phase) => {
          const phaseFixtures = fixturesByPhase.get(phase.id) ?? [];
          if (phaseFixtures.length === 0) return null;
          const phaseRules = rulesByPhase.get(phase.code);

          return (
            <details
              key={phase.id}
              className="group/sub rounded-xl overflow-hidden border border-border/50"
            >
              <summary
                className="cursor-pointer flex items-center justify-between gap-2 px-3 py-2 list-none text-white"
                style={{ background: PHASE_GRADIENT[phase.code] }}
              >
                <span className="text-xs font-bold uppercase tracking-wide">
                  {phase.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] opacity-80">
                    {phaseFixtures.length} {phaseFixtures.length === 1 ? "jogo" : "jogos"}
                  </span>
                  <svg
                    className="h-3.5 w-3.5 opacity-80 transition-transform duration-200 group-open/sub:rotate-180"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </summary>

              <ul className="divide-y divide-border/40 bg-background/40">
                {phaseFixtures.map((f, idx) => {
                  const home = f.home_team_id ? teamMap.get(f.home_team_id) : null;
                  const away = f.away_team_id ? teamMap.get(f.away_team_id) : null;
                  const sourceHome = phaseRules?.get(idx + 1)?.home;
                  const sourceAway = phaseRules?.get(idx + 1)?.away;

                  const realH = f.home_score_et ?? f.home_score_ft;
                  const realA = f.away_score_et ?? f.away_score_ft;
                  const hasScore = realH != null && realA != null;
                  const homeWon = hasScore && realH! > realA!;
                  const awayWon = hasScore && realA! > realH!;

                  const dateStr = new Date(f.kickoff_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const row = (
                    team: Team | null,
                    sourceToken: string | undefined,
                    won: boolean,
                  ) => (
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 ${won ? "font-bold" : ""}`}
                    >
                      {team ? (
                        <>
                          <span className="text-lg leading-none">{team.flag_emoji}</span>
                          <span className="flex-1 text-xs truncate">{team.name_pt}</span>
                        </>
                      ) : (
                        <>
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground">
                            ?
                          </span>
                          <span className="flex-1 text-[11px] italic text-muted-foreground">
                            {sourceToken ? prettifySlot(sourceToken) : "—"}
                          </span>
                        </>
                      )}
                    </div>
                  );

                  return (
                    <li key={f.id} className="py-1">
                      <p className="px-3 pt-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                        #{idx + 1} · {dateStr}
                      </p>
                      {row(home ?? null, sourceHome, homeWon)}
                      {hasScore ? (
                        <p className="px-3 text-center font-display text-base text-primary tabular-nums">
                          {realH} - {realA}
                        </p>
                      ) : (
                        <p className="px-3 text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                          vs
                        </p>
                      )}
                      {row(away ?? null, sourceAway, awayWon)}
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </details>
  );
}
