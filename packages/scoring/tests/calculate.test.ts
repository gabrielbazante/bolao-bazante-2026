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
