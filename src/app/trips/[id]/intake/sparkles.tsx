export function Sparkles() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Bug #9 fix: increased cloud opacities so they're visible and give the blur texture */}
      {/* Cloud 1 — large, top-right */}
      <div className="cloud-drift absolute -right-10 top-[12%] opacity-[0.12]">
        <div className="relative size-64">
          <div className="absolute bottom-0 left-6 h-24 w-52 rounded-full bg-white" />
          <div className="absolute bottom-4 left-12 size-36 rounded-full bg-white" />
          <div className="absolute bottom-6 right-10 size-28 rounded-full bg-white" />
          <div className="absolute bottom-10 left-28 size-20 rounded-full bg-white" />
        </div>
      </div>

      {/* Cloud 2 — medium, mid-left */}
      <div className="cloud-drift-slow absolute -left-8 top-[40%] opacity-[0.08]">
        <div className="relative h-32 w-44">
          <div className="absolute bottom-0 left-4 h-16 w-36 rounded-full bg-white" />
          <div className="absolute bottom-2 left-8 size-24 rounded-full bg-white" />
          <div className="absolute bottom-4 right-6 size-20 rounded-full bg-white" />
        </div>
      </div>

      {/* Cloud 3 — small, bottom-right */}
      <div className="cloud-drift absolute bottom-[15%] right-4 opacity-[0.06]">
        <div className="relative h-24 w-36">
          <div className="absolute bottom-0 left-2 h-12 w-28 rounded-full bg-white" />
          <div className="absolute bottom-1 left-6 size-16 rounded-full bg-white" />
          <div className="absolute bottom-2 right-4 size-14 rounded-full bg-white" />
        </div>
      </div>

      {/* Subtle ambient glow — top */}
      <div
        className="absolute -top-32 left-1/2 size-96 -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
