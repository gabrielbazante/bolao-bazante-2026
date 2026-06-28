import { describe, it, expect } from "vitest";
import {
  BASE_RATINGS, NEUTRAL_RATING, accumulateForm, effectiveRating, type TeamForm,
} from "./team-strength";

describe("BASE_RATINGS", () => {
  it("cobre as 32 seleções da R32 com notas plausíveis", () => {
    const codes = ["MEX","RSA","BIH","CAN","SUI","BRA","MAR","AUS","USA","PAR","GER","CIV","ECU","NED","JPN","SWE","BEL","EGY","CPV","ESP","FRA","NOR","SEN","ARG","ALG","AUT","COL","COD","POR","CRO","GHA","ENG"];
    for (const c of codes) {
      expect(BASE_RATINGS[c], c).toBeGreaterThanOrEqual(40);
      expect(BASE_RATINGS[c], c).toBeLessThanOrEqual(100);
    }
    expect(BASE_RATINGS["FRA"]!).toBeGreaterThan(BASE_RATINGS["CPV"]!);
  });
});

describe("accumulateForm", () => {
  it("conta jogos/pontos/saldo e prefere ET sobre FT", () => {
    const fixtures = [
      // time 1 vence 2x0 (FT)
      { home_team_id: 1, away_team_id: 2, home_score_ft: 2, away_score_ft: 0, home_score_et: null, away_score_et: null },
      // time 1 perde no ET 1x2 (ET prevalece sobre FT 1x1)
      { home_team_id: 3, away_team_id: 1, home_score_ft: 1, away_score_ft: 1, home_score_et: 2, away_score_et: 1 },
      // ignora fixture sem placar
      { home_team_id: 1, away_team_id: 4, home_score_ft: null, away_score_ft: null, home_score_et: null, away_score_et: null },
    ];
    const m = accumulateForm(fixtures);
    expect(m.get(1)).toEqual({ games: 2, points: 3, gd: 2 + (-1) }); // +2 e -1 = +1
  });
});

describe("effectiveRating", () => {
  it("sem jogos retorna a base", () => {
    expect(effectiveRating(80, { games: 0, points: 0, gd: 0 })).toBe(80);
  });
  it("limita o delta a +6 (forma excelente)", () => {
    const f: TeamForm = { games: 3, points: 9, gd: 12 };
    expect(effectiveRating(80, f)).toBe(86);
  });
  it("limita o delta a -6 (forma péssima)", () => {
    const f: TeamForm = { games: 3, points: 0, gd: -12 };
    expect(effectiveRating(80, f)).toBe(74);
  });
  it("é monotônico: mais pontos => nota maior", () => {
    const a = effectiveRating(75, { games: 3, points: 3, gd: 0 });
    const b = effectiveRating(75, { games: 3, points: 7, gd: 0 });
    expect(b).toBeGreaterThan(a);
  });
  it("NEUTRAL_RATING é 70", () => {
    expect(NEUTRAL_RATING).toBe(70);
  });
});
