import { describe, it, expect } from "vitest";
import { championBonus } from "../src/champion-bonus";

describe("championBonus", () => {
  it("returns 50 when champion is among picks", () => {
    expect(championBonus([7, 11], 7)).toBe(50);
  });
  it("returns 0 when no pick matches", () => {
    expect(championBonus([7, 11], 12)).toBe(0);
  });
  it("returns 50 even if both picks list the same id (still single 50)", () => {
    expect(championBonus([7, 7], 7)).toBe(50);
  });
  it("handles empty picks", () => {
    expect(championBonus([], 7)).toBe(0);
  });
});
