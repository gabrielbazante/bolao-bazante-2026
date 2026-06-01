"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function pickChampions(team1: number, team2: number) {
  if (team1 === team2) return { error: "Pick dois times diferentes" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authed" };
  const { error } = await supabase.from("champion_picks").insert([
    { user_id: user.id, team_id: team1 },
    { user_id: user.id, team_id: team2 },
  ]);
  if (error) return { error: error.message };
  redirect("/palpites");
}
