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

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="flex w-full flex-col gap-1">
      <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-white/65">
        {label}
      </span>
      {children}
    </label>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Logo block */}
      <div className="flex flex-col items-center gap-2">
        <Image
          src="/logo.png"
          alt="Bolão da Família Bazante 2026"
          width={240}
          height={240}
          priority
          unoptimized
          style={{ background: "transparent", width: 240, height: "auto" }}
          className="drop-shadow-[0_10px_32px_rgba(255,215,0,0.3)]"
        />
        <p
          className="font-display text-[16px] text-white/85"
          style={{ letterSpacing: "0.4em", textIndent: "0.4em" }}
        >
          ⚽ COPA DO MUNDO ⚽
        </p>
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
          <Field label="Nome completo">
            <input
              name="full_name"
              required
              className={inputClass}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </Field>

          <Field label="Sexo">
            <select
              name="sex"
              required
              defaultValue=""
              className={inputClass}
              style={{ ...inputStyle, appearance: "none" }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            >
              <option value="" disabled style={{ background: "#001f3f" }}>Selecione…</option>
              <option value="M" style={{ background: "#001f3f" }}>Masculino</option>
              <option value="F" style={{ background: "#001f3f" }}>Feminino</option>
              <option value="O" style={{ background: "#001f3f" }}>Outro</option>
            </select>
          </Field>

          <Field label="Data de nascimento">
            <input
              name="birth_date"
              type="date"
              required
              className={inputClass}
              style={{
                ...inputStyle,
                colorScheme: "dark",
                // iOS Safari hacks: native date input forces a min-width and adds its
                // own appearance, breaking w-full inside the form. These reset it.
                WebkitAppearance: "none",
                appearance: "none",
                minWidth: 0,
                maxWidth: "100%",
                display: "block",
                boxSizing: "border-box",
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </Field>

          <Field label="E-mail">
            <input
              name="email"
              type="email"
              required
              className={inputClass}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </Field>

          <Field label="Senha (mín. 8 caracteres)">
            <input
              name="password"
              type="password"
              minLength={8}
              required
              className={inputClass}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </Field>

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

        <p className="mt-8 text-center text-sm text-white/80">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="font-extrabold underline underline-offset-4 transition-opacity hover:opacity-80"
            style={{ color: "#ffd700" }}
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
