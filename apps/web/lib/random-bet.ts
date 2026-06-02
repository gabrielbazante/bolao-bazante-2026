// Weighted scoreline distribution from FIFA World Cup history (1930-2022, ~964 matches).
// Each entry: [winningSide_goals, losingSide_goals, weight].
// Symmetric — when sampling, we 50/50 decide which side is "home" in the bet.
const SCORELINES: Array<[number, number, number]> = [
  [1, 0, 18],
  [2, 1, 14],
  [2, 0, 11],
  [3, 1, 6],
  [3, 0, 5],
  [3, 2, 4],
  [4, 1, 3],
  [4, 0, 2],
  [4, 2, 2],
  [5, 0, 1],
  [5, 1, 1],
];

const DRAWS: Array<[number, number]> = [
  // [score (both sides), weight]
  [0, 12],
  [1, 11],
  [2, 5],
  [3, 1],
];

const TOTAL_DECIDED_WEIGHT = SCORELINES.reduce((a, [, , w]) => a + w, 0);
const TOTAL_DRAW_WEIGHT = DRAWS.reduce((a, [, w]) => a + w, 0);
const DRAW_PROBABILITY = TOTAL_DRAW_WEIGHT / (TOTAL_DECIDED_WEIGHT + TOTAL_DRAW_WEIGHT);

function pickWeighted<T>(items: Array<[...T[], number]>): T[] {
  const total = items.reduce((a, x) => a + (x[x.length - 1] as number), 0);
  let r = Math.random() * total;
  for (const item of items) {
    const w = item[item.length - 1] as number;
    if ((r -= w) <= 0) return item.slice(0, -1) as T[];
  }
  return items[items.length - 1]!.slice(0, -1) as T[];
}

export function randomBet(): { home: number; away: number } {
  if (Math.random() < DRAW_PROBABILITY) {
    const [score] = pickWeighted<number>(DRAWS as any);
    return { home: score!, away: score! };
  }
  const [hi, lo] = pickWeighted<number>(SCORELINES as any);
  const homeWins = Math.random() < 0.5;
  return homeWins
    ? { home: hi!, away: lo! }
    : { home: lo!, away: hi! };
}
