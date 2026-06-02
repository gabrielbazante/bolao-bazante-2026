"use client";
import { createClient } from "@/lib/supabase/client";
import { subscribeToPush } from "@/lib/push";
import { useState } from "react";
import { Bell, CheckCircle, XCircle } from "lucide-react";

export function EnablePush() {
  const [status, setStatus] = useState<"idle" | "ok" | "denied" | "error">("idle");

  async function handle() {
    try {
      const sub = await subscribeToPush();
      if (!sub) {
        setStatus("denied");
        return;
      }
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus("error");
        return;
      }
      await supabase
        .from("profiles")
        .update({ push_subscription: sub })
        .eq("id", user.id);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        className="btn-3d btn-3d-dark w-full"
        onClick={handle}
        disabled={status === "ok"}
      >
        <Bell size={14} />
        {status === "ok" ? "Ativadas!" : "Ativar notificações"}
      </button>
      {status === "ok" && (
        <p className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#006633" }}>
          <CheckCircle size={12} />
          Notificações ativadas com sucesso!
        </p>
      )}
      {status === "denied" && (
        <p className="flex items-center gap-1 text-xs font-semibold text-red-600">
          <XCircle size={12} />
          Permissão negada pelo navegador.
        </p>
      )}
      {status === "error" && (
        <p className="flex items-center gap-1 text-xs font-semibold text-red-600">
          <XCircle size={12} />
          Erro ao ativar notificações.
        </p>
      )}
    </div>
  );
}
