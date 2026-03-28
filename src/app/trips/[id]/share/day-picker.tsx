"use client";

const RUST = "#D14F36";
const CREAM = "#F3EBE0";
const INK = "#3B1A0F";
const CARD_BG = "#EBE1D3";

interface DayTab {
  dayNumber: number;
  weekday: string;
  vibe: string;
}

export function DayPicker({
  days,
  activeDay,
  onSelect,
}: {
  days: DayTab[];
  activeDay: number;
  onSelect: (day: number) => void;
}) {
  return (
    <div
      className="sticky top-0 z-20 overflow-x-auto"
      style={{ backgroundColor: CREAM, borderBottom: `2px solid ${RUST}` }}
    >
      <div className="flex gap-1 px-4 py-3 min-w-max sm:justify-center">
        {days.map((d) => {
          const isActive = d.dayNumber === activeDay;
          return (
            <button
              key={d.dayNumber}
              onClick={() => onSelect(d.dayNumber)}
              className="flex flex-col items-center px-4 py-2 transition-all shrink-0"
              style={{
                backgroundColor: isActive ? RUST : CARD_BG,
                color: isActive ? CREAM : INK,
                borderRadius: "2px",
                border: `1.5px solid ${RUST}`,
                minWidth: "4.5rem",
              }}
            >
              <span
                className="text-lg font-black uppercase"
                style={{ fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
              >
                Day {d.dayNumber}
              </span>
              <span className="text-base font-bold uppercase tracking-wider" style={{ opacity: isActive ? 0.8 : 0.5 }}>
                {d.weekday}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
