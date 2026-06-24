import { createClient } from "@/lib/supabase/server";

type TeamStat = {
  team_id: number;
  name_pt: string;
  flag_emoji: string;
  group_code: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

export async function GroupsStandings() {
  const supabase = await createClient();

  // Group-phase id (= phases.code='group'). Static, but fetch to stay safe.
  const { data: groupPhase } = await supabase
    .from("phases").select("id").eq("code", "group").single();
  if (!groupPhase) return null;

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name_pt, flag_emoji, group_code")
    .not("group_code", "is", null);
  if (!teams) return null;

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("home_team_id, away_team_id, home_score_ft, away_score_ft")
    .eq("phase_id", groupPhase.id)
    .not("scored_at", "is", null)
    .not("home_score_ft", "is", null);

  // Initialize stats per team
  const stats = new Map<number, TeamStat>();
  for (const t of teams) {
    stats.set(t.id, {
      team_id: t.id,
      name_pt: t.name_pt,
      flag_emoji: t.flag_emoji,
      group_code: t.group_code as string,
      played: 0, won: 0, drawn: 0, lost: 0,
      gf: 0, ga: 0, gd: 0, points: 0,
    });
  }

  // Accumulate from finished group-stage fixtures
  for (const f of fixtures ?? []) {
    const h = stats.get(f.home_team_id);
    const a = stats.get(f.away_team_id);
    if (!h || !a) continue;
    const hs = f.home_score_ft ?? 0;
    const as_ = f.away_score_ft ?? 0;
    h.played++; a.played++;
    h.gf += hs; h.ga += as_;
    a.gf += as_; a.ga += hs;
    if (hs > as_) { h.won++; h.points += 3; a.lost++; }
    else if (hs < as_) { a.won++; a.points += 3; h.lost++; }
    else { h.drawn++; a.drawn++; h.points += 1; a.points += 1; }
  }
  for (const s of stats.values()) s.gd = s.gf - s.ga;

  // Group + sort
  const byGroup = new Map<string, TeamStat[]>();
  for (const s of stats.values()) {
    const arr = byGroup.get(s.group_code) ?? [];
    arr.push(s);
    byGroup.set(s.group_code, arr);
  }
  for (const arr of byGroup.values()) {
    arr.sort((a, b) =>
      b.points - a.points || b.gd - a.gd || b.gf - a.gf ||
      a.name_pt.localeCompare(b.name_pt, "pt-BR"),
    );
  }

  // Best-third selection: top 8 third-placed teams across groups
  const thirds: TeamStat[] = [];
  for (const arr of byGroup.values()) {
    if (arr[2]) thirds.push(arr[2]);
  }
  thirds.sort((a, b) =>
    b.points - a.points || b.gd - a.gd || b.gf - a.gf,
  );
  const qualifiedThirdIds = new Set(thirds.slice(0, 8).map((t) => t.team_id));

  const sortedGroupCodes = [...byGroup.keys()].sort();
  const anyMatchPlayed = (fixtures ?? []).length > 0;

  return (
    <div
      className="rounded-2xl bg-card p-4"
      style={{
        boxShadow:
          "0 4px 16px -4px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
        border: "1px solid rgba(0,0,0,.05)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Tabela dos grupos
        </p>
        {anyMatchPlayed && (
          <div className="flex items-center gap-2 text-[8px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-emerald-500" />
              <span>Classificado</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-amber-500" />
              <span>Melhor 3º</span>
            </span>
          </div>
        )}
      </div>

      {!anyMatchPlayed && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Os grupos vão aparecer aqui assim que o primeiro jogo terminar.
        </p>
      )}

      {anyMatchPlayed && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sortedGroupCodes.map((code) => {
            const teams = byGroup.get(code)!;
            return (
              <div key={code} className="rounded-xl border border-border/50 bg-background/40 p-2.5">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                  Grupo {code}
                </p>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-[8px] text-muted-foreground">
                      <th className="text-left pb-1 font-semibold">Time</th>
                      <th className="text-center pb-1 font-semibold w-6">J</th>
                      <th className="text-center pb-1 font-semibold w-6">SG</th>
                      <th className="text-center pb-1 font-semibold w-6">P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((t, idx) => {
                      const directQualifier = idx < 2 && t.played > 0;
                      const thirdQualifier =
                        idx === 2 && qualifiedThirdIds.has(t.team_id) && t.played > 0;
                      const bg = directQualifier
                        ? "bg-emerald-100/70 dark:bg-emerald-950/40"
                        : thirdQualifier
                          ? "bg-amber-100/70 dark:bg-amber-950/40"
                          : "";
                      return (
                        <tr key={t.team_id} className={bg}>
                          <td className="py-1">
                            <span className="flex items-center gap-1.5">
                              <span className="text-base leading-none">{t.flag_emoji}</span>
                              <span className="text-[11px] font-semibold truncate">
                                {t.name_pt}
                              </span>
                            </span>
                          </td>
                          <td className="text-center text-[10px] tabular-nums">{t.played}</td>
                          <td className="text-center text-[10px] tabular-nums">
                            {t.gd > 0 ? `+${t.gd}` : t.gd}
                          </td>
                          <td className="text-center text-[11px] font-extrabold tabular-nums">
                            {t.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
