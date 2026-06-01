"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { loginAction } from "./actions";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card className="p-6">
      <h1 className="text-2xl font-bold text-center">Entrar</h1>
      <p className="text-sm text-center text-muted-foreground mb-6">
        Bolão da Família Bazante 2026
      </p>
      <form className="space-y-4" action={(fd) =>
        start(async () => { const r = await loginAction(fd); if (r?.error) setError(r.error); })
      }>
        <div><Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required /></div>
        <div><Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" required /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <p className="text-sm text-center mt-4">
        Novo? <Link href="/signup" className="underline">Cadastrar</Link>
      </p>
    </Card>
  );
}
