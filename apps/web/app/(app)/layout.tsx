import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("approved_at, is_admin").eq("id", user.id).single();
  if (!profile?.approved_at && !profile?.is_admin) redirect("/pending");
  return <main className="min-h-screen bg-background">{children}</main>;
}
