// packages/scoring/src/types.ts

export type Bet = { home: number; away: number };

export type Result = {
  home_ft: number;
  away_ft: number;
  home_et?: number | null;
  away_et?: number | null;
};

export const PHASES = [
  "group", "r32", "r16", "qf", "sf", "third", "final",
] as const;
export type Phase = (typeof PHASES)[number];

export const POINTS: Record<Phase, { result: number; exact: number }> = {
  group: { result: 1,  exact: 2  },
  r32:   { result: 2,  exact: 4  },
  r16:   { result: 3,  exact: 6  },
  qf:    { result: 7,  exact: 14 },
  sf:    { result: 15, exact: 30 },
  third: { result: 13, exact: 26 },
  final: { result: 25, exact: 50 },
};

export const CHAMPION_BONUS = 50;
