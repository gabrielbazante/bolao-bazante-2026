"use client";
import { useState, useTransition } from "react";
import { signupAction } from "./actions";
import Link from "next/link";
import Image from "next/image";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const inputStyle = {
    background: "rgba(0,0,0,.3)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,.1)",
  } as React.CSSProperties;

  const inputClass =
    "w-full rounded-xl px-4 py-3 text-sm transition-all placeholder:text-white/40";

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = "#ffd700";
    e.target.style.boxShadow = "0 0 0 3px rgba(255,215,0,.15)";
    e.target.style.outline = "none";
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = "rgba(255,255,255,.1)";
    e.target.style.boxShadow = "none";
  };

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
        <h2 className="mb-4 text-center text-base font-bold text-white">
          Criar conta
        </h2>

        <form
          className="flex flex-col gap-3"
          action={(fd) =>
            start(async () => {
              const r = await signupAction(fd);
              if (r?.error) setError(r.error);
            })
          }
        >
          <input
            name="full_name"
            required
            placeholder="Nome completo"
            className={inputClass}
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />

          <select
            name="sex"
            required
            className={inputClass}
            style={{ ...inputStyle, appearance: "none" }}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            <option value="" style={{ background: "#001f3f" }}>Sexo</option>
            <option value="M" style={{ background: "#001f3f" }}>Masculino</option>
            <option value="F" style={{ background: "#001f3f" }}>Feminino</option>
            <option value="O" style={{ background: "#001f3f" }}>Outro</option>
          </select>

          <input
            name="birth_date"
            type="date"
            required
            placeholder="Data de nascimento"
            className={inputClass}
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />

          <input
            name="email"
            type="email"
            required
            placeholder="E-mail"
            className={inputClass}
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />

          <input
            name="password"
            type="password"
            minLength={8}
            required
            placeholder="Senha (mín. 8 caracteres)"
            className={inputClass}
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
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
            {pending ? "Criando…" : "Cadastrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-white/70">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="font-bold transition-opacity hover:opacity-80"
            style={{ color: "#ffd700" }}
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
