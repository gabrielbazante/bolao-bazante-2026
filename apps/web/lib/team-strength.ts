// Notas 0–100 por seleção classificada à R32 (pedigree de Copa + ranking FIFA).
// Ver docs/superpowers/specs/2026-06-28-aleatorio-realista-design.md §4.1.
export const BASE_RATINGS: Record<string, number> = {
  FRA: 92, BRA: 91, ARG: 91, ESP: 88, ENG: 87, GER: 86, POR: 85, NED: 84,
  BEL: 82, CRO: 80, MAR: 80, COL: 77, SUI: 76, JPN: 76, SEN: 75, NOR: 75,
  MEX: 74, AUT: 73, USA: 73, SWE: 72, ALG: 72, ECU: 72, EGY: 71, CIV: 70,
  CAN: 70, PAR: 68, GHA: 68, AUS: 68, BIH: 67, COD: 66, RSA: 65, CPV: 58,
};

// Nota neutra para qualquer seleção fora da tabela (não deve ocorrer no escopo R32+).
export const NEUTRAL_RATING = 70;

export type TeamForm = { games: number; points: number; gd: number };

type FixtureRow = {
  home_team_id: number | null;
  away_team_id: number | null;
  home_score_ft: number | null;
  away_score_ft: number | null;
  home_score_et: number | null;
  away_score_et: number | null;
};

// Acumula jogos/pontos/saldo por time a partir de fixtures pontuados.
// Mata-mata: ET prevalece sobre FT quando houve prorrogação.
export function accumulateForm(fixtures: FixtureRow[]): Map<number, TeamForm> {
  const m = new Map<number, TeamForm>();
  const get = (id: number): TeamForm => {
    let f = m.get(id);
    if (!f) { f = { games: 0, points: 0, gd: 0 }; m.set(id, f); }
    return f;
  };
  for (const fx of fixtures) {
    if (fx.home_team_id == null || fx.away_team_id == null) continue;
    const h = fx.home_score_et ?? fx.home_score_ft;
    const a = fx.away_score_et ?? fx.away_score_ft;
    if (h == null || a == null) continue;
    const H = get(fx.home_team_id);
    const A = get(fx.away_team_id);
    H.games++; A.games++;
    H.gd += h - a; A.gd += a - h;
    if (h > a) H.points += 3;
    else if (h < a) A.points += 3;
    else { H.points += 1; A.points += 1; }
  }
  return m;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

// Nota efetiva = base + ajuste de forma deste torneio, limitado a ±6.
export function effectiveRating(base: number, form: TeamForm): number {
  if (form.games <= 0) return base;
  const ppg = form.points / form.games;
  const gdpg = form.gd / form.games;
  const delta = clamp(2.0 * (ppg - 1.35) + 1.2 * gdpg, -6, 6);
  return base + delta;
}
