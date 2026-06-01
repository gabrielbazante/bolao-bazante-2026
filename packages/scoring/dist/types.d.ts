export type Bet = {
    home: number;
    away: number;
};
export type Result = {
    home_ft: number;
    away_ft: number;
    home_et?: number | null;
    away_et?: number | null;
};
export declare const PHASES: readonly ["group", "r32", "r16", "qf", "sf", "third", "final"];
export type Phase = (typeof PHASES)[number];
export declare const POINTS: Record<Phase, {
    result: number;
    exact: number;
}>;
export declare const CHAMPION_BONUS = 50;
