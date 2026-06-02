"use client";
import { useTheme } from "next-themes";
import { Bell, Moon, Sun } from "lucide-react";
import Image from "next/image";

interface TopBarProps {
  title: string;
  userInitials?: string;
  avatarUrl?: string | null;
  variant?: "default" | "live";
}

export function TopBar({ title, userInitials = "?", avatarUrl, variant = "default" }: TopBarProps) {
  const { theme, setTheme } = useTheme();

  const gradientClass =
    variant === "live"
      ? "bg-gradient-to-r from-red-700 to-red-800"
      : "";

  return (
    <div
      className={`relative flex items-center gap-3 px-4 py-3 text-white shadow-lg ${gradientClass}`}
      style={
        variant !== "live"
          ? { background: "linear-gradient(135deg, #003d7a 0%, #006633 100%)" }
          : undefined
      }
    >
      {/* gold radial highlight top-right */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, rgba(255,215,0,.15), transparent 50%)",
        }}
      />

      {/* Brand logo */}
      <Image
        src="/logo.png"
        alt=""
        width={32}
        height={32}
        unoptimized
        style={{ background: "transparent" }}
        className="relative z-10 shrink-0"
      />

      {/* Title */}
      <span className="relative z-10 flex-1 text-sm font-extrabold tracking-wide">
        {title}
      </span>

      {/* Avatar */}
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="relative z-10 h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/40"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,.3)" }}
        />
      ) : (
        <div
          className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-[#003d7a]"
          style={{
            background: "linear-gradient(135deg, #ffd700, #ff9500)",
            boxShadow: "0 2px 8px rgba(0,0,0,.3), inset 0 1px 2px rgba(255,255,255,.4)",
          }}
        >
          {userInitials}
        </div>
      )}

      {/* Theme toggle */}
      <button
        className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full opacity-80 transition-opacity hover:opacity-100"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Bell */}
      <div className="relative z-10 opacity-90">
        <Bell size={18} />
      </div>
    </div>
  );
}
