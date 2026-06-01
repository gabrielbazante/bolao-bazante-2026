// packages/scoring/tests/calculate.test.ts
import { describe, it, expect } from "vitest";
import { calculate } from "../src/calculate";

describe("calculate — group phase", () => {
  it("returns 2 (exact) when bet matches FT exactly", () => {
    expect(calculate({ home: 2, away: 1 }, { home_ft: 2, away_ft: 1 }, "group")).toBe(2);
  });
  it("returns 1 (result) when winner matches but score differs", () => {
    expect(calculate({ home: 3, away: 1 }, { home_ft: 2, away_ft: 0 }, "group")).toBe(1);
  });
  it("returns 0 when winner is wrong", () => {
    expect(calculate({ home: 2, away: 1 }, { home_ft: 0, away_ft: 1 }, "group")).toBe(0);
  });
  it("returns 1 on tie when bet was tie", () => {
    expect(calculate({ home: 1, away: 1 }, { home_ft: 2, away_ft: 2 }, "group")).toBe(1);
  });
  it("returns 2 on 0-0 exact", () => {
    expect(calculate({ home: 0, away: 0 }, { home_ft: 0, away_ft: 0 }, "group")).toBe(2);
  });
});

describe("calculate — knockout uses ET when present", () => {
  it("r16: bet 2-1, FT 1-1, ET 2-1 → exact (6 pts)", () => {
    expect(calculate({ home: 2, away: 1 },
      { home_ft: 1, away_ft: 1, home_et: 2, away_et: 1 }, "r16")).toBe(6);
  });
  it("r16: bet 1-1, FT 1-1, ET 2-1 → 0 (wrong winner)", () => {
    expect(calculate({ home: 1, away: 1 },
      { home_ft: 1, away_ft: 1, home_et: 2, away_et: 1 }, "r16")).toBe(0);
  });
  it("qf: bet 3-2, FT 2-2, ET 3-2 → exact (14 pts)", () => {
    expect(calculate({ home: 3, away: 2 },
      { home_ft: 2, away_ft: 2, home_et: 3, away_et: 2 }, "qf")).toBe(14);
  });
  it("knockout with no ET: uses FT (decided in regulation)", () => {
    expect(calculate({ home: 2, away: 0 },
      { home_ft: 2, away_ft: 0 }, "qf")).toBe(14);
  });
  it("draw in ET (penalties decide): exact tie bet counts", () => {
    expect(calculate({ home: 1, away: 1 },
      { home_ft: 1, away_ft: 1, home_et: 1, away_et: 1 }, "sf")).toBe(30);
  });
  it("draw in ET, bet was 2-1: 0 pts (penalties ignored)", () => {
    expect(calculate({ home: 2, away: 1 },
      { home_ft: 1, away_ft: 1, home_et: 1, away_et: 1 }, "sf")).toBe(0);
  });
});

describe("calculate — phase point values", () => {
  it.each([
    ["group", 1, 2], ["r32", 2, 4], ["r16", 3, 6],
    ["qf", 7, 14], ["sf", 15, 30], ["third", 13, 26], ["final", 25, 50],
  ] as const)("%s: result=%i exact=%i", (phase, ptsResult, ptsExact) => {
    expect(calculate({ home: 1, away: 1 }, { home_ft: 2, away_ft: 2 }, phase)).toBe(ptsResult);
    expect(calculate({ home: 2, away: 0 }, { home_ft: 2, away_ft: 0 }, phase)).toBe(ptsExact);
  });
});
