const BASE_URL = "https://api.wc2026api.com";

export type Wc2026Match = {
  id: number;
  match_number: number;
  round: string;
  group_name: string | null;
  home_team_id: number;
  home_team: string;
  home_team_code: string;
  away_team_id: number;
  away_team: string;
  away_team_code: string;
  stadium: string;
  stadium_city: string;
  stadium_country: string;
  kickoff_utc: string;
  home_score: number | null;
  away_score: number | null;
  home_pen: number | null;
  away_pen: number | null;
  status: "scheduled" | "live" | "finished" | string;
  phase: "PRE" | "LIVE" | "HT" | "ET" | "PEN" | "FT" | "AET" | string;
};

export type Wc2026Standing = {
  group_name: string;
  team_id: number;
  team_name: string;
  team_code: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
};

function authHeaders(): Record<string, string> {
  const key = process.env.WC2026_API_KEY;
  if (!key) throw new Error("WC2026_API_KEY missing");
  return { Authorization: `Bearer ${key}` };
}

export async function fetchAllMatches(): Promise<Wc2026Match[]> {
  const res = await fetch(`${BASE_URL}/matches`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`wc2026 /matches ${res.status}: ${await res.text().catch(() => "")}`);
  return res.json();
}

export async function fetchGroupStandings(groupId: string): Promise<Wc2026Standing[]> {
  const res = await fetch(`${BASE_URL}/groups/${groupId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`wc2026 /groups/${groupId} ${res.status}`);
  const data = await res.json();
  return data.standings ?? [];
}

/**
 * Translate WC2026 phase + scores into our DB columns.
 * Group phase always uses FT fields. Knockout uses ET if phase indicates extra time.
 */
export function deriveScoreFields(m: Wc2026Match): {
  home_score_ft: number | null;
  away_score_ft: number | null;
  home_score_et: number | null;
  away_score_et: number | null;
} {
  if (m.home_score == null || m.away_score == null) {
    return { home_score_ft: null, away_score_ft: null, home_score_et: null, away_score_et: null };
  }
  const phase = m.phase?.toUpperCase();
  const isExtraTimeFinal = phase === "AET" || phase === "PEN";
  if (isExtraTimeFinal) {
    // Final-after-ET. We don't have the 90-min score separately.
    // Set ET fields; leave FT null so scoring lib falls back to ET as the "official" score.
    return {
      home_score_ft: null,
      away_score_ft: null,
      home_score_et: m.home_score,
      away_score_et: m.away_score,
    };
  }
  // Group, or knockout finished in 90min (phase=FT), or live (phase=LIVE/HT)
  return {
    home_score_ft: m.home_score,
    away_score_ft: m.away_score,
    home_score_et: null,
    away_score_et: null,
  };
}
