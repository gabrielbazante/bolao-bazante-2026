import { createClient } from "@/lib/supabase/server";
import { AvatarUpload } from "@/components/avatar-upload";
import { EnablePush } from "@/components/enable-push";
import { TopBar } from "@/components/ui-pro/top-bar";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const name = profile?.full_name ?? "";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0])
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="flex flex-col">
      <TopBar title="Perfil" userInitials={initials} avatarUrl={profile?.avatar_url} />

      <div className="mx-auto w-full max-w-md space-y-4 p-4 pb-6">
        {/* Profile card */}
        <div
          className="rounded-2xl bg-card p-5"
          style={{
            boxShadow:
              "0 4px 16px -4px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
            border: "1px solid rgba(0,0,0,.05)",
          }}
        >
          <h2 className="mb-4 text-lg font-extrabold text-foreground">
            {profile?.full_name}
          </h2>
          <AvatarUpload initialUrl={profile?.avatar_url ?? null} />
        </div>

        {/* Notifications card */}
        <div
          className="rounded-2xl bg-card p-5"
          style={{
            boxShadow:
              "0 4px 16px -4px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
            border: "1px solid rgba(0,0,0,.05)",
          }}
        >
          <h3 className="mb-3 text-sm font-bold text-foreground">
            Notificações
          </h3>
          <EnablePush />
        </div>
      </div>
    </div>
  );
}
