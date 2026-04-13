"use client";

import { useRef, useEffect } from "react";
import { RUST, CREAM, INK, CARD_BG } from "@/lib/itinerary-shared";

const INK_MUTED = "#7A6254";

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
      <div
        role="tablist"
        aria-label="Trip days"
        className="flex gap-2 px-4 py-3 min-w-max mx-auto"
      >
        {days.map((d) => {
          const isActive = d.dayNumber === activeDay;
          return (
            <button
              key={d.dayNumber}
              ref={isActive ? activeRef : undefined}
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(d.dayNumber)}
              className="flex flex-col items-center px-4 py-2.5 transition-all shrink-0"
              style={{
                backgroundColor: isActive ? RUST : CARD_BG,
                color: isActive ? CREAM : INK,
                borderRadius: "2px",
                border: `1.5px solid ${RUST}`,
                minWidth: "4.5rem",
              }}
            >
              <span
                className="text-xs font-black uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
                  color: isActive ? undefined : INK_MUTED,
                  opacity: isActive ? 0.85 : undefined,
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
