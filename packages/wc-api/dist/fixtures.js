const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);
export function normalizeFixture(raw) {
    const short = raw.fixture.status.short;
    const status = FINISHED_STATUSES.has(short) ? "finished"
        : LIVE_STATUSES.has(short) ? "live"
            : "scheduled";
    return {
        fixture_id: raw.fixture.id,
        status,
        home_team_code: raw.teams.home.name,
        away_team_code: raw.teams.away.name,
        kickoff_at: raw.fixture.date,
        home_score_ft: raw.score.fulltime.home ?? null,
        away_score_ft: raw.score.fulltime.away ?? null,
        home_score_et: raw.score.extratime.home ?? null,
        away_score_et: raw.score.extratime.away ?? null,
    };
}
export async function fetchFixtures(apiKey, params = {}) {
    const url = new URL("https://v3.football.api-sports.io/fixtures");
    if (params.ids?.length)
        url.searchParams.set("ids", params.ids.join("-"));
    else {
        url.searchParams.set("league", "1");
        url.searchParams.set("season", "2026");
    }
    const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });
    if (!res.ok)
        throw new Error(`api-football ${res.status}`);
    const json = await res.json();
    return json.response.map(normalizeFixture);
}
//# sourceMappingURL=fixtures.js.map