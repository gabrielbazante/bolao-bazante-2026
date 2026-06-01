import { createClient } from "@/lib/supabase/server";
import { AvatarUpload } from "@/components/avatar-upload";
import { EnablePush } from "@/components/enable-push";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles")
    .select("*").eq("id", user!.id).single();
  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold">{profile?.full_name}</h1>
      <AvatarUpload initialUrl={profile?.avatar_url ?? null} />
      <EnablePush />
    </div>
  );
}
