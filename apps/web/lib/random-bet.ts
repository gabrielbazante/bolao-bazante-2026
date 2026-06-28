// Placar aleatório realista enviesado pela força das seleções (modelo híbrido).
// Ver docs/superpowers/specs/2026-06-28-aleatorio-realista-design.md §5.

// Frequências de placar da história das Copas (1930-2022). [vencedor, perdedor, peso].
const SCORELINES: Array<[number, number, number]> = [
  [1, 0, 18], [2, 1, 14], [2, 0, 11], [3, 1, 6], [3, 0, 5], [3, 2, 4],
  [4, 1, 3], [4, 0, 2], [4, 2, 2], [5, 0, 1], [5, 1, 1],
];

// Empates: [placar dos dois lados, peso].
const DRAWS: Array<[number, number]> = [[0, 12], [1, 11], [2, 5], [3, 1]];

const S = 20;          // escala Elo (diferença de nota -> expectativa)
const DRAW_MAX = 0.30; // prob. máxima de empate (jogo equilibrado)
const K = 0.9;         // intensidade da reponderação da margem pela força

function weightedPick<T>(items: T[], weight: (t: T) => number, rng: () => number): T {
  const total = items.reduce((acc, it) => acc + weight(it), 0);
  let r = rng() * total;
  for (const it of items) {
    r -= weight(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1]!;
}

export function randomBet(
  homeRating: number,
  awayRating: number,
  rng: () => number = Math.random,
): { home: number; away: number } {
  const d = homeRating - awayRating;
  const e = 1 / (1 + Math.pow(10, -d / S)); // expectativa do mando (rótulo)
  const pDraw = DRAW_MAX * (1 - Math.abs(2 * e - 1));
  const pHome = Math.max(0, e - pDraw / 2);

  const roll = rng();
  if (roll < pDraw) {
    const [score] = weightedPick(DRAWS, (x) => x[1], rng);
    return { home: score!, away: score! };
  }

  const homeWins = roll < pDraw + pHome;
  const favoriteWon = homeWins ? d >= 0 : d <= 0;
  const g = Math.abs(d) / 100;

  const reweighted = SCORELINES.map(([hi, lo, w]): [number, number, number] => {
    const margin = hi - lo;
    const factor = favoriteWon
      ? Math.exp(K * (margin - 1) * g)   // favorito + abismo -> margens maiores
      : Math.exp(-K * (margin - 1));     // zebra vencendo -> margem comprimida
    return [hi, lo, w * factor];
  });

  const [hi, lo] = weightedPick(reweighted, (x) => x[2], rng);
  return homeWins ? { home: hi!, away: lo! } : { home: lo!, away: hi! };
}
