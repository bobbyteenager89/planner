"use client";

import { useState, useEffect } from "react";
import { DayPicker } from "./day-picker";

interface Block {
  id: string;
  dayNumber: number;
  sortOrder: number;
  type: string;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  estimatedCost: string | null;
  aiReasoning: string | null;
  imageUrl: string | null;
}

interface ShareData {
  trip: {
    id: string;
    title: string;
    destination: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string;
  };
  itinerary: {
    id: string;
    version: number;
    status: string;
    createdAt: string;
  } | null;
  blocks: Block[];
  participants: Array<{ name: string | null; role: string }>;
}

// ── Palette ──
const INK = "#3B1A0F";
const RUST = "#D14F36";
const MUSTARD = "#EBB644";
const CREAM = "#F3EBE0";
const CARD_BG = "#EBE1D3";

const TYPE_CONFIG: Record<string, { icon: string; label: string; bg: string }> = {
  activity: { icon: "🏔", label: "Activity", bg: MUSTARD },
  meal: { icon: "🍽", label: "Meal", bg: "#E8D5B8" },
  transport: { icon: "🚗", label: "Transport", bg: CARD_BG },
  lodging: { icon: "🏠", label: "Lodging", bg: CARD_BG },
  free_time: { icon: "☀️", label: "Free Time", bg: "#E5DDD0" },
  note: { icon: "📝", label: "Note", bg: CARD_BG },
};

// ── Drive time estimates ──
function estimateDriveMinutes(from: string, to: string): number | null {
  if (!from || !to) return null;
  const a = from.toLowerCase();
  const b = to.toLowerCase();
  if (a === b) return null;

  const bothBigSky =
    (a.includes("big sky") || a.includes("moose ridge") || a.includes("lone mountain") || a.includes("lone peak")) &&
    (b.includes("big sky") || b.includes("moose ridge") || b.includes("lone mountain") || b.includes("lone peak"));
  if (bothBigSky) return 10;

  const hasYellowstone = a.includes("yellowstone") || b.includes("yellowstone");
  const hasBigSky = a.includes("big sky") || a.includes("moose ridge") || b.includes("big sky") || b.includes("moose ridge");
  if (hasYellowstone && hasBigSky) return 90;
  if (hasYellowstone) return 45;

  const hasEnnis = a.includes("ennis") || b.includes("ennis");
  if (hasEnnis && hasBigSky) return 55;

  const hasGallatin = a.includes("gallatin gateway") || a.includes("rainbow ranch") || b.includes("gallatin gateway") || b.includes("rainbow ranch");
  if (hasGallatin && hasBigSky) return 25;

  const hasBozeman = a.includes("bozeman") || b.includes("bozeman") || a.includes("bzn") || b.includes("bzn");
  if (hasBozeman && hasBigSky) return 50;

  const hasOusel = a.includes("ousel") || b.includes("ousel");
  if (hasOusel && hasBigSky) return 8;

  if (a.includes("big sky") && b.includes("big sky")) return 10;
  return 20;
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

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

function getDayDate(startDate: string | null, dayNumber: number) {
  if (!startDate) return null;
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNumber - 1);
  return date;
}

function formatDayDate(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function getWeekdayShort(startDate: string | null, dayNumber: number) {
  if (!startDate) return `D${dayNumber}`;
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNumber - 1);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

// Day vibe — first block title, abbreviated
function getDayVibe(dayBlocks: Block[]): string {
  const first = [...dayBlocks].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  if (!first) return "";
  const t = first.title.replace(/^(Morning|Afternoon|Evening|Mid-Morning|Full-Day Trip):?\s*/i, "");
  return t.length > 25 ? t.slice(0, 25) + "..." : t;
}

function getDayLocations(dayBlocks: Block[]): string[] {
  const seen = new Set<string>();
  const locs: string[] = [];
  for (const b of dayBlocks.sort((a, c) => a.sortOrder - c.sortOrder)) {
    if (b.location && !b.title.includes("(Alt)") && !seen.has(b.location)) {
      seen.add(b.location);
      locs.push(b.location);
    }
  }
  return locs;
}

function getDayDriveTotal(dayBlocks: Block[]): number {
  const locs = getDayLocations(dayBlocks);
  let total = 0;
  for (let i = 1; i < locs.length; i++) {
    const mins = estimateDriveMinutes(locs[i - 1], locs[i]);
    if (mins) total += mins;
  }
  return total;
}

function TravelCard({ fromLocation, toLocation }: { fromLocation: string; toLocation: string }) {
  const minutes = estimateDriveMinutes(fromLocation, toLocation);
  if (!minutes) return null;
  const directionsUrl = mapsDirectionsUrl([fromLocation, toLocation]);

  return (
    <a
      href={directionsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-5 py-2 mx-auto"
      style={{ maxWidth: "fit-content" }}
    >
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-2.5" style={{ backgroundColor: RUST, opacity: 0.3 }} />
        <span className="text-lg">🚗</span>
        <div className="w-0.5 h-2.5" style={{ backgroundColor: RUST, opacity: 0.3 }} />
      </div>
      <span className="text-xl font-bold" style={{ color: INK, opacity: 0.6 }}>
        ~{minutes} min drive
      </span>
      <span className="text-lg underline underline-offset-2" style={{ color: RUST }}>
        Directions →
      </span>
    </a>
  );
}

export function GuestItinerary({ tripId }: { tripId: string }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/trips/${tripId}/share`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((json) => { setData(json); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [tripId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <p className="text-xl font-semibold" style={{ color: INK }}>Loading your trip...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: INK }}>Something went wrong</p>
          <p className="text-lg mt-2" style={{ color: INK, opacity: 0.6 }}>Try refreshing the page.</p>
        </div>
      </div>
    );
  }

  if (!data || !data.itinerary || data.blocks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: INK }}>No itinerary yet</p>
          <p className="text-lg mt-2" style={{ color: INK, opacity: 0.6 }}>Check back soon!</p>
        </div>
      </div>
    );
  }

  const { trip, blocks } = data;

  const dayGroups = blocks.reduce<Record<number, Block[]>>((acc, block) => {
    if (!acc[block.dayNumber]) acc[block.dayNumber] = [];
    acc[block.dayNumber].push(block);
    return acc;
  }, {});

  const dayNumbers = Object.keys(dayGroups).map(Number).sort((a, b) => a - b);

  // Build day tabs
  const dayTabs = dayNumbers.map((d) => ({
    dayNumber: d,
    weekday: getWeekdayShort(trip.startDate, d),
    vibe: getDayVibe(dayGroups[d]),
  }));

  // Current day's blocks
  const currentBlocks = (dayGroups[activeDay] || []).sort((a, b) => a.sortOrder - b.sortOrder);
  const dayDate = getDayDate(trip.startDate, activeDay);
  const dayLocs = getDayLocations(currentBlocks);
  const dayDrive = getDayDriveTotal(currentBlocks);

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      {/* ═══ HEADER ═══ */}
      <div className="px-5 py-8 sm:px-10 sm:py-10" style={{ backgroundColor: RUST }}>
        <p className="text-lg font-bold uppercase tracking-widest mb-3" style={{ color: MUSTARD }}>
          Goble Family
        </p>
        <h1
          className="text-6xl sm:text-8xl font-black uppercase leading-none"
          style={{
            color: CREAM,
            fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
            textShadow: `3px 3px 0 ${MUSTARD}`,
            letterSpacing: "-0.02em",
          }}
        >
          BIG SKY
        </h1>
        <p className="text-xl sm:text-3xl font-bold mt-3" style={{ color: CREAM }}>
          July 18 — 25, 2026
        </p>
        <a
          href={mapsUrl("20 Moose Ridge Road, Big Sky, MT")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-lg mt-2 font-medium underline underline-offset-4 decoration-1"
          style={{ color: CREAM, opacity: 0.8 }}
        >
          📍 20 Moose Ridge Road, Big Sky, MT →
        </a>
      </div>

      {/* ═══ WARM INTRO ═══ */}
      <div className="max-w-3xl mx-auto px-5 pt-8 pb-4 sm:px-8">
        <p className="text-2xl leading-relaxed font-medium" style={{ color: INK }}>
          Andrew planned this trip around what everyone said they wanted to do.
          Here&apos;s your week.
        </p>
      </div>

      {/* ═══ DAY PICKER ═══ */}
      <DayPicker days={dayTabs} activeDay={activeDay} onSelect={(d) => { setActiveDay(d); setExpandedBlock(null); }} />

      {/* ═══ DAY CONTENT ═══ */}
      <div className="max-w-3xl mx-auto px-5 py-8 sm:px-8">
        {/* Day title */}
        <div className="mb-6">
          <h2
            className="text-4xl sm:text-5xl font-black uppercase"
            style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
          >
            Day {activeDay}
          </h2>
          {dayDate && (
            <p className="text-xl font-bold uppercase tracking-wider mt-1" style={{ color: INK, opacity: 0.55 }}>
              {formatDayDate(dayDate)}
            </p>
          )}

          {/* Day driving summary + route link */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {dayDrive > 0 && (
              <span className="text-xl font-bold" style={{ color: INK, opacity: 0.6 }}>
                🚗 ~{dayDrive} min total driving
              </span>
            )}
            {dayLocs.length >= 2 && (
              <a
                href={mapsDirectionsUrl(dayLocs)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl font-bold underline underline-offset-4"
                style={{ color: RUST }}
              >
                Open full route →
              </a>
            )}
          </div>
        </div>

        {/* Blocks */}
        <div className="space-y-0">
          {currentBlocks.map((block, idx) => {
            const config = TYPE_CONFIG[block.type] || TYPE_CONFIG.note;
            const isExpanded = expandedBlock === block.id;
            const isAlt = block.title.includes("(Alt)");

            const prevBlock = idx > 0 ? currentBlocks[idx - 1] : null;
            const showTravel =
              !isAlt &&
              prevBlock &&
              !prevBlock.title.includes("(Alt)") &&
              prevBlock.location &&
              block.location &&
              prevBlock.location !== block.location;

            return (
              <div key={block.id}>
                {showTravel && (
                  <TravelCard fromLocation={prevBlock!.location!} toLocation={block.location!} />
                )}
                <div
                  onClick={() => setExpandedBlock(isExpanded ? null : block.id)}
                  className="cursor-pointer transition-opacity mb-4"
                  style={{
                    backgroundColor: CARD_BG,
                    border: `2px solid ${isAlt ? MUSTARD : RUST}`,
                    borderRadius: "2px",
                    borderStyle: isAlt ? "dashed" : "solid",
                    padding: "1.5rem 1.75rem",
                    marginLeft: isAlt ? "1.5rem" : 0,
                    opacity: isAlt && !isExpanded ? 0.8 : 1,
                    overflow: "hidden",
                  }}
                >
                  {/* Photo banner */}
                  {block.imageUrl && (
                    <div
                      className="w-full h-40 sm:h-48 bg-cover bg-center -mt-6 -mx-7 mb-4"
                      style={{
                        backgroundImage: `url(${block.imageUrl})`,
                        width: "calc(100% + 3.5rem)",
                        borderRadius: "2px 2px 0 0",
                      }}
                    />
                  )}
                  {/* Top row */}
                  <div className="flex items-center gap-2.5 flex-wrap mb-2">
                    {block.startTime && (
                      <span className="text-xl font-mono font-bold" style={{ color: INK, opacity: 0.65 }}>
                        {formatTime(block.startTime)}{block.endTime && `–${formatTime(block.endTime)}`}
                      </span>
                    )}
                    <span
                      className="text-lg px-3 py-1 font-bold uppercase tracking-wider"
                      style={{ backgroundColor: config.bg, color: INK, border: `1.5px solid ${RUST}`, borderRadius: "2px" }}
                    >
                      {config.icon} {config.label}
                    </span>
                    {isAlt && (
                      <span
                        className="text-lg px-3 py-1 font-bold uppercase tracking-wider"
                        style={{ backgroundColor: CREAM, color: INK, border: `1.5px solid ${MUSTARD}`, borderRadius: "2px" }}
                      >
                        ↔️ Alternative
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <p
                    className="font-black uppercase text-2xl leading-tight"
                    style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
                  >
                    {block.title}
                  </p>

                  {/* Location */}
                  {block.location && (
                    <a
                      href={mapsUrl(block.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-block text-xl mt-1.5 font-semibold underline underline-offset-4 decoration-1"
                      style={{ color: INK, opacity: 0.75 }}
                    >
                      📍 {block.location} →
                    </a>
                  )}

                  {/* Expanded — description only, NO reasoning */}
                  {isExpanded && block.description && (
                    <p className="text-xl leading-relaxed font-medium mt-4" style={{ color: INK }}>
                      {block.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Day navigation */}
        <div className="flex justify-between mt-8">
          {activeDay > dayNumbers[0] ? (
            <button
              onClick={() => setActiveDay(activeDay - 1)}
              className="text-xl font-bold px-6 py-3"
              style={{ backgroundColor: CARD_BG, color: INK, border: `2px solid ${RUST}`, borderRadius: "2px" }}
            >
              ← Day {activeDay - 1}
            </button>
          ) : <div />}
          {activeDay < dayNumbers[dayNumbers.length - 1] ? (
            <button
              onClick={() => { setActiveDay(activeDay + 1); setExpandedBlock(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="text-xl font-bold px-6 py-3"
              style={{ backgroundColor: RUST, color: CREAM, border: `2px solid ${RUST}`, borderRadius: "2px" }}
            >
              Day {activeDay + 1} →
            </button>
          ) : <div />}
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div className="max-w-3xl mx-auto px-5 pb-16 sm:px-8">
        <div className="p-6" style={{ backgroundColor: RUST, borderRadius: "2px" }}>
          <p className="text-xl font-black uppercase tracking-wider" style={{ color: MUSTARD }}>
            {blocks.length} activities across {dayNumbers.length} days
          </p>
          <p className="text-xl mt-1 font-medium" style={{ color: CREAM, opacity: 0.8 }}>
            Tap any card for details
          </p>
        </div>
      </div>
    </div>
  );
}
