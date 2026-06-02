// Auto-shown by Next.js during route transitions inside the (app) group.
// Blocks pointer events on the underlying page so users don't double-click.

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-background/80 backdrop-blur-sm">
      <div className="relative h-36 w-20">
        {/* Vertical jumper — controls only translateY, ball stays horizontally centered */}
        <div className="ball-jump absolute inset-x-0 top-0 flex justify-center">
          <span className="ball-spin inline-block text-5xl leading-none">⚽</span>
        </div>
        {/* Ground shadow */}
        <div className="ball-shadow absolute bottom-1 left-1/2 h-2 w-14 -translate-x-1/2 rounded-full bg-black/35 blur-md" />
      </div>
      <p className="font-display text-xl tracking-widest text-primary">
        Carregando…
      </p>
    </div>
  );
}
