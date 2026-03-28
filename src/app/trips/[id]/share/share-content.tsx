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
const INK = "#3B1A0F"; // near-black brown for body text
const RUST = "#D14F36"; // accent for headers, borders
const MUSTARD = "#EBB644";
const CREAM = "#F3EBE0";
const CARD_BG = "#EBE1D3";

const TYPE_CONFIG: Record<
  string,
  { icon: string; label: string; bg: string }
> = {
  activity: { icon: "🏔", label: "Activity", bg: MUSTARD },
  meal: { icon: "🍽", label: "Meal", bg: "#E8D5B8" },
  transport: { icon: "🚗", label: "Transport", bg: CARD_BG },
  lodging: { icon: "🏠", label: "Lodging", bg: CARD_BG },
  free_time: { icon: "☀️", label: "Free Time", bg: "#E5DDD0" },
  note: { icon: "📝", label: "Note", bg: CARD_BG },
};

function mapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
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
        style={{
          color: RUST,
          fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
        }}
      >
        {title}
      </h2>
    </div>
  );
}

export function ShareItinerary({ tripId }: { tripId: string }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/trips/${tripId}/share`)
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tripId]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: CREAM }}
      >
        <p className="text-xl font-semibold" style={{ color: INK }}>
          Loading itinerary...
        </p>
      </div>
    );
  }

  if (!data || !data.itinerary || data.blocks.length === 0) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: CREAM }}
      >
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: INK }}>
            No itinerary yet
          </p>
          <p className="text-lg mt-2 font-medium" style={{ color: INK, opacity: 0.6 }}>
            Check back soon!
          </p>
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

  const totalCost = blocks.reduce(
    (sum, b) => sum + (b.estimatedCost ? parseFloat(b.estimatedCost) : 0),
    0
  );

  const activityBlocks = blocks.filter((b) => b.type === "activity");
  const mealBlocks = blocks.filter((b) => b.type === "meal");
  const altBlocks = blocks.filter((b) => b.title.includes("(Alt)"));
  const freeBlocks = blocks.filter((b) => b.type === "free_time");
  const names = participants
    .filter((p) => p.name && p.name !== "Test User")
    .map((p) => p.name!);

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      {/* ═══ HEADER ═══ */}
      <div className="px-5 py-8 sm:px-10 sm:py-10" style={{ backgroundColor: RUST }}>
        <p
          className="text-lg font-bold uppercase tracking-widest mb-3"
          style={{ color: MUSTARD }}
        >
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
        <p
          className="text-xl sm:text-3xl font-bold mt-3"
          style={{ color: CREAM }}
        >
          July 18 — 25, 2026
        </p>
        <a
          href={mapsUrl("20 Moose Ridge Road, Big Sky, MT")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-lg mt-2 font-medium underline underline-offset-4 decoration-1"
          style={{ color: CREAM, opacity: 0.8 }}
        >
          20 Moose Ridge Road, Big Sky, MT →
        </a>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-10 sm:px-8">
        {/* ═══ HOW WE BUILT THIS ═══ */}
        <section className="mb-12">
          <SectionDivider title="How We Built This" />
          <div
            className="p-6 sm:p-8 space-y-5"
            style={{
              backgroundColor: CARD_BG,
              border: `2px solid ${RUST}`,
              borderRadius: "2px",
            }}
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
                <>
                  <strong>Universal wins go first.</strong> If 5+ people said yes to
                  something (Yellowstone, Farmers Market, Ousel Falls), it&apos;s on the
                  main schedule.
                </>,
                <>
                  <strong>Polarizing activities get split tracks.</strong> If some people
                  love it and others said hard no (horseback, rafting, golf), it&apos;s
                  scheduled as an opt-in with an alternative at the same time. Nobody is
                  forced, nobody misses out.
                </>,
                <>
                  <strong>Hard no&apos;s are respected.</strong> Mountain biking was a
                  universal no — it&apos;s not on here. Anything someone said &quot;pass&quot;
                  to, they always have an alternative.
                </>,
                <>
                  <strong>Built-in rest days.</strong> 8 days with ages 4–69 means we need
                  breathing room. Days 6 and 7 start with free mornings.
                </>,
                <>
                  <strong>Tap any item</strong> to see the full description and why
                  it was chosen.
                </>,
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
                style={{
                  backgroundColor: CARD_BG,
                  border: `2px solid ${RUST}`,
                  borderRadius: "2px",
                }}
              >
                <p className="text-2xl mb-1">{stat.icon}</p>
                <p
                  className="text-4xl font-black"
                  style={{
                    color: RUST,
                    fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
                  }}
                >
                  {stat.value}
                </p>
                <p className="text-base font-bold uppercase tracking-wider mt-1" style={{ color: INK, opacity: 0.5 }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ THE ITINERARY ═══ */}
        <SectionDivider title="The Itinerary" />

        {Object.entries(dayGroups)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([day, dayBlocks]) => {
            const dayDate = getDayDate(trip.startDate, Number(day));
            return (
              <div key={day} className="mb-12">
                {/* Day header */}
                <div
                  className="sticky top-0 z-10 pb-4 pt-3"
                  style={{ backgroundColor: CREAM }}
                >
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span
                      className="text-5xl font-black uppercase"
                      style={{
                        color: RUST,
                        fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
                      }}
                    >
                      Day {day}
                    </span>
                    {dayDate && (
                      <span
                        className="text-xl font-bold uppercase tracking-wider"
                        style={{ color: INK, opacity: 0.4 }}
                      >
                        {dayDate}
                      </span>
                    )}
                  </div>
                </div>

                {/* Blocks */}
                <div className="space-y-4">
                  {dayBlocks
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((block) => {
                      const config = TYPE_CONFIG[block.type] || TYPE_CONFIG.note;
                      const isExpanded = expandedBlock === block.id;
                      const isAlt = block.title.includes("(Alt)");

                      return (
                        <div
                          key={block.id}
                          onClick={() =>
                            setExpandedBlock(isExpanded ? null : block.id)
                          }
                          className="cursor-pointer transition-opacity"
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
                          {/* Top row: time + badge + cost */}
                          <div className="flex items-center gap-2.5 flex-wrap mb-2">
                            {block.startTime && (
                              <span
                                className="text-lg font-mono font-bold"
                                style={{ color: INK, opacity: 0.6 }}
                              >
                                {block.startTime}
                                {block.endTime && `–${block.endTime}`}
                              </span>
                            )}
                            <span
                              className="text-base px-3 py-1 font-bold uppercase tracking-wider"
                              style={{
                                backgroundColor: config.bg,
                                color: INK,
                                border: `1.5px solid ${RUST}`,
                                borderRadius: "2px",
                              }}
                            >
                              {config.icon} {config.label}
                            </span>
                            {isAlt && (
                              <span
                                className="text-base px-3 py-1 font-bold uppercase tracking-wider"
                                style={{
                                  backgroundColor: CREAM,
                                  color: INK,
                                  border: `1.5px solid ${MUSTARD}`,
                                  borderRadius: "2px",
                                }}
                              >
                                ↔️ Alternative
                              </span>
                            )}
                            {block.estimatedCost &&
                              parseFloat(block.estimatedCost) > 0 && (
                                <span
                                  className="text-lg font-bold ml-auto"
                                  style={{ color: INK, opacity: 0.45 }}
                                >
                                  ~${block.estimatedCost}
                                </span>
                              )}
                          </div>

                          {/* Title */}
                          <p
                            className="font-black uppercase text-2xl leading-tight"
                            style={{
                              color: RUST,
                              fontFamily:
                                "'Arial Black', Impact, 'system-ui', sans-serif",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {block.title}
                          </p>

                          {/* Location — always visible, clickable Google Maps link */}
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

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="mt-4 space-y-3">
                              {block.description && (
                                <p
                                  className="text-xl leading-relaxed font-medium"
                                  style={{ color: INK }}
                                >
                                  {block.description}
                                </p>
                              )}
                              {block.aiReasoning && (
                                <div
                                  className="px-5 py-4"
                                  style={{
                                    backgroundColor: MUSTARD,
                                    borderRadius: "2px",
                                  }}
                                >
                                  <p
                                    className="text-base font-black uppercase tracking-wider mb-1.5"
                                    style={{ color: INK, opacity: 0.5 }}
                                  >
                                    Why this made the cut
                                  </p>
                                  <p
                                    className="text-xl leading-relaxed font-semibold"
                                    style={{ color: INK }}
                                  >
                                    {block.aiReasoning}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}

        {/* ═══ TRIP SUMMARY FOOTER ═══ */}
        <div className="mt-6 mb-16">
          <div
            className="p-6"
            style={{
              backgroundColor: RUST,
              borderRadius: "2px",
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <p
                  className="text-xl font-black uppercase tracking-wider"
                  style={{ color: MUSTARD }}
                >
                  Trip Total
                </p>
                <p className="text-lg mt-1 font-medium" style={{ color: CREAM, opacity: 0.7 }}>
                  {blocks.length} items across {Object.keys(dayGroups).length} days
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-4xl font-black"
                  style={{
                    color: CREAM,
                    fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
                  }}
                >
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
