"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Camera } from "lucide-react";

export function AvatarUpload({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [err, setErr] = useState<string | null>(null);
  const supabase = createClient();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErr("Máx 2MB");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErr("Sem sessão");
      return;
    }
    const path = `${user.id}/avatar.jpg`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setErr(error.message);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    const bust = `${publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: bust }).eq("id", user.id);
    setUrl(bust);
  }

  return (
    <div className="flex items-center gap-4">
      {/* Avatar circle */}
      {url ? (
        <img
          src={url}
          alt=""
          className="h-16 w-16 rounded-full object-cover"
          style={{
            boxShadow: "0 4px 12px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.2)",
          }}
        />
      ) : (
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-muted-foreground"
          style={{
            background: "var(--muted)",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,.06)",
          }}
        >
          <Camera size={24} />
        </div>
      )}

      {/* Upload button */}
      <label className="btn-3d btn-3d-dark cursor-pointer px-5 py-3 text-xs">
        <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        <Camera size={13} className="mr-1" />
        Trocar foto
      </label>

      {err && <p className="text-xs font-semibold text-red-500">{err}</p>}
    </div>
  );
}
