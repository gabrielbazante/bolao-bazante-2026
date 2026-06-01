import { CHAMPION_BONUS } from "./types";
export function championBonus(picks, championTeamId) {
    return picks.includes(championTeamId) ? CHAMPION_BONUS : 0;
}
//# sourceMappingURL=champion-bonus.js.map