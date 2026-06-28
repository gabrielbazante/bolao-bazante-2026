import { describe, it, expect } from "vitest";
import { randomBet } from "./random-bet";

// PRNG determinístico (mulberry32) para testes estáveis.
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample(home: number, away: number, n: number) {
  const rng = mulberry32(12345);
  let homeWins = 0, awayWins = 0, draws = 0, sumWinMargin = 0, decided = 0;
  let underdogBigWin = 0; let maxGoals = 0;
  for (let i = 0; i < n; i++) {
    const r = randomBet(home, away, rng);
    maxGoals = Math.max(maxGoals, r.home, r.away);
    if (r.home === r.away) { draws++; continue; }
    decided++;
    const margin = Math.abs(r.home - r.away);
    sumWinMargin += margin;
    if (r.home > r.away) homeWins++; else awayWins++;
    // zebra (lado mais fraco) vencendo por 3+
    const weakWonBig = ((home < away && r.home > r.away) || (away < home && r.away > r.home)) && margin >= 3;
    if (weakWonBig) underdogBigWin++;
  }
  return { homeWins, awayWins, draws, n, decided, avgWinMargin: sumWinMargin / decided, underdogBigWin, maxGoals };
}

describe("randomBet híbrido", () => {
  it("favorito forte vence muito mais que a zebra", () => {
    const s = sample(90, 60, 20000);
    expect(s.homeWins / s.n).toBeGreaterThan(0.7);
    expect(s.awayWins / s.n).toBeLessThan(0.15);
  });

  it("jogo equilibrado é ~simétrico", () => {
    const s = sample(75, 75, 20000);
    const ratio = s.homeWins / Math.max(1, s.awayWins);
    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(1.15);
    expect(s.draws / s.n).toBeGreaterThan(0.2); // empate relevante em jogo parelho
  });

  it("abismo maior => margem média do favorito maior", () => {
    const pequeno = sample(80, 75, 20000).avgWinMargin;
    const grande = sample(90, 55, 20000).avgWinMargin;
    expect(grande).toBeGreaterThan(pequeno);
  });

  it("nunca gera placar absurdo (teto 5)", () => {
    const s = sample(92, 58, 20000);
    expect(s.maxGoals).toBeLessThanOrEqual(5);
  });

  it("caso reportado: França(92) x Senegal(75) — Senegal vencer por 3+ é < 1%", () => {
    const s = sample(92, 75, 20000);
    expect(s.underdogBigWin / s.n).toBeLessThan(0.01);
  });

  it("é determinístico com rng injetado", () => {
    const a = randomBet(80, 70, mulberry32(7));
    const b = randomBet(80, 70, mulberry32(7));
    expect(a).toEqual(b);
  });
});
