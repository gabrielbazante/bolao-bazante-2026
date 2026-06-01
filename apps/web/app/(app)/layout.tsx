import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("approved_at, is_admin").eq("id", user.id).single();
  if (!profile?.approved_at && !profile?.is_admin) redirect("/pending");

  const { count: cpCount } = await supabase
    .from("champion_picks").select("id", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const { data: groupPhase } = await supabase
    .from("phases").select("status").eq("code", "group").single();

  const onboardingNeeded =
    (cpCount ?? 0) < 2 && groupPhase?.status === "open";

  const pathname = (await headers()).get("x-pathname") ?? "";
  if (onboardingNeeded && !pathname.startsWith("/onboarding")) {
    redirect("/onboarding");
  }

  return <main className="min-h-screen bg-background">{children}</main>;
}
