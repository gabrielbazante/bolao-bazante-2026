import { describe, it, expect, vi } from "vitest";
import { fetchStandings } from "../src/standings";

const FAKE = {
  response: [{ league: { standings: [[
    { rank: 1, group: "Group A", points: 9, goalsDiff: 5, team: { name: "Mexico" }, all: { played: 3 } },
    { rank: 2, group: "Group A", points: 6, goalsDiff: 2, team: { name: "Argentina" }, all: { played: 3 } },
  ]] } }],
};

describe("fetchStandings", () => {
  it("parses positions and group codes", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => FAKE,
    }) as any;
    const s = await fetchStandings("k");
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ position: 1, group_code: "A", team_code: "Mexico" });
  });
});
