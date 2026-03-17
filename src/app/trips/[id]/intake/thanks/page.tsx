export default function ThanksPage() {
  const RUST = "#D14F36";
  const MUSTARD = "#EBB644";
  const CREAM = "#F3EBE0";
  const CARD_BG = "#EBE1D3";

  return (
    <div
      style={{ minHeight: "100dvh", backgroundColor: CREAM }}
      className="flex flex-col items-center justify-center px-4"
    >
      {/* Header strip */}
      <div
        className="w-full max-w-md mb-0"
        style={{ backgroundColor: RUST, padding: "1rem 1.5rem", borderRadius: "2px 2px 0 0" }}
      >
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: MUSTARD, opacity: 0.85 }}
        >
          Goble Family
        </p>
        <h1
          className="text-4xl font-black uppercase leading-none mt-1"
          style={{
            color: CREAM,
            fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
            textShadow: `2px 2px 0 ${MUSTARD}`,
            letterSpacing: "-0.02em",
          }}
        >
          BIG SKY
        </h1>
      </div>

      {/* Card body */}
      <div
        className="w-full max-w-md text-center"
        style={{
          backgroundColor: CARD_BG,
          border: `1.5px solid ${RUST}`,
          borderTop: "none",
          borderRadius: "0 0 2px 2px",
          padding: "2rem 1.5rem",
        }}
      >
        <div className="text-5xl mb-4">🏔️</div>
        <h2
          className="text-2xl font-black uppercase mb-2"
          style={{
            color: RUST,
            fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
          }}
        >
          You&apos;re all set!
        </h2>
        <p
          className="text-sm leading-relaxed font-medium"
          style={{ color: RUST, opacity: 0.75 }}
        >
          Thanks for voting — we&apos;ll use everyone&apos;s picks to build the
          schedule. Keep an eye out for the final itinerary!
        </p>
        <div
          className="mt-6 pt-4 text-xs font-bold uppercase tracking-widest"
          style={{
            borderTop: `1px solid ${RUST}`,
            color: RUST,
            opacity: 0.4,
          }}
        >
          July 18 – 25, 2026
        </div>
      </div>
    </div>
  );
}
