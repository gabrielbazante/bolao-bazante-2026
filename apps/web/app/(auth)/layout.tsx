export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="relative flex min-h-screen items-start justify-center overflow-hidden px-4 pt-12 pb-8"
      style={{
        background:
          "radial-gradient(ellipse at top, #003d7a 0%, #001f3f 50%, #000 100%)",
      }}
    >
      {/* Gold glow top-right */}
      <div
        className="pointer-events-none absolute right-[-50px] top-[10%] h-52 w-52"
        style={{
          background: "radial-gradient(circle, #ffd700, transparent 70%)",
          opacity: 0.15,
          filter: "blur(40px)",
        }}
      />

      {/* Soccer ball watermark bottom-left */}
      <div
        className="pointer-events-none absolute -bottom-5 -left-3 select-none text-[150px] leading-none"
        style={{ opacity: 0.04, transform: "rotate(-20deg)" }}
      >
        ⚽
      </div>

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </main>
  );
}
