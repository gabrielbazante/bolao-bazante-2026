"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const supabase = await createClient();
  const { error, data } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) return { error: error.message };

  // route post-login based on approval state
  const { data: profile } = await supabase
    .from("profiles")
    .select("approved_at")
    .eq("id", data.user.id)
    .single();
  redirect(profile?.approved_at ? "/" : "/pending");
}
