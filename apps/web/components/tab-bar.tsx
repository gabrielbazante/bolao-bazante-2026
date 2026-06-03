"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Volleyball, Tv, Trophy, User, Settings } from "lucide-react";

type TabDef = {
  href: string;
  icon: React.ReactNode;
  label: string;
  live?: boolean;
};

export function TabBar({
  isAdmin,
  liveActive,
}: {
  isAdmin: boolean;
  liveActive: boolean;
}) {
  const path = usePathname();

  const tabs: TabDef[] = [
    { href: "/", icon: <Home size={20} />, label: "Home" },
    { href: "/palpites", icon: <Volleyball size={20} />, label: "Palpites" },
    {
      href: "/live",
      icon: <Tv size={20} />,
      label: "Ao Vivo",
      live: liveActive, // pulse dot only when there's an active match
    },
    { href: "/ranking", icon: <Trophy size={20} />, label: "Ranking" },
    { href: "/profile", icon: <User size={20} />, label: "Perfil" },
    ...(isAdmin
      ? [{ href: "/admin", icon: <Settings size={20} />, label: "Admin" }]
      : []),
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 flex justify-around border-t px-1 pt-2"
      style={{
        background: "rgba(255,255,255,.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: "rgba(0,0,0,.06)",
        boxShadow: "0 -4px 20px rgba(0,0,0,.08)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
      }}
    >
      {tabs.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1 text-[9px] font-bold uppercase tracking-wide transition-colors ${
              t.live ? "text-red-600" : active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {/* Icon with lift on active */}
            <span
              className="transition-transform duration-200"
              style={active ? { transform: "translateY(-2px)" } : undefined}
            >
              {t.icon}
            </span>

            {t.label}

            {/* Live red dot */}
            {t.live && (
              <span
                className="absolute right-2 top-0.5 h-2 w-2 rounded-full bg-red-600"
                style={{
                  animation: "pulse 1s infinite",
                  boxShadow: "0 0 8px rgba(220,38,38,.7)",
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
