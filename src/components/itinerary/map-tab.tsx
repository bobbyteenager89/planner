"use client";

import { type Block, INK, RUST, CREAM, mapsUrl, getDayDate, formatDayDate } from "@/lib/itinerary-shared";

interface MapTabProps {
  blocks: Block[];
  startDate: string | null;
}

export function MapTab({ blocks, startDate }: MapTabProps) {
  const days = [...new Set(blocks.map((b) => b.dayNumber))].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {days.map((dayNum) => {
        const dayBlocks = blocks.filter((b) => b.dayNumber === dayNum && b.location);
        const date = getDayDate(startDate, dayNum);
        if (dayBlocks.length === 0) return null;

        return (
          <div key={dayNum}>
            <h3
              className="text-lg font-bold mb-3"
              style={{ color: RUST, fontFamily: "'Arial Black', Impact, sans-serif" }}
            >
              Day {dayNum} {date ? `\u2014 ${formatDayDate(date)}` : ""}
            </h3>
            <div className="space-y-2">
              {dayBlocks.map((block) => (
                <a
                  key={block.id}
                  href={mapsUrl(block.location!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-black/5 transition-colors"
                  style={{ background: CREAM, color: INK }}
                >
                  <span className="text-lg">{"\uD83D\uDCCD"}</span>
                  <div>
                    <div className="font-semibold text-sm">{block.title}</div>
                    <div className="text-xs opacity-60">{block.location}</div>
                  </div>
                  <span className="ml-auto text-xs opacity-40">{"\u2197"}</span>
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
