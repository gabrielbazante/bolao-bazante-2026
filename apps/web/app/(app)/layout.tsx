import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { TabBar } from "@/components/tab-bar";

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
  // Only redirect if we KNOW the pathname AND it's not the onboarding route already.
  // Without the pathname guard, a missing/empty header would cause an infinite loop
  // (redirect /onboarding → /onboarding → ...).
  if (onboardingNeeded && pathname && !pathname.startsWith("/onboarding")) {
    redirect("/onboarding");
  }

  const { data: liveFixtures } = await supabase
    .from("fixtures").select("id").eq("status", "live").limit(1);
  const liveActive = (liveFixtures?.length ?? 0) > 0;

  // Hide tabbar on onboarding — it's a blocking flow and the sticky "Confirmar"
  // button would clash with the tabbar otherwise.
  const isOnboarding = pathname.startsWith("/onboarding");

  return (
    <main
      className="min-h-screen bg-background"
      style={
        isOnboarding
          ? undefined
          : { paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }
      }
    >
      {children}
      {!isOnboarding && (
        <TabBar isAdmin={!!profile?.is_admin} liveActive={liveActive} />
      )}
    </main>
  );
}
