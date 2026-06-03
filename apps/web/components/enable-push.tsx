"use client";
import { createClient } from "@/lib/supabase/client";
import { subscribeToPush } from "@/lib/push";
import { useEffect, useState } from "react";
import { Bell, CheckCircle, XCircle, Smartphone } from "lucide-react";

type Status = "idle" | "ok" | "denied" | "error" | "unsupported" | "needs-pwa";

export function EnablePush() {
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    // Detect upfront whether push is even possible in this context
    if (typeof window === "undefined") return;

    const supportsPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supportsPush) {
      setStatus("unsupported");
      return;
    }

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS-specific standalone check
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isIOS && !isStandalone) {
      setStatus("needs-pwa");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
    } else if (Notification.permission === "granted") {
      // already granted — assume subscribed (handle re-subscribe in handler if needed)
      setStatus("idle");
    }
  }, []);

  async function handle() {
    try {
      const sub = await subscribeToPush();
      if (!sub) {
        setStatus(Notification.permission === "denied" ? "denied" : "error");
        return;
      }
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("error"); return; }
      await supabase.from("profiles").update({ push_subscription: sub }).eq("id", user.id);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }

  const showButton = status !== "unsupported" && status !== "needs-pwa";

  return (
    <div className="flex flex-col gap-2">
      {showButton && (
        <button
          className="btn-3d btn-3d-dark w-full"
          onClick={handle}
          disabled={status === "ok"}
        >
          <Bell size={14} />
          {status === "ok" ? "Ativadas!" : "Ativar notificações"}
        </button>
      )}

      {status === "ok" && (
        <p className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#006633" }}>
          <CheckCircle size={12} />
          Notificações ativadas com sucesso!
        </p>
      )}

      {status === "denied" && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
          <p className="flex items-center gap-1 font-semibold">
            <XCircle size={12} /> Permissão bloqueada pelo navegador
          </p>
          <p className="mt-1 leading-relaxed text-foreground/70">
            Você (ou o navegador) bloqueou notificações pra esse site. Pra reverter no iPhone:
            <strong> Ajustes → Safari → Sites → Notificações → permitir bolao-bazante-2026.vercel.app</strong>.
            No Chrome/Edge: cadeado da URL → Notificações → Permitir.
          </p>
        </div>
      )}

      {status === "needs-pwa" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
          <p className="flex items-center gap-1 font-semibold">
            <Smartphone size={12} /> Instala o app primeiro
          </p>
          <p className="mt-1 leading-relaxed text-foreground/70">
            No iPhone, notificações só funcionam quando o Bolão Bazante está instalado como app
            na tela inicial. No Safari: toca em <strong>Compartilhar (□↑) → Adicionar à Tela
            de Início</strong>, depois abre pelo ícone e volta aqui.
          </p>
        </div>
      )}

      {status === "unsupported" && (
        <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <XCircle size={12} /> Seu navegador não suporta notificações push.
        </p>
      )}

      {status === "error" && (
        <p className="flex items-center gap-1 text-xs font-semibold text-red-600">
          <XCircle size={12} /> Erro ao ativar. Tenta de novo.
        </p>
      )}
    </div>
  );
}
