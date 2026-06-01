"use server";
import { createClient } from "@/lib/supabase/server";

export async function saveBet(fixtureId: number, home: number, away: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authed");
  const { error } = await supabase
    .from("bets")
    .upsert({
      user_id: user.id,
      fixture_id: fixtureId,
      home_score: home,
      away_score: away,
    }, { onConflict: "user_id,fixture_id" });
  if (error) throw error;
  return { ok: true };
}
