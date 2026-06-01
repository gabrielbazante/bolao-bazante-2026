"use client";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { subscribeToPush } from "@/lib/push";
import { useState } from "react";

export function EnablePush() {
  const [status, setStatus] = useState<"idle" | "ok" | "denied" | "error">("idle");
  async function handle() {
    try {
      const sub = await subscribeToPush();
      if (!sub) { setStatus("denied"); return; }
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("error"); return; }
      await supabase.from("profiles").update({ push_subscription: sub }).eq("id", user.id);
      setStatus("ok");
    } catch { setStatus("error"); }
  }
  return (
    <div>
      <Button onClick={handle}>🔔 Ativar notificações</Button>
      {status === "ok" && <p className="text-xs text-emerald-700 mt-1">Notificações ativadas!</p>}
      {status === "denied" && <p className="text-xs text-red-600 mt-1">Permissão negada.</p>}
      {status === "error" && <p className="text-xs text-red-600 mt-1">Erro ao ativar.</p>}
    </div>
  );
}
