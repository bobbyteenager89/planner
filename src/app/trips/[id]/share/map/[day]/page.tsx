"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { INK, RUST, CREAM, CARD_BG } from "@/lib/itinerary-shared";

const INK_MUTED = "#7A6254";

interface Block {
  id: string;
  dayNumber: number;
  sortOrder: number;
  type: string;
  title: string;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

function mapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function mapsDirectionsUrl(locations: string[]) {
  if (locations.length < 2) return mapsUrl(locations[0] || "Big Sky, MT");
  const origin = encodeURIComponent(locations[0]);
  const destination = encodeURIComponent(locations[locations.length - 1]);
  const waypoints = locations.slice(1, -1).map((l) => encodeURIComponent(l)).join("|");
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  return url;
}

export default function DayMapPage({
  params,
}: {
  params: Promise<{ id: string; day: string }>;
}) {
  const { id: tripId, day } = use(params);
  const dayNumber = parseInt(day, 10);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/trips/${tripId}/share`)
      .then((r) => r.json())
      .then((data) => {
        const dayBlocks = data.blocks
          .filter((b: Block) => b.dayNumber === dayNumber)
          .sort((a: Block, b: Block) => a.sortOrder - b.sortOrder);
        setBlocks(dayBlocks);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tripId, dayNumber]);

  if (loading) {
    return (
      <main id="main-content" className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <p className="text-xl font-semibold" style={{ color: INK }}>Loading map...</p>
      </main>
    );
  }

  const locations = blocks
    .filter((b) => b.location && !b.title.includes("(Alt)"))
    .map((b) => b.location!);
  const uniqueLocations = [...new Set(locations)];

  return (
    <main id="main-content" style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      <div className="px-5 py-6 sm:px-10" style={{ backgroundColor: RUST }}>
        <Link
          href={`/trips/${tripId}/share`}
          className="text-lg font-bold"
          style={{ color: CREAM }}
        >
          ← Back to itinerary
        </Link>
        <h1
          className="text-3xl sm:text-4xl font-black uppercase mt-3"
          style={{ color: CREAM, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
        >
          Day {dayNumber} Map
        </h1>
        <p className="text-xl font-bold mt-1" style={{ color: CREAM }}>
          {uniqueLocations.length} stops
        </p>
      </div>

      {/* Map link */}
      <div className="w-full py-12 text-center" style={{ backgroundColor: CARD_BG }}>
        {uniqueLocations.length >= 2 ? (
          <a
            href={mapsDirectionsUrl(uniqueLocations)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-2xl font-black uppercase px-8 py-4"
            style={{ backgroundColor: RUST, color: CREAM, borderRadius: "2px" }}
          >
            🗺 Open Route in Google Maps →
          </a>
        ) : uniqueLocations.length === 1 ? (
          <a
            href={mapsUrl(uniqueLocations[0])}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-2xl font-black uppercase px-8 py-4"
            style={{ backgroundColor: RUST, color: CREAM, borderRadius: "2px" }}
          >
            🗺 Open in Google Maps →
          </a>
        ) : (
          <p className="text-xl font-bold" style={{ color: INK_MUTED }}>
            No locations for this day
          </p>
        )}
        <p className="text-lg font-bold mt-3" style={{ color: INK_MUTED }}>
          {uniqueLocations.length} stops · Day {dayNumber}
        </p>
      </div>

      {/* Stop list */}
      <div className="max-w-3xl mx-auto px-5 py-8 sm:px-8">
        <h2 className="text-2xl font-black uppercase mb-6" style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}>
          Stops
        </h2>
        <div className="space-y-3">
          {blocks
            .filter((b) => b.location && !b.title.includes("(Alt)"))
            .map((block, idx) => (
              <div
                key={block.id}
                className="flex items-start gap-4 p-4"
                style={{ backgroundColor: CARD_BG, border: `2px solid ${RUST}`, borderRadius: "2px" }}
              >
                <span
                  className="text-lg font-black shrink-0 w-8 h-8 flex items-center justify-center"
                  style={{ color: CREAM, backgroundColor: RUST, borderRadius: "50%" }}
                >
                  {idx + 1}
                </span>
                <div>
                  <p className="text-xl font-black" style={{ color: INK }}>
                    {block.title.replace(/^(Morning|Afternoon|Evening|Mid-Morning|Full-Day Trip|Lunch|Dinner|Breakfast):?\s*/i, "")}
                  </p>
                  {block.startTime && (
                    <p className="text-lg font-mono font-bold mt-0.5" style={{ color: INK_MUTED }}>
                      {formatTime(block.startTime)}{block.endTime && ` – ${formatTime(block.endTime)}`}
                    </p>
                  )}
                  <a
                    href={mapsUrl(block.location!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-lg font-bold underline underline-offset-4 mt-1"
                    style={{ color: RUST }}
                  >
                    📍 {block.location} →
                  </a>
                </div>
              </div>
            ))}
        </div>
      </div>
    </main>
  );
}
