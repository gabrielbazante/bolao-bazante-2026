export type ApiFixture = {
  fixture_id: number;
  status: "scheduled" | "live" | "finished";
  home_team_code: string;
  away_team_code: string;
  kickoff_at: string;        // ISO
  home_score_ft: number | null;
  away_score_ft: number | null;
  home_score_et: number | null;
  away_score_et: number | null;
};

export type ApiStanding = {
  group_code: string;
  position: number;
  team_code: string;
  played: number;
  points: number;
  gd: number;
};
