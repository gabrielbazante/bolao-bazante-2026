"use client";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function PixBox({ pixKey }: { pixKey: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border bg-white p-4 flex flex-col items-center gap-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Pix · R$ 10</p>
      <QRCodeSVG value={pixKey} size={160} />
      <code className="text-xs break-all text-center px-2">{pixKey}</code>
      <Button variant="outline" size="sm" onClick={async () => {
        await navigator.clipboard.writeText(pixKey);
        setCopied(true); setTimeout(() => setCopied(false), 1500);
      }}>{copied ? "Copiado!" : "Copiar chave"}</Button>
    </div>
  );
}
