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

// ── Big Sky palette (matches intake board) ──
const RUST = "#D14F36";
const MUSTARD = "#EBB644";
const CREAM = "#F3EBE0";
const CARD_BG = "#EBE1D3";

const TYPE_CONFIG: Record<
  string,
  { icon: string; label: string; bg: string; border: string }
> = {
  activity: { icon: "🏔", label: "Activity", bg: MUSTARD, border: RUST },
  meal: { icon: "🍽", label: "Meal", bg: "#E8D5B8", border: RUST },
  transport: { icon: "🚗", label: "Transport", bg: CARD_BG, border: RUST },
  lodging: { icon: "🏠", label: "Lodging", bg: CARD_BG, border: RUST },
  free_time: { icon: "☀️", label: "Free Time", bg: "#E5DDD0", border: RUST },
  note: { icon: "📝", label: "Note", bg: CARD_BG, border: RUST },
};

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
    <div className="mb-4">
      <div className="border-t-2 mb-3" style={{ borderColor: RUST }} />
      <h2
        className="text-xl sm:text-2xl font-black uppercase tracking-tight"
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
        <p className="text-base font-medium" style={{ color: RUST, opacity: 0.6 }}>
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
          <p className="text-lg font-bold" style={{ color: RUST }}>
            No itinerary yet
          </p>
          <p className="text-base mt-1 font-medium" style={{ color: RUST, opacity: 0.5 }}>
            Check back soon!
          </p>
        </div>
      </div>
    );
  }

  const { trip, blocks, participants } = data;

  // Group blocks by day
  const dayGroups = blocks.reduce<Record<number, Block[]>>((acc, block) => {
    if (!acc[block.dayNumber]) acc[block.dayNumber] = [];
    acc[block.dayNumber].push(block);
    return acc;
  }, {});

  // Cost totals
  const totalCost = blocks.reduce(
    (sum, b) => sum + (b.estimatedCost ? parseFloat(b.estimatedCost) : 0),
    0
  );

  // Stats for the "how we built this" section
  const activityBlocks = blocks.filter((b) => b.type === "activity");
  const mealBlocks = blocks.filter((b) => b.type === "meal");
  const altBlocks = blocks.filter((b) => b.title.includes("(Alt)"));
  const freeBlocks = blocks.filter((b) => b.type === "free_time");
  const names = participants
    .filter((p) => p.name && p.name !== "Test User")
    .map((p) => p.name!);

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      {/* ═══════════════════════════════════════════════ */}
      {/* HEADER                                          */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="px-5 py-6 sm:px-10 sm:py-8" style={{ backgroundColor: RUST }}>
        <p
          className="text-base font-bold uppercase tracking-widest mb-3"
          style={{ color: MUSTARD, opacity: 0.85 }}
        >
          Goble Family
        </p>
        <h1
          className="text-5xl sm:text-7xl font-black uppercase leading-none"
          style={{
            color: CREAM,
            fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
            textShadow: `3px 3px 0 ${MUSTARD}`,
            letterSpacing: "-0.02em",
          }}
        >
          BIG SKY
        </h1>
        <p className="text-lg sm:text-2xl font-bold mt-2" style={{ color: CREAM, opacity: 0.9 }}>
          July 18 — 25, 2026
        </p>
        <p className="text-base mt-1 font-medium" style={{ color: CREAM, opacity: 0.6 }}>
          20 Moose Ridge Road, Big Sky, MT
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        {/* ═══════════════════════════════════════════════ */}
        {/* HOW WE BUILT THIS                               */}
        {/* ═══════════════════════════════════════════════ */}
        <section className="mb-10">
          <SectionDivider title="How We Built This" />
          <div
            className="p-5 space-y-4"
            style={{
              backgroundColor: CARD_BG,
              border: `1.5px solid ${RUST}`,
              borderRadius: "2px",
            }}
          >
            <p className="text-base leading-relaxed font-medium" style={{ color: RUST }}>
              Everyone filled out the survey — <strong>{names.join(", ")}</strong>.
              We fed all {names.length} sets of preferences into an AI planner that
              optimized for one thing: <strong>make everybody happy</strong>.
            </p>
            <p className="text-base leading-relaxed font-medium" style={{ color: RUST, opacity: 0.8 }}>
              Here&apos;s the logic:
            </p>
            <ul className="space-y-3">
              <li className="flex gap-3 text-base font-medium" style={{ color: RUST }}>
                <span className="shrink-0 mt-0.5" style={{ opacity: 0.4 }}>•</span>
                <span>
                  <strong>Universal wins go first.</strong> If 5+ people said yes to
                  something (Yellowstone, Farmers Market, Ousel Falls), it&apos;s on the
                  main schedule.
                </span>
              </li>
              <li className="flex gap-3 text-base font-medium" style={{ color: RUST }}>
                <span className="shrink-0 mt-0.5" style={{ opacity: 0.4 }}>•</span>
                <span>
                  <strong>Polarizing activities get split tracks.</strong> If some people
                  love it and others said hard no (horseback, rafting, golf), it&apos;s
                  scheduled as an opt-in with an alternative at the same time. Nobody is
                  forced, nobody misses out.
                </span>
              </li>
              <li className="flex gap-3 text-base font-medium" style={{ color: RUST }}>
                <span className="shrink-0 mt-0.5" style={{ opacity: 0.4 }}>•</span>
                <span>
                  <strong>Hard no&apos;s are respected.</strong> Mountain biking was a
                  universal no — it&apos;s not on here. Anything someone said &quot;pass&quot;
                  to, they always have an alternative.
                </span>
              </li>
              <li className="flex gap-3 text-base font-medium" style={{ color: RUST }}>
                <span className="shrink-0 mt-0.5" style={{ opacity: 0.4 }}>•</span>
                <span>
                  <strong>Built-in rest days.</strong> 8 days with ages 4–69 means we need
                  breathing room. Days 6 and 7 start with free mornings.
                </span>
              </li>
              <li className="flex gap-3 text-base font-medium" style={{ color: RUST }}>
                <span className="shrink-0 mt-0.5" style={{ opacity: 0.4 }}>•</span>
                <span>
                  <strong>Tap any item</strong> to see the full description and why
                  it was chosen.
                </span>
              </li>
            </ul>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { label: "Activities", value: activityBlocks.length, icon: "🏔" },
              { label: "Meals", value: mealBlocks.length, icon: "🍽" },
              { label: "Split Options", value: altBlocks.length, icon: "↔️" },
              { label: "Free Time", value: freeBlocks.length, icon: "☀️" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-3 text-center"
                style={{
                  backgroundColor: CARD_BG,
                  border: `1.5px solid ${RUST}`,
                  borderRadius: "2px",
                }}
              >
                <p className="text-xl mb-0.5">{stat.icon}</p>
                <p
                  className="text-2xl font-black"
                  style={{
                    color: RUST,
                    fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
                  }}
                >
                  {stat.value}
                </p>
                <p className="text-sm font-bold uppercase tracking-wider" style={{ color: RUST, opacity: 0.5 }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* THE ITINERARY                                   */}
        {/* ═══════════════════════════════════════════════ */}
        <SectionDivider title="The Itinerary" />

        {Object.entries(dayGroups)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([day, dayBlocks]) => {
            const dayDate = getDayDate(trip.startDate, Number(day));
            return (
              <div key={day} className="mb-10">
                {/* Day header */}
                <div
                  className="sticky top-0 z-10 pb-3 pt-2"
                  style={{ backgroundColor: CREAM }}
                >
                  <div className="flex items-baseline gap-3">
                    <span
                      className="text-4xl font-black uppercase"
                      style={{
                        color: RUST,
                        fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
                      }}
                    >
                      Day {day}
                    </span>
                    {dayDate && (
                      <span
                        className="text-base font-bold uppercase tracking-wider"
                        style={{ color: RUST, opacity: 0.4 }}
                      >
                        {dayDate}
                      </span>
                    )}
                  </div>
                </div>

                {/* Blocks */}
                <div className="space-y-3">
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
                            border: `1.5px solid ${isAlt ? MUSTARD : RUST}`,
                            borderRadius: "2px",
                            borderStyle: isAlt ? "dashed" : "solid",
                            padding: "1rem 1.25rem",
                            marginLeft: isAlt ? "1.5rem" : 0,
                            opacity: isAlt && !isExpanded ? 0.75 : 1,
                          }}
                        >
                          {/* Top row: time + badge + cost */}
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            {block.startTime && (
                              <span
                                className="text-sm font-mono font-bold"
                                style={{ color: RUST, opacity: 0.5 }}
                              >
                                {block.startTime}
                                {block.endTime && `–${block.endTime}`}
                              </span>
                            )}
                            <span
                              className="text-xs px-2 py-0.5 font-bold uppercase tracking-wider"
                              style={{
                                backgroundColor: config.bg,
                                color: RUST,
                                border: `1px solid ${config.border}`,
                                borderRadius: "2px",
                              }}
                            >
                              {config.icon} {config.label}
                            </span>
                            {isAlt && (
                              <span
                                className="text-xs px-2 py-0.5 font-bold uppercase tracking-wider"
                                style={{
                                  backgroundColor: CREAM,
                                  color: RUST,
                                  border: `1px solid ${MUSTARD}`,
                                  borderRadius: "2px",
                                }}
                              >
                                ↔️ Alternative
                              </span>
                            )}
                            {block.estimatedCost &&
                              parseFloat(block.estimatedCost) > 0 && (
                                <span
                                  className="text-sm font-bold ml-auto"
                                  style={{ color: RUST, opacity: 0.4 }}
                                >
                                  ~${block.estimatedCost}
                                </span>
                              )}
                          </div>

                          {/* Title */}
                          <p
                            className="font-black uppercase text-lg leading-tight"
                            style={{
                              color: RUST,
                              fontFamily:
                                "'Arial Black', Impact, 'system-ui', sans-serif",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {block.title}
                          </p>

                          {/* Location */}
                          {block.location && (
                            <p
                              className="text-sm mt-1 font-medium"
                              style={{ color: RUST, opacity: 0.5 }}
                            >
                              {block.location}
                            </p>
                          )}

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="mt-3 space-y-2.5">
                              {block.description && (
                                <p
                                  className="text-base leading-relaxed font-medium"
                                  style={{ color: RUST, opacity: 0.8 }}
                                >
                                  {block.description}
                                </p>
                              )}
                              {block.aiReasoning && (
                                <div
                                  className="px-3 py-2.5"
                                  style={{
                                    backgroundColor: MUSTARD,
                                    borderRadius: "2px",
                                  }}
                                >
                                  <p
                                    className="text-sm font-black uppercase tracking-wider mb-1"
                                    style={{ color: RUST, opacity: 0.6 }}
                                  >
                                    Why this made the cut
                                  </p>
                                  <p
                                    className="text-base leading-relaxed font-semibold"
                                    style={{ color: RUST }}
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

        {/* ═══════════════════════════════════════════════ */}
        {/* TRIP SUMMARY FOOTER                             */}
        {/* ═══════════════════════════════════════════════ */}
        <div className="mt-4 mb-16">
          <div
            className="p-5"
            style={{
              backgroundColor: RUST,
              borderRadius: "2px",
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <p
                  className="text-base font-black uppercase tracking-wider"
                  style={{ color: MUSTARD }}
                >
                  Trip Total
                </p>
                <p className="text-sm mt-0.5 font-medium" style={{ color: CREAM, opacity: 0.6 }}>
                  {blocks.length} items across {Object.keys(dayGroups).length} days
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-3xl font-black"
                  style={{
                    color: CREAM,
                    fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
                  }}
                >
                  ~${totalCost.toLocaleString()}
                </p>
                <p className="text-sm font-medium" style={{ color: CREAM, opacity: 0.5 }}>
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
