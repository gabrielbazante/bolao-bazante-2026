import { createClient } from "@/lib/supabase/server";
import { resolveSource } from "@/lib/advance-phase";

type Team = { id: number; name_pt: string; flag_emoji: string; group_code: string | null };
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

const PHASE_GRADIENT: Record<string, string> = {
  r32:   "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
  r16:   "linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)",
  qf:    "linear-gradient(135deg, #be185d 0%, #9d174d 100%)",
  sf:    "linear-gradient(135deg, #b45309 0%, #92400e 100%)",
  third: "linear-gradient(135deg, #047857 0%, #065f46 100%)",
  final: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
};

/** Token "1A" / "3CEFHI" / "W_R32_n" → pretty short label (for placeholders) */
function prettifySlot(src: string): string {
  const m1 = /^([12])([A-L])$/.exec(src);
  if (m1) return `${m1[1]!}º Gr.${m1[2]!}`;
  const m3 = /^3([A-L]+)$/.exec(src);
  if (m3) return `3º ${m3[1]!.split("").join("/")}`;
  const mw = /^W_(R32|R16|QF|SF)_(\d+)$/.exec(src);
  if (mw) {
    const labels: Record<string, string> = { R32: "2ª", R16: "8as", QF: "QF", SF: "SF" };
    return `Ven. ${labels[mw[1]!]} #${mw[2]!}`;
  }
  const ml = /^L_SF_(\d+)$/.exec(src);
  if (ml) return `Per. SF #${ml[1]!}`;
  return src;
}

export async function KnockoutBracket() {
  const supabase = await createClient();

  // 1. Phases + fixtures + rules + teams (single fetches, then combine)
  const { data: phases } = await supabase
    .from("phases")
    .select("id, code, name, order_idx")
    .neq("code", "group")
    .order("order_idx");
  if (!phases || phases.length === 0) return null;

  const phaseIds = phases.map((p) => p.id);
  const { data: fixturesRaw } = await supabase
    .from("fixtures")
    .select(
      "id, phase_id, kickoff_at, home_team_id, away_team_id, home_score_ft, away_score_ft, home_score_et, away_score_et, scored_at",
    )
    .in("phase_id", phaseIds)
    .order("kickoff_at");

  const { data: teamsList } = await supabase
    .from("teams").select("id, name_pt, flag_emoji, group_code");
  const teamMap = new Map<number, Team>(
    (teamsList ?? []).map((t) => [t.id, t as Team]),
  );

  const { data: rulesRaw } = await supabase
    .from("bracket_rules")
    .select("target_phase, target_fixture, slot, source");

  // 2. Compute group standings locally (so we can resolve slots like 1A, 3CEFHI on the fly)
  const { data: groupPhaseRow } = await supabase
    .from("phases").select("id").eq("code", "group").single();
  const { data: groupFixtures } = await supabase
    .from("fixtures")
    .select("home_team_id, away_team_id, home_score_ft, away_score_ft")
    .eq("phase_id", groupPhaseRow!.id)
    .not("scored_at", "is", null);

  type Stat = {
    team_id: number;
    group_code: string;
    played: number;
    points: number;
    gf: number;
    ga: number;
    gd: number;
  };
  const stats = new Map<number, Stat>();
  for (const t of teamMap.values()) {
    if (!t.group_code) continue;
    stats.set(t.id, {
      team_id: t.id,
      group_code: t.group_code,
      played: 0, points: 0, gf: 0, ga: 0, gd: 0,
    });
  }
  for (const f of groupFixtures ?? []) {
    const h = stats.get(f.home_team_id);
    const a = stats.get(f.away_team_id);
    if (!h || !a) continue;
    const hs = f.home_score_ft ?? 0;
    const as_ = f.away_score_ft ?? 0;
    h.played++; a.played++;
    h.gf += hs; h.ga += as_;
    a.gf += as_; a.ga += hs;
    if (hs > as_) { h.points += 3; }
    else if (hs < as_) { a.points += 3; }
    else { h.points += 1; a.points += 1; }
  }
  for (const s of stats.values()) s.gd = s.gf - s.ga;

  // Group teams + sort per group
  const byGroup = new Map<string, Stat[]>();
  for (const s of stats.values()) {
    (byGroup.get(s.group_code) ?? byGroup.set(s.group_code, []).get(s.group_code)!).push(s);
  }
  for (const arr of byGroup.values()) {
    arr.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
  }

  // Standings array for resolveSource: only consider groups whose ALL 3 rounds are complete
  // (otherwise a 1A/2A position can still flip). Threshold = each team played 3 games.
  type Standing = { group_code: string; position: number; team_id: number; points: number; gd: number };
  const standings: Standing[] = [];
  for (const [code, arr] of byGroup) {
    const allDone = arr.length === 4 && arr.every((t) => t.played >= 3);
    if (!allDone) continue;
    arr.forEach((t, i) => standings.push({
      group_code: code, position: i + 1, team_id: t.team_id, points: t.points, gd: t.gd,
    }));
  }

  // Winners map (for W_R32_n / L_SF_n) — derived from finished knockout fixtures
  const fixturesByPhase = new Map<number, Fixture[]>();
  for (const f of (fixturesRaw ?? []) as Fixture[]) {
    const arr = fixturesByPhase.get(f.phase_id) ?? [];
    arr.push(f);
    fixturesByPhase.set(f.phase_id, arr);
  }
  // Bracket "slot" number = the fixture's position when its phase is ordered by id.
  // Fixtures were seeded id-ascending in slot order (101..116 = slots 1..16), and
  // bracket_rules.target_fixture refers to that slot — NOT to kickoff order, which
  // diverges once real kickoff times load. Always resolve rules by slot, not display order.
  const slotOf = new Map<number, number>();
  for (const arr of fixturesByPhase.values()) {
    [...arr].sort((a, b) => a.id - b.id).forEach((f, i) => slotOf.set(f.id, i + 1));
  }

  const winners = new Map<string, number>();
  for (const phase of phases as Phase[]) {
    const arr = fixturesByPhase.get(phase.id) ?? [];
    arr.forEach((f) => {
      const realH = f.home_score_et ?? f.home_score_ft;
      const realA = f.away_score_et ?? f.away_score_ft;
      if (realH == null || realA == null || realH === realA) return;
      const winnerId = realH > realA ? f.home_team_id! : f.away_team_id!;
      const loserId = realH > realA ? f.away_team_id! : f.home_team_id!;
      const tag = phase.code.toUpperCase();
      const slot = slotOf.get(f.id)!;
      winners.set(`${tag}_${slot}`, winnerId);
      if (phase.code === "sf") winners.set(`L_SF_${slot}`, loserId);
    });
  }

  // 3. Rules grouped
  const rulesByPhase = new Map<string, Map<number, { home?: string; away?: string }>>();
  for (const r of (rulesRaw ?? []) as BracketRule[]) {
    if (!rulesByPhase.has(r.target_phase)) rulesByPhase.set(r.target_phase, new Map());
    const phaseMap = rulesByPhase.get(r.target_phase)!;
    if (!phaseMap.has(r.target_fixture)) phaseMap.set(r.target_fixture, {});
    phaseMap.get(r.target_fixture)![r.slot] = r.source;
  }

  // slot → fixture lookup per phase code, to describe "W_..." placeholders as the
  // actual feeder game ("V(Time A/Time B)") once that game's teams are known.
  const fixtureBySlot = new Map<string, Map<number, Fixture>>();
  for (const phase of phases as Phase[]) {
    const m = new Map<number, Fixture>();
    for (const f of fixturesByPhase.get(phase.id) ?? []) m.set(slotOf.get(f.id)!, f);
    fixtureBySlot.set(phase.code, m);
  }

  function describeSlot(src: string): string {
    const mw = /^W_(R32|R16|QF|SF)_(\d+)$/.exec(src);
    if (mw) {
      const f = fixtureBySlot.get(mw[1]!.toLowerCase())?.get(Number(mw[2]!));
      const h = f?.home_team_id ? teamMap.get(f.home_team_id) : null;
      const a = f?.away_team_id ? teamMap.get(f.away_team_id) : null;
      if (h && a) return `V(${h.name_pt}/${a.name_pt})`;
    }
    return prettifySlot(src);
  }

  function resolveSlot(phaseCode: string, fixtureIdx: number, slot: "home" | "away"): { team: Team | null; placeholder: string | null } {
    const source = rulesByPhase.get(phaseCode)?.get(fixtureIdx + 1)?.[slot];
    if (!source) return { team: null, placeholder: null };

    // Third-place slots ("3ABCDF") can't be resolved by a local best-third pick:
    // FIFA assigns the 8 qualifying thirds to matches via a fixed combination table,
    // not "highest-ranked third in the subset". The correct team is only known once
    // advance-phase populates the fixture from wc2026 (which applies that table), so
    // show a placeholder until then rather than guess wrong.
    if (/^3[A-L]+$/.test(source)) {
      return { team: null, placeholder: describeSlot(source) };
    }

    const teamId = resolveSource(source, standings, winners);
    if (teamId && teamMap.has(teamId)) {
      return { team: teamMap.get(teamId)!, placeholder: null };
    }
    return { team: null, placeholder: prettifySlot(source) };
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
                  // First try the fixture's populated teams (advance-phase already ran)
                  let home = f.home_team_id ? teamMap.get(f.home_team_id) ?? null : null;
                  let away = f.away_team_id ? teamMap.get(f.away_team_id) ?? null : null;
                  let homePlaceholder: string | null = null;
                  let awayPlaceholder: string | null = null;
                  // Fallback: resolve from current standings/winners — by bracket SLOT
                  // (id order), never by kickoff/display order.
                  const slotIdx = slotOf.get(f.id)! - 1;
                  if (!home) {
                    const r = resolveSlot(phase.code, slotIdx, "home");
                    home = r.team; homePlaceholder = r.placeholder;
                  }
                  if (!away) {
                    const r = resolveSlot(phase.code, slotIdx, "away");
                    away = r.team; awayPlaceholder = r.placeholder;
                  }

                  const realH = f.home_score_et ?? f.home_score_ft;
                  const realA = f.away_score_et ?? f.away_score_ft;
                  const hasScore = realH != null && realA != null;
                  const homeWon = hasScore && realH! > realA!;
                  const awayWon = hasScore && realA! > realH!;

                  const dateStr = new Date(f.kickoff_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                  });

                  const side = (
                    team: Team | null,
                    placeholder: string | null,
                    won: boolean,
                    lost: boolean,
                    align: "left" | "right",
                  ) => (
                    <div
                      className={`flex min-w-0 items-center gap-1.5 ${
                        align === "right" ? "flex-row-reverse" : ""
                      } ${won ? "font-bold" : ""} ${lost ? "opacity-60" : ""}`}
                    >
                      {team ? (
                        <>
                          <span className="text-xl leading-none shrink-0">{team.flag_emoji}</span>
                          <span className="truncate text-[11px]">{team.name_pt}</span>
                        </>
                      ) : (
                        <>
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground">
                            ?
                          </span>
                          <span className="truncate text-[10px] italic text-muted-foreground">
                            {placeholder ?? "—"}
                          </span>
                        </>
                      )}
                    </div>
                  );

                  return (
                    <li key={f.id} className="px-2 py-2">
                      <p className="mb-1 text-center text-[8px] font-semibold uppercase tracking-widest text-muted-foreground">
                        #{idx + 1} · {dateStr}
                      </p>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        {side(home, homePlaceholder, homeWon, !!hasScore && !homeWon, "left")}
                        {hasScore ? (
                          <span className="font-display text-base text-primary tabular-nums whitespace-nowrap">
                            {realH} - {realA}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                            vs
                          </span>
                        )}
                        {side(away, awayPlaceholder, awayWon, !!hasScore && !awayWon, "right")}
                      </div>
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
