"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
export function AvatarUpload({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [err, setErr] = useState<string | null>(null);
  const supabase = createClient();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setErr("Máx 2MB"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr("Sem sessão"); return; }
    const path = `${user.id}/avatar.jpg`;
    const { error } = await supabase.storage.from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setErr(error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const bust = `${publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: bust }).eq("id", user.id);
    setUrl(bust);
  }

  return (
    <div className="flex items-center gap-3">
      {url ? <img src={url} alt="" className="w-16 h-16 rounded-full object-cover" /> :
             <div className="w-16 h-16 rounded-full bg-muted" />}
      <label className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground hover:bg-primary/80 h-8 gap-1.5 px-2.5 text-sm font-medium transition-all">
        <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        Trocar foto
      </label>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}
