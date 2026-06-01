"use server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
