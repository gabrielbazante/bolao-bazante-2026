// packages/scoring/src/types.ts
export const PHASES = [
    "group", "r32", "r16", "qf", "sf", "third", "final",
];
export const POINTS = {
    group: { result: 1, exact: 2 },
    r32: { result: 2, exact: 4 },
    r16: { result: 3, exact: 6 },
    qf: { result: 7, exact: 14 },
    sf: { result: 15, exact: 30 },
    third: { result: 13, exact: 26 },
    final: { result: 25, exact: 50 },
};
export const CHAMPION_BONUS = 50;
//# sourceMappingURL=types.js.map