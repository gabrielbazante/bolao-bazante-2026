"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TabBar({ isAdmin, liveActive }: { isAdmin: boolean; liveActive: boolean }) {
  const path = usePathname();
  const tabs: { href: string; icon: string; label: string; live?: boolean }[] = [
    { href: "/",         icon: "🏠", label: "Home" },
    { href: "/palpites", icon: "⚽", label: "Palpites" },
    ...(liveActive ? [{ href: "/live", icon: "📺", label: "Ao Vivo", live: true }] : []),
    { href: "/ranking",  icon: "🏆", label: "Ranking" },
    { href: "/profile",  icon: "👤", label: "Perfil" },
    ...(isAdmin ? [{ href: "/admin", icon: "🛠️", label: "Admin" }] : []),
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-background border-t flex justify-around py-1 z-50">
      {tabs.map(t => {
        const active = path === t.href;
        return (
          <Link key={t.href} href={t.href}
            className={`flex flex-col items-center gap-0.5 text-[10px] px-2 py-1
              ${active ? "text-primary font-bold" : "text-muted-foreground"}
              ${t.live ? "relative" : ""}`}>
            <span className="text-base">{t.icon}</span>
            {t.label}
            {t.live && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />}
          </Link>
        );
      })}
    </nav>
  );
}
