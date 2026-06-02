"use server";
import { createClient } from "@/lib/supabase/server";
import { randomBet } from "@/lib/random-bet";
import { revalidatePath } from "next/cache";

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

export async function fillRandomBets() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authed");

  const { data: openPhase } = await supabase
    .from("phases").select("id").eq("status", "open").maybeSingle();
  if (!openPhase) return { filled: 0, skipped: 0 };

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("id")
    .eq("phase_id", openPhase.id)
    .not("home_team_id", "is", null)
    .not("away_team_id", "is", null);

  const { data: existing } = await supabase
    .from("bets")
    .select("fixture_id")
    .eq("user_id", user.id);
  const alreadyBet = new Set((existing ?? []).map(b => b.fixture_id));

  const toInsert = (fixtures ?? [])
    .filter(f => !alreadyBet.has(f.id))
    .map(f => {
      const r = randomBet();
      return {
        user_id: user.id,
        fixture_id: f.id,
        home_score: r.home,
        away_score: r.away,
      };
    });

  if (toInsert.length > 0) {
    const { error } = await supabase
      .from("bets")
      .upsert(toInsert, { onConflict: "user_id,fixture_id" });
    if (error) throw error;
  }

  revalidatePath("/palpites");
  return { filled: toInsert.length, skipped: alreadyBet.size };
}
