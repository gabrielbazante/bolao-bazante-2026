"use server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { calculate } from "@bolao/scoring";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authed");
  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) throw new Error("Not admin");
}

export async function approveUser(userId: string) {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.from("profiles")
    .update({ approved_at: new Date().toISOString() })
    .eq("id", userId);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function rejectUser(userId: string) {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/admin");
}

export async function setManualResult(fixtureId: number, params: {
  home_ft: number; away_ft: number;
  home_et?: number | null; away_et?: number | null;
}) {
  await assertAdmin();
  const admin = createAdminClient();
  const { data: f } = await admin.from("fixtures")
    .select("phase_id").eq("id", fixtureId).single();
  const { data: phase } = await admin.from("phases").select("code").eq("id", f!.phase_id).single();
  await admin.from("fixtures").update({
    status: "finished",
    home_score_ft: params.home_ft, away_score_ft: params.away_ft,
    home_score_et: params.home_et ?? null, away_score_et: params.away_et ?? null,
    scored_at: new Date().toISOString(),
  }).eq("id", fixtureId);
  const { data: bets } = await admin.from("bets").select("id, home_score, away_score").eq("fixture_id", fixtureId);
  for (const b of bets ?? []) {
    const pts = calculate(
      { home: b.home_score, away: b.away_score },
      {
        home_ft: params.home_ft, away_ft: params.away_ft,
        home_et: params.home_et, away_et: params.away_et,
      },
      phase!.code as any,
    );
    await admin.from("bets").update({ points: pts, scored_at: new Date().toISOString() }).eq("id", b.id);
  }
  revalidatePath("/admin");
  revalidatePath("/ranking");
}
