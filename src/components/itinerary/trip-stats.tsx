import { INK, CREAM } from "@/lib/itinerary-shared";

const INK_MUTED = "#7A6254";

interface Stat {
  label: string;
  value: React.ReactNode;
  href?: string;
}

interface TripStatsProps {
  stats: Stat[];
}

export function TripStats({ stats }: TripStatsProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 gap-0 px-6 py-5"
      style={{
        background: CREAM,
        borderBottom: "1px solid rgba(59,26,15,0.1)",
      }}
    >
      {stats.map((stat, i) => (
        <div
          key={i}
          className="px-4"
          style={{
            borderLeft: i === 0 ? "none" : "1px solid rgba(59,26,15,0.12)",
          }}
        >
          <div
            className="text-[9px] font-black uppercase tracking-[0.2em] mb-1"
            style={{
              color: INK_MUTED,
              fontFamily: "'Arial Black', Impact, sans-serif",
            }}
          >
            {stat.label}
          </div>
          {stat.href ? (
            <a
              href={stat.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block font-medium hover:opacity-70 transition-opacity"
              style={{
                color: INK,
                fontSize: "16px",
                lineHeight: 1.2,
                fontFamily: "var(--font-fraunces), Georgia, serif",
              }}
            >
              {stat.value}
            </a>
          ) : (
            <div
              className="font-medium"
              style={{
                color: INK,
                fontSize: "16px",
                lineHeight: 1.2,
                fontFamily: "var(--font-fraunces), Georgia, serif",
              }}
            >
              {stat.value}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
