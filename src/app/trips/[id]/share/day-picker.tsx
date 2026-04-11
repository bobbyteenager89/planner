"use client";

import { useRef, useEffect } from "react";

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
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to active tab when day changes
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
  }, [activeDay]);

  return (
    <div
      className="sticky top-0 z-20 overflow-x-auto"
      style={{ backgroundColor: CREAM, borderBottom: `2px solid ${RUST}` }}
    >
      <div className="flex gap-2 px-4 py-3 pr-8 min-w-max">
        {days.map((d) => {
          const isActive = d.dayNumber === activeDay;
          return (
            <button
              key={d.dayNumber}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSelect(d.dayNumber)}
              className="flex flex-col items-center px-3 py-2.5 transition-all shrink-0"
              style={{
                backgroundColor: isActive ? RUST : CARD_BG,
                color: isActive ? CREAM : INK,
                borderRadius: "2px",
                border: `1.5px solid ${RUST}`,
                width: "7.5rem",
              }}
            >
              <span
                className="text-xs font-black uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
                  opacity: isActive ? 0.85 : 0.55,
                }}
              >
                {d.weekday}
              </span>
              <span
                className="text-2xl font-black uppercase leading-none mt-0.5"
                style={{ fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
              >
                {d.dayNumber}
              </span>
              {d.vibe && (
                <span
                  className="text-[11px] italic text-center mt-1 leading-tight"
                  style={{
                    opacity: isActive ? 0.9 : 0.55,
                    fontFamily: "var(--font-fraunces), Georgia, serif",
                    wordBreak: "break-word",
                  }}
                >
                  {d.vibe}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
