"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { signupAction } from "./actions";
import Link from "next/link";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card className="p-6">
      <h1 className="text-2xl font-bold text-center">Cadastro</h1>
      <p className="text-sm text-center text-muted-foreground mb-6">
        Bolão da Família Bazante 2026
      </p>
      <form
        className="space-y-4"
        action={(fd) =>
          start(async () => {
            const r = await signupAction(fd);
            if (r?.error) setError(r.error);
          })
        }
      >
        <div><Label htmlFor="full_name">Nome completo</Label>
          <Input id="full_name" name="full_name" required /></div>
        <div><Label htmlFor="sex">Sexo</Label>
          <select id="sex" name="sex" className="w-full border rounded h-10 px-3" required>
            <option value="">Selecione</option><option value="M">Masculino</option>
            <option value="F">Feminino</option><option value="O">Outro</option>
          </select></div>
        <div><Label htmlFor="birth_date">Data de nascimento</Label>
          <Input id="birth_date" name="birth_date" type="date" required /></div>
        <div><Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required /></div>
        <div><Label htmlFor="password">Senha (mín 8)</Label>
          <Input id="password" name="password" type="password" minLength={8} required /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Criando…" : "Cadastrar"}
        </Button>
      </form>
      <p className="text-sm text-center mt-4">
        Já tem conta? <Link href="/login" className="underline">Entrar</Link>
      </p>
    </Card>
  );
}
