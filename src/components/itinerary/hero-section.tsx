import { CREAM, MUSTARD } from "@/lib/itinerary-shared";

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  kicker?: string;
  dateLabel: string;
  daysToGo: number;
  imageUrl?: string;
}

const DEFAULT_HERO_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/1/16/Lone_Mountain_Sunset_%2832727260230%29.jpg";

export function HeroSection({
  title,
  subtitle,
  kicker,
  dateLabel,
  daysToGo,
  imageUrl,
}: HeroSectionProps) {
  const bg = imageUrl || DEFAULT_HERO_IMAGE;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        height: "min(560px, 70vh)",
        minHeight: "460px",
        backgroundColor: "#A83D27",
        backgroundImage: `linear-gradient(180deg, rgba(59,26,15,0.15) 0%, rgba(59,26,15,0.85) 100%), url("${bg}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "sepia(0.15) saturate(1.1)",
      }}
    >
      {/* noise overlay */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.12,
          mixBlendMode: "overlay",
        }}
      />

      {/* content */}
      <div className="relative z-10 h-full flex flex-col justify-between p-8 sm:p-10">
        <div className="flex justify-between items-start">
          {subtitle && (
            <div
              className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full backdrop-blur-md text-[10px] font-black uppercase tracking-[0.25em]"
              style={{
                background: "rgba(243, 235, 224, 0.15)",
                border: "1px solid rgba(243, 235, 224, 0.3)",
                color: CREAM,
                fontFamily: "'Arial Black', Impact, sans-serif",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: MUSTARD, boxShadow: `0 0 8px ${MUSTARD}` }}
              />
              {subtitle}
            </div>
          )}
          <div className="flex flex-col items-end" style={{ color: CREAM }}>
            <div
              className="text-5xl sm:text-6xl font-black leading-[0.9]"
              style={{
                color: MUSTARD,
                fontFamily: "'Arial Black', Impact, sans-serif",
                textShadow: "2px 2px 0 rgba(0,0,0,0.3)",
              }}
            >
              {daysToGo}
            </div>
            <div
              className="text-[9px] font-black uppercase tracking-[0.25em] mt-1 opacity-90"
              style={{ fontFamily: "'Arial Black', Impact, sans-serif" }}
            >
              Days to go
            </div>
          </div>
        </div>

        <div style={{ color: CREAM }}>
          {kicker && (
            <p
              className="text-lg sm:text-xl italic opacity-95 mb-2"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              {kicker}
            </p>
          )}
          <h1
            className="font-black uppercase leading-[0.82]"
            style={{
              fontSize: "clamp(72px, 16vw, 120px)",
              letterSpacing: "-0.04em",
              color: CREAM,
              fontFamily: "'Arial Black', Impact, sans-serif",
              textShadow: "4px 4px 0 #A83D27, 8px 8px 0 rgba(0,0,0,0.25)",
            }}
          >
            {title}
          </h1>
          <div className="flex items-center gap-4 mt-4">
            <div className="w-10 h-[3px]" style={{ background: MUSTARD }} />
            <div
              className="text-lg sm:text-xl font-medium"
              style={{
                color: CREAM,
                fontFamily: "var(--font-fraunces), Georgia, serif",
                letterSpacing: "0.02em",
              }}
            >
              {dateLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
