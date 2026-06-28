import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BASE_RATINGS, NEUTRAL_RATING, accumulateForm, effectiveRating,
} from "./team-strength";

// Monta Map<teamId, nota efetiva> = base curada + forma deste torneio.
// Aceita tanto o admin client quanto o server client (mesma API de query).
export async function buildEffectiveRatings(
  client: SupabaseClient,
): Promise<Map<number, number>> {
  const { data: teams } = await client.from("teams").select("id, fifa_code");
  const { data: fixtures } = await client
    .from("fixtures")
    .select("home_team_id, away_team_id, home_score_ft, away_score_ft, home_score_et, away_score_et")
    .not("scored_at", "is", null);

  const form = accumulateForm(fixtures ?? []);
  const ratings = new Map<number, number>();
  for (const t of (teams ?? []) as Array<{ id: number; fifa_code: string }>) {
    const base = BASE_RATINGS[t.fifa_code] ?? NEUTRAL_RATING;
    const f = form.get(t.id);
    ratings.set(t.id, f ? effectiveRating(base, f) : base);
  }
  return ratings;
}
