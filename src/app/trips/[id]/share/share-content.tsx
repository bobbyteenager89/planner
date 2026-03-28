"use client";

import { useState, useEffect } from "react";

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

// ── Big Sky palette — HIGH CONTRAST ──
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

// ── Drive time estimates for Big Sky area ──
const HOME = "20 Moose Ridge Road, Big Sky, MT";

function estimateDriveMinutes(from: string, to: string): number | null {
  if (!from || !to) return null;
  const a = from.toLowerCase();
  const b = to.toLowerCase();
  if (a === b) return null;

  // Same general area
  const bothBigSky =
    (a.includes("big sky") || a.includes("moose ridge") || a.includes("lone mountain") || a.includes("lone peak")) &&
    (b.includes("big sky") || b.includes("moose ridge") || b.includes("lone mountain") || b.includes("lone peak"));
  if (bothBigSky) return 10;

  // Yellowstone trips
  const hasYellowstone = a.includes("yellowstone") || b.includes("yellowstone");
  const hasBigSky = a.includes("big sky") || a.includes("moose ridge") || b.includes("big sky") || b.includes("moose ridge");
  if (hasYellowstone && hasBigSky) return 90;
  if (hasYellowstone) return 45; // within yellowstone

  // Ennis
  const hasEnnis = a.includes("ennis") || b.includes("ennis");
  if (hasEnnis && hasBigSky) return 55;

  // Gallatin Gateway / Rainbow Ranch
  const hasGallatin = a.includes("gallatin gateway") || a.includes("rainbow ranch") || b.includes("gallatin gateway") || b.includes("rainbow ranch");
  if (hasGallatin && hasBigSky) return 25;

  // Bozeman / Airport
  const hasBozeman = a.includes("bozeman") || b.includes("bozeman") || a.includes("bzn") || b.includes("bzn");
  if (hasBozeman && hasBigSky) return 50;
  if (hasBozeman && hasYellowstone) return 90;

  // Ousel Falls from Big Sky
  const hasOusel = a.includes("ousel") || b.includes("ousel");
  if (hasOusel && hasBigSky) return 8;

  // Default: same town ~10, different areas ~25
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

function getDayDate(startDate: string | null, dayNumber: number) {
  if (!startDate) return null;
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNumber - 1);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="mb-5">
      <div className="border-t-[3px] mb-4" style={{ borderColor: RUST }} />
      <h2
        className="text-3xl sm:text-4xl font-black uppercase tracking-tight"
        style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
      >
        {title}
      </h2>
    </div>
  );
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
      className="flex items-center gap-3 px-5 py-2.5 mx-auto"
      style={{ maxWidth: "fit-content" }}
    >
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-3" style={{ backgroundColor: RUST, opacity: 0.3 }} />
        <span className="text-lg">🚗</span>
        <div className="w-0.5 h-3" style={{ backgroundColor: RUST, opacity: 0.3 }} />
      </div>
      <span className="text-lg font-bold" style={{ color: INK, opacity: 0.5 }}>
        ~{minutes} min drive
      </span>
      <span className="text-base underline underline-offset-2" style={{ color: RUST }}>
        Directions →
      </span>
    </a>
  );
}

type ViewMode = "schedule" | "reasoning";

export function ShareItinerary({ tripId }: { tripId: string }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("schedule");
  const [dayMapOpen, setDayMapOpen] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch(`/api/trips/${tripId}/share`)
      .then((r) => r.json())
      .then((json) => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tripId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <p className="text-xl font-semibold" style={{ color: INK }}>Loading itinerary...</p>
      </div>
    );
  }

  if (!data || !data.itinerary || data.blocks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: INK }}>No itinerary yet</p>
          <p className="text-lg mt-2 font-medium" style={{ color: INK, opacity: 0.6 }}>Check back soon!</p>
        </div>
      </div>
    );
  }

  const { trip, blocks, participants } = data;

  const dayGroups = blocks.reduce<Record<number, Block[]>>((acc, block) => {
    if (!acc[block.dayNumber]) acc[block.dayNumber] = [];
    acc[block.dayNumber].push(block);
    return acc;
  }, {});

  const totalCost = blocks.reduce((sum, b) => sum + (b.estimatedCost ? parseFloat(b.estimatedCost) : 0), 0);
  const activityBlocks = blocks.filter((b) => b.type === "activity");
  const mealBlocks = blocks.filter((b) => b.type === "meal");
  const altBlocks = blocks.filter((b) => b.title.includes("(Alt)"));
  const freeBlocks = blocks.filter((b) => b.type === "free_time");
  const names = participants.filter((p) => p.name && p.name !== "Test User").map((p) => p.name!);

  // Get unique, non-alt locations for a day (for map route)
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

  // Total driving for a day
  function getDayDriveTotal(dayBlocks: Block[]): number {
    const locs = getDayLocations(dayBlocks);
    let total = 0;
    for (let i = 1; i < locs.length; i++) {
      const mins = estimateDriveMinutes(locs[i - 1], locs[i]);
      if (mins) total += mins;
    }
    return total;
  }

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

      <div className="max-w-3xl mx-auto px-5 py-10 sm:px-8">
        {/* ═══ HOW WE BUILT THIS ═══ */}
        <section className="mb-12">
          <SectionDivider title="How We Built This" />
          <div
            className="p-6 sm:p-8 space-y-5"
            style={{ backgroundColor: CARD_BG, border: `2px solid ${RUST}`, borderRadius: "2px" }}
          >
            <p className="text-xl leading-relaxed font-semibold" style={{ color: INK }}>
              Everyone filled out the survey — <strong>{names.join(", ")}</strong>.
              We fed all {names.length} sets of preferences into an AI planner that
              optimized for one thing: <strong>make everybody happy</strong>.
            </p>
            <p className="text-xl leading-relaxed font-semibold" style={{ color: INK, opacity: 0.7 }}>
              Here&apos;s the logic:
            </p>
            <ul className="space-y-4">
              {[
                <><strong>Universal wins go first.</strong> If 5+ people said yes to something (Yellowstone, Farmers Market, Ousel Falls), it&apos;s on the main schedule.</>,
                <><strong>Polarizing activities get split tracks.</strong> If some people love it and others said hard no (horseback, rafting, golf), it&apos;s scheduled as an opt-in with an alternative at the same time. Nobody is forced, nobody misses out.</>,
                <><strong>Hard no&apos;s are respected.</strong> Mountain biking was a universal no — it&apos;s not on here. Anything someone said &quot;pass&quot; to, they always have an alternative.</>,
                <><strong>Built-in rest days.</strong> 8 days with ages 4–69 means we need breathing room. Days 6 and 7 start with free mornings.</>,
                <><strong>Tap any item</strong> to see the full description and why it was chosen.</>,
              ].map((content, i) => (
                <li key={i} className="flex gap-3 text-xl font-medium leading-relaxed" style={{ color: INK }}>
                  <span className="shrink-0 mt-1 text-2xl" style={{ color: RUST }}>•</span>
                  <span>{content}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { label: "Activities", value: activityBlocks.length, icon: "🏔" },
              { label: "Meals", value: mealBlocks.length, icon: "🍽" },
              { label: "Split Options", value: altBlocks.length, icon: "↔️" },
              { label: "Free Time", value: freeBlocks.length, icon: "☀️" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-4 text-center"
                style={{ backgroundColor: CARD_BG, border: `2px solid ${RUST}`, borderRadius: "2px" }}
              >
                <p className="text-2xl mb-1">{stat.icon}</p>
                <p className="text-4xl font-black" style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}>
                  {stat.value}
                </p>
                <p className="text-base font-bold uppercase tracking-wider mt-1" style={{ color: INK, opacity: 0.5 }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ VIEW TOGGLE ═══ */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "schedule" as const, label: "📋 Schedule" },
            { key: "reasoning" as const, label: "🧠 Why Each Choice" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key)}
              className="px-5 py-3 text-lg font-bold uppercase tracking-wider transition-all"
              style={{
                backgroundColor: viewMode === tab.key ? RUST : CARD_BG,
                color: viewMode === tab.key ? CREAM : INK,
                border: `2px solid ${RUST}`,
                borderRadius: "2px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ REASONING VIEW ═══ */}
        {viewMode === "reasoning" && (
          <div className="space-y-4 mb-12">
            {blocks
              .filter((b) => b.aiReasoning)
              .map((block) => {
                const isAlt = block.title.includes("(Alt)");
                return (
                  <div
                    key={block.id}
                    className="p-6"
                    style={{
                      backgroundColor: CARD_BG,
                      border: `2px solid ${isAlt ? MUSTARD : RUST}`,
                      borderRadius: "2px",
                      borderStyle: isAlt ? "dashed" : "solid",
                    }}
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-base font-bold" style={{ color: INK, opacity: 0.4 }}>
                        Day {block.dayNumber}
                      </span>
                      {isAlt && (
                        <span className="text-base font-bold" style={{ color: MUSTARD }}>
                          ALT
                        </span>
                      )}
                    </div>
                    <p
                      className="font-black uppercase text-xl leading-tight mb-3"
                      style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
                    >
                      {block.title}
                    </p>
                    <p className="text-xl leading-relaxed font-medium" style={{ color: INK }}>
                      {block.aiReasoning}
                    </p>
                  </div>
                );
              })}
          </div>
        )}

        {/* ═══ SCHEDULE VIEW ═══ */}
        {viewMode === "schedule" && (
          <>
            <SectionDivider title="The Itinerary" />

            {Object.entries(dayGroups)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([day, dayBlocks]) => {
                const dayDate = getDayDate(trip.startDate, Number(day));
                const sortedBlocks = dayBlocks.sort((a, b) => a.sortOrder - b.sortOrder);
                const dayLocs = getDayLocations(dayBlocks);
                const dayDriveTotal = getDayDriveTotal(dayBlocks);
                const isMapOpen = dayMapOpen[Number(day)] || false;

                return (
                  <div key={day} className="mb-12">
                    {/* Day header */}
                    <div className="sticky top-0 z-10 pb-4 pt-3" style={{ backgroundColor: CREAM }}>
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span
                          className="text-5xl font-black uppercase"
                          style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
                        >
                          Day {day}
                        </span>
                        {dayDate && (
                          <span className="text-xl font-bold uppercase tracking-wider" style={{ color: INK, opacity: 0.4 }}>
                            {dayDate}
                          </span>
                        )}
                      </div>

                      {/* Day drive total + map toggle */}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        {dayDriveTotal > 0 && (
                          <span className="text-lg font-bold" style={{ color: INK, opacity: 0.5 }}>
                            🚗 ~{dayDriveTotal} min total driving
                          </span>
                        )}
                        {dayLocs.length >= 2 && (
                          <>
                            <a
                              href={mapsDirectionsUrl(dayLocs)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-lg font-bold underline underline-offset-4"
                              style={{ color: RUST }}
                            >
                              Open full route →
                            </a>
                            <button
                              onClick={() => setDayMapOpen((prev) => ({ ...prev, [Number(day)]: !prev[Number(day)] }))}
                              className="text-lg font-bold px-4 py-1.5"
                              style={{
                                backgroundColor: isMapOpen ? RUST : CARD_BG,
                                color: isMapOpen ? CREAM : INK,
                                border: `2px solid ${RUST}`,
                                borderRadius: "2px",
                              }}
                            >
                              {isMapOpen ? "Hide Map" : "🗺 Show Map"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Embedded map */}
                    {isMapOpen && dayLocs.length >= 2 && (
                      <div className="mb-4" style={{ borderRadius: "2px", overflow: "hidden", border: `2px solid ${RUST}` }}>
                        <iframe
                          width="100%"
                          height="350"
                          style={{ border: 0 }}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps/embed/v1/directions?key=&origin=${encodeURIComponent(dayLocs[0])}&destination=${encodeURIComponent(dayLocs[dayLocs.length - 1])}${dayLocs.length > 2 ? `&waypoints=${dayLocs.slice(1, -1).map(encodeURIComponent).join("|")}` : ""}&mode=driving`}
                        />
                        <div className="px-4 py-3 text-center" style={{ backgroundColor: CARD_BG }}>
                          <a
                            href={mapsDirectionsUrl(dayLocs)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg font-bold underline underline-offset-4"
                            style={{ color: RUST }}
                          >
                            Open in Google Maps for turn-by-turn →
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Blocks with travel cards */}
                    <div className="space-y-0">
                      {sortedBlocks.map((block, idx) => {
                        const config = TYPE_CONFIG[block.type] || TYPE_CONFIG.note;
                        const isExpanded = expandedBlock === block.id;
                        const isAlt = block.title.includes("(Alt)");

                        // Show travel card between non-alt blocks with different locations
                        const prevBlock = idx > 0 ? sortedBlocks[idx - 1] : null;
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
                              <TravelCard
                                fromLocation={prevBlock!.location!}
                                toLocation={block.location!}
                              />
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
                              }}
                            >
                              {/* Top row */}
                              <div className="flex items-center gap-2.5 flex-wrap mb-2">
                                {block.startTime && (
                                  <span className="text-lg font-mono font-bold" style={{ color: INK, opacity: 0.6 }}>
                                    {block.startTime}{block.endTime && `–${block.endTime}`}
                                  </span>
                                )}
                                <span
                                  className="text-base px-3 py-1 font-bold uppercase tracking-wider"
                                  style={{ backgroundColor: config.bg, color: INK, border: `1.5px solid ${RUST}`, borderRadius: "2px" }}
                                >
                                  {config.icon} {config.label}
                                </span>
                                {isAlt && (
                                  <span
                                    className="text-base px-3 py-1 font-bold uppercase tracking-wider"
                                    style={{ backgroundColor: CREAM, color: INK, border: `1.5px solid ${MUSTARD}`, borderRadius: "2px" }}
                                  >
                                    ↔️ Alternative
                                  </span>
                                )}
                                {block.estimatedCost && parseFloat(block.estimatedCost) > 0 && (
                                  <span className="text-lg font-bold ml-auto" style={{ color: INK, opacity: 0.45 }}>
                                    ~${block.estimatedCost}
                                  </span>
                                )}
                              </div>

                              {/* Title */}
                              <p
                                className="font-black uppercase text-2xl leading-tight"
                                style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif", letterSpacing: "-0.01em" }}
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
                                  className="inline-block text-lg mt-1.5 font-semibold underline underline-offset-4 decoration-1"
                                  style={{ color: INK, opacity: 0.7 }}
                                >
                                  📍 {block.location} →
                                </a>
                              )}

                              {/* Expanded */}
                              {isExpanded && (
                                <div className="mt-4 space-y-3">
                                  {block.description && (
                                    <p className="text-xl leading-relaxed font-medium" style={{ color: INK }}>
                                      {block.description}
                                    </p>
                                  )}
                                  {block.aiReasoning && (
                                    <div className="px-5 py-4" style={{ backgroundColor: MUSTARD, borderRadius: "2px" }}>
                                      <p className="text-base font-black uppercase tracking-wider mb-1.5" style={{ color: INK, opacity: 0.5 }}>
                                        Why this made the cut
                                      </p>
                                      <p className="text-xl leading-relaxed font-semibold" style={{ color: INK }}>
                                        {block.aiReasoning}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </>
        )}

        {/* ═══ FOOTER ═══ */}
        <div className="mt-6 mb-16">
          <div className="p-6" style={{ backgroundColor: RUST, borderRadius: "2px" }}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xl font-black uppercase tracking-wider" style={{ color: MUSTARD }}>
                  Trip Total
                </p>
                <p className="text-lg mt-1 font-medium" style={{ color: CREAM, opacity: 0.7 }}>
                  {blocks.length} items across {Object.keys(dayGroups).length} days
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black" style={{ color: CREAM, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}>
                  ~${totalCost.toLocaleString()}
                </p>
                <p className="text-lg font-medium" style={{ color: CREAM, opacity: 0.6 }}>
                  estimated for group
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
