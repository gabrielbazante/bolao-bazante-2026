export async function fetchStandings(apiKey) {
    const url = "https://v3.football.api-sports.io/standings?league=1&season=2026";
    const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });
    if (!res.ok)
        throw new Error(`api-football standings ${res.status}`);
    const json = await res.json();
    const groups = json.response?.[0]?.league?.standings ?? [];
    const out = [];
    for (const group of groups) {
        for (const row of group) {
            out.push({
                group_code: row.group?.match(/[A-L]$/)?.[0] ?? "",
                position: row.rank,
                team_code: row.team.name,
                played: row.all?.played ?? 0,
                points: row.points ?? 0,
                gd: row.goalsDiff ?? 0,
            });
        }
    }
    return out;
}
//# sourceMappingURL=standings.js.map