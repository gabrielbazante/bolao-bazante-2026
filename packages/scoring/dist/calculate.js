import { POINTS } from "./types";
export function calculate(bet, result, phase) {
    const isKnockout = phase !== "group";
    const finalHome = isKnockout && result.home_et != null ? result.home_et : result.home_ft;
    const finalAway = isKnockout && result.away_et != null ? result.away_et : result.away_ft;
    const { result: ptsResult, exact: ptsExact } = POINTS[phase];
    if (bet.home === finalHome && bet.away === finalAway)
        return ptsExact;
    const sameWinner = (bet.home > bet.away && finalHome > finalAway) ||
        (bet.home < bet.away && finalHome < finalAway) ||
        (bet.home === bet.away && finalHome === finalAway);
    return sameWinner ? ptsResult : 0;
}
//# sourceMappingURL=calculate.js.map