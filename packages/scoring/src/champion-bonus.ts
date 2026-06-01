import { CHAMPION_BONUS } from "./types";

export function championBonus(picks: number[], championTeamId: number): number {
  return picks.includes(championTeamId) ? CHAMPION_BONUS : 0;
}
