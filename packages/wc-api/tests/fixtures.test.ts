import { describe, it, expect } from "vitest";
import { normalizeFixture } from "../src/fixtures";
import { RAW_FT, RAW_AET, RAW_LIVE } from "./fixtures.fixtures";

describe("normalizeFixture", () => {
  it("maps FT response", () => {
    const r = normalizeFixture(RAW_FT);
    expect(r.status).toBe("finished");
    expect(r.home_score_ft).toBe(1);
    expect(r.away_score_ft).toBe(2);
    expect(r.home_score_et).toBeNull();
  });
  it("maps AET response — preserves both FT and ET", () => {
    const r = normalizeFixture(RAW_AET);
    expect(r.status).toBe("finished");
    expect(r.home_score_ft).toBe(1); expect(r.away_score_ft).toBe(1);
    expect(r.home_score_et).toBe(2); expect(r.away_score_et).toBe(1);
  });
  it("maps in-progress (1H/2H) to live", () => {
    expect(normalizeFixture(RAW_LIVE).status).toBe("live");
  });
});
