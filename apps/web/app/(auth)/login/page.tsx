"use client";
import { useState, useTransition } from "react";
import { loginAction } from "./actions";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      {/* Logo block */}
      <div className="flex flex-col items-center gap-2">
        <Image
          src="/logo.png"
          alt="Bolão da Família Bazante 2026"
          width={200}
          height={200}
          priority
          unoptimized
          style={{ background: "transparent", width: 200, height: "auto" }}
          className="drop-shadow-[0_8px_24px_rgba(255,215,0,0.25)]"
        />
      </div>

      {/* Form glass card */}
      <div className="glass p-6">
        <form
          className="flex flex-col gap-3"
          action={(fd) =>
            start(async () => {
              const r = await loginAction(fd);
              if (r?.error) setError(r.error);
            })
          }
        >
          <input
            name="email"
            type="email"
            required
            placeholder="E-mail"
            className="w-full rounded-xl px-4 py-4 text-sm transition-all"
            style={{
              background: "rgba(0,0,0,.3)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,.1)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#ffd700";
              e.target.style.boxShadow = "0 0 0 3px rgba(255,215,0,.15)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,.1)";
              e.target.style.boxShadow = "none";
            }}
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Senha"
            className="w-full rounded-xl px-4 py-4 text-sm transition-all"
            style={{
              background: "rgba(0,0,0,.3)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,.1)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#ffd700";
              e.target.style.boxShadow = "0 0 0 3px rgba(255,215,0,.15)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,.1)";
              e.target.style.boxShadow = "none";
            }}
          />

          {error && (
            <p className="rounded-lg bg-red-900/40 px-3 py-2 text-xs font-semibold text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="btn-3d btn-3d-gold mt-1 w-full"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-white/70">
          Novo?{" "}
          <Link
            href="/signup"
            className="font-bold transition-opacity hover:opacity-80"
            style={{ color: "#ffd700" }}
          >
            Cadastrar
          </Link>
        </p>
      </div>
    </div>
  );
}
