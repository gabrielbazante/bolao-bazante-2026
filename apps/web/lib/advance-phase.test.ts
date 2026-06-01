import { describe, it, expect } from "vitest";
import { resolveSource } from "./advance-phase";

const STANDINGS = [
  { group_code: "A", position: 1, team_id: 1, points: 9, gd: 5 },
  { group_code: "A", position: 2, team_id: 4, points: 6, gd: 2 },
  { group_code: "A", position: 3, team_id: 7, points: 3, gd: 0 },
  { group_code: "B", position: 1, team_id: 5, points: 9, gd: 4 },
  { group_code: "C", position: 3, team_id: 9, points: 4, gd: 1 },
  { group_code: "D", position: 3, team_id: 11, points: 5, gd: 2 },
  { group_code: "E", position: 3, team_id: 13, points: 4, gd: 0 },
];
const WINNERS = new Map<string, number>([
  ["R32_1", 1],
  ["R32_2", 5],
  ["SF_1", 100],
  ["L_SF_1", 99],
]);

describe("resolveSource", () => {
  it("1A → group A first", () => {
    expect(resolveSource("1A", STANDINGS, WINNERS)).toBe(1);
  });
  it("2A → group A second", () => {
    expect(resolveSource("2A", STANDINGS, WINNERS)).toBe(4);
  });
  it("W_R32_1 → winner of R32 fixture 1", () => {
    expect(resolveSource("W_R32_1", STANDINGS, WINNERS)).toBe(1);
  });
  it("L_SF_1 → loser of SF fixture 1", () => {
    expect(resolveSource("L_SF_1", STANDINGS, WINNERS)).toBe(99);
  });
  it("3CDE → best third among groups C/D/E by points then GD", () => {
    // C=4pt/1gd, D=5pt/2gd, E=4pt/0gd → D wins
    expect(resolveSource("3CDE", STANDINGS, WINNERS)).toBe(11);
  });
  it("unknown token → null", () => {
    expect(resolveSource("XYZ", STANDINGS, WINNERS)).toBeNull();
  });
});
