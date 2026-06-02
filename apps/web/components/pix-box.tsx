"use client";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

export function PixBox({ pixKey }: { pixKey: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl bg-white p-5"
      style={{
        boxShadow:
          "0 4px 16px -4px rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0,.06)",
        border: "1px solid rgba(0,0,0,.06)",
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Pix · R$ 10
      </p>
      <QRCodeSVG value={pixKey || "https://bazatravel.com.br"} size={160} />
      <code className="max-w-full break-all px-2 text-center text-[11px] text-slate-600">
        {pixKey}
      </code>
      <button
        className="btn-3d btn-3d-dark flex items-center gap-2 px-6 py-3 text-xs"
        onClick={async () => {
          await navigator.clipboard.writeText(pixKey);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? (
          <>
            <Check size={13} />
            Copiado!
          </>
        ) : (
          <>
            <Copy size={13} />
            Copiar chave
          </>
        )}
      </button>
    </div>
  );
}
