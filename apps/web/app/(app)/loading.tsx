// Auto-shown by Next.js during route transitions inside the (app) group.
// Blocks pointer events on the underlying page so users don't double-click.

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-background/80 backdrop-blur-sm">
      <div className="relative h-24 w-24">
        {/* Ball */}
        <div className="ball-bounce absolute left-1/2 top-0 -translate-x-1/2 text-5xl leading-none">
          ⚽
        </div>
        {/* Ground shadow */}
        <div className="ball-shadow absolute left-1/2 bottom-2 h-2 w-12 -translate-x-1/2 rounded-full bg-black/30 blur-md" />
      </div>
      <p className="font-display text-xl tracking-widest text-primary">
        Carregando…
      </p>
    </div>
  );
}
