"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Block,
  ShareData,
  INK,
  RUST,
  MUSTARD,
  CREAM,
  CARD_BG,
  TYPE_CONFIG,
  mapsUrl,
  mapsDirectionsUrl,
  formatTime,
  getDayDate,
  formatDayDate,
  getDayLocations,
  getDayDriveTotal,
  TravelCard,
} from "@/lib/itinerary-shared";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HeroSection } from "@/components/itinerary/hero-section";
import { FeedbackInbox } from "@/components/itinerary/feedback-inbox";
import { MapTab } from "@/components/itinerary/map-tab";
import { OpsTab } from "@/components/itinerary/ops-tab";
import { type FeedbackItem, type SignOff, type Participant } from "@/lib/itinerary-shared";

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

function SortableBlock({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex">
        <button
          {...attributes}
          {...listeners}
          className="flex items-center px-2 cursor-grab active:cursor-grabbing touch-none"
          style={{ color: INK, opacity: 0.35 }}
          title="Drag to reorder"
        >
          <span className="text-xl">&#x2807;</span>
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

type ViewMode = "schedule" | "reasoning";
type EditorTab = "agenda" | "map" | "ops";

export function ReviewItinerary({ tripId }: { tripId: string }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("schedule");
  const [dayMapOpen, setDayMapOpen] = useState<Record<number, boolean>>({});

  // Host curation state
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Block>>({});
  const [saving, setSaving] = useState(false);
  const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>("agenda");
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [signOffs, setSignOffs] = useState<SignOff[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchData = useCallback(() => {
    fetch(`/api/trips/${tripId}/share`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((json) => { setData(json); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [tripId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!data) return;
    Promise.all([
      fetch(`/api/trips/${tripId}/feedback`).then((r) => r.json()),
      fetch(`/api/trips/${tripId}/sign-offs`).then((r) => r.json()),
    ]).then(([fb, so]) => {
      setFeedbackItems(fb);
      setSignOffs(so);
    }).catch(() => {});
  }, [data, tripId]);

  // ── Pin/Unpin ──
  async function togglePin(blockId: string) {
    const res = await fetch(`/api/trips/${tripId}/blocks/${blockId}/pin`, { method: "PATCH" });
    if (!res.ok) return;
    const { pinned } = await res.json();
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        blocks: prev.blocks.map((b) => (b.id === blockId ? { ...b, pinned } : b)),
      };
    });
  }

  // ── Edit ──
  function startEditing(block: Block) {
    setEditingBlock(block.id);
    setEditForm({
      title: block.title,
      description: block.description,
      startTime: block.startTime,
      endTime: block.endTime,
      location: block.location,
    });
  }

  function cancelEditing() {
    setEditingBlock(null);
    setEditForm({});
  }

  async function saveEdit(blockId: string) {
    setSaving(true);
    const res = await fetch(`/api/trips/${tripId}/blocks/${blockId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const { block: updated } = await res.json();
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          blocks: prev.blocks.map((b) =>
            b.id === blockId
              ? { ...b, title: updated.title, description: updated.description, startTime: updated.startTime, endTime: updated.endTime, location: updated.location }
              : b
          ),
        };
      });
      setEditingBlock(null);
      setEditForm({});
    }
    setSaving(false);
  }

  // ── Drag-to-reorder ──
  function handleDragEnd(dayNumber: number) {
    return (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !data) return;

      const dayBlocks = data.blocks
        .filter((b) => b.dayNumber === dayNumber)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const oldIndex = dayBlocks.findIndex((b) => b.id === active.id);
      const newIndex = dayBlocks.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(dayBlocks, oldIndex, newIndex);
      const newBlockIds = reordered.map((b) => b.id);

      // Optimistic update
      setData((prev) => {
        if (!prev) return prev;
        const updated = prev.blocks.map((b) => {
          if (b.dayNumber !== dayNumber) return b;
          const newOrder = newBlockIds.indexOf(b.id);
          return newOrder >= 0 ? { ...b, sortOrder: newOrder + 1 } : b;
        });
        return { ...prev, blocks: updated };
      });

      // Persist
      fetch(`/api/trips/${tripId}/blocks/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockIds: newBlockIds }),
      });
    };
  }

  // ── Regen Day ──
  async function regenDay(dayNumber: number) {
    setRegeneratingDay(dayNumber);
    try {
      const res = await fetch(`/api/trips/${tripId}/generate-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayNumber }),
      });
      if (res.ok && res.body) {
        // Consume the stream to completion
        const reader = res.body.getReader();
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }
      // Refetch all data
      const shareRes = await fetch(`/api/trips/${tripId}/share`);
      if (shareRes.ok) {
        const json = await shareRes.json();
        setData(json);
      }
    } finally {
      setRegeneratingDay(null);
    }
  }

  async function handleFeedbackAction(feedbackId: string, action: "accepted" | "dismissed", adminNote?: string) {
    const res = await fetch(`/api/trips/${tripId}/feedback/${feedbackId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action, adminNote }),
    });
    if (res.ok) {
      setFeedbackItems((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, status: action, adminNote: adminNote || f.adminNote } : f))
      );
    }
  }

  async function handleFinalize() {
    if (!confirm("This will mark the plan as final for all guests. Continue?")) return;
    const res = await fetch(`/api/trips/${tripId}/finalize`, { method: "PATCH" });
    if (res.ok) fetchData();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <p className="text-xl font-semibold" style={{ color: INK }}>Loading itinerary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: INK }}>Something went wrong</p>
          <p className="text-lg mt-2 font-medium" style={{ color: INK, opacity: 0.6 }}>Try refreshing the page.</p>
        </div>
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

  const inputStyle: React.CSSProperties = {
    backgroundColor: CREAM,
    border: `2px solid ${RUST}`,
    borderRadius: "2px",
    color: INK,
    padding: "0.5rem 0.75rem",
    fontSize: "1rem",
    fontWeight: 600,
    width: "100%",
  };

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      {/* ═══ HEADER ═══ */}
      <HeroSection
        title="BIG SKY"
        subtitle="Goble Family · Est. 2026"
        kicker="Editor — review and refine the plan"
        dateLabel="July 18 — 25, 2026"
        daysToGo={(() => {
          const tripDate = trip.startDate ? new Date(trip.startDate) : new Date("2026-07-18");
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diff = Math.ceil((tripDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return diff > 0 ? diff : 0;
        })()}
      />

      {/* Admin action bar */}
      <div
        className="flex gap-3 px-5 py-3 sm:px-8"
        style={{ background: CREAM, borderBottom: `1px solid rgba(59,26,15,0.1)` }}
      >
        <a
          href={`/trips/${tripId}/share`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all hover:scale-105"
          style={{
            background: MUSTARD,
            color: INK,
            border: `1.5px solid ${RUST}`,
            fontFamily: "'Arial Black', Impact, sans-serif",
          }}
        >
          👁 Preview as Guest
        </a>
        <a
          href={`/api/trips/${tripId}/ops/doc`}
          className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all hover:scale-105"
          style={{
            background: CREAM,
            color: INK,
            border: `1.5px solid ${RUST}`,
            fontFamily: "'Arial Black', Impact, sans-serif",
          }}
        >
          📋 Ops Doc
        </a>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-10 sm:px-8">
        {/* ═══ HOST REVIEW — FULL REASONING ═══ */}
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
                <p className="text-lg font-bold uppercase tracking-wider mt-1" style={{ color: INK, opacity: 0.55 }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ TAB BAR ═══ */}
        <div className="flex gap-2 mb-6 items-center">
          {(["agenda", "map", "ops"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide transition-colors"
              style={{
                background: activeTab === tab ? RUST : CREAM,
                color: activeTab === tab ? "white" : INK,
              }}
            >
              {tab === "agenda" ? "Agenda" : tab === "map" ? "Map" : "Ops"}
              {tab === "ops" && feedbackItems.filter((f) => f.status === "pending").length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs" style={{ background: MUSTARD, color: INK }}>
                  {feedbackItems.filter((f) => f.status === "pending").length}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={handleFinalize}
            className="ml-auto px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide"
            style={{ background: "#4CAF50", color: "white" }}
          >
            Finalize
          </button>
        </div>

        {activeTab === "agenda" && (
          <FeedbackInbox items={feedbackItems} onAction={handleFeedbackAction} />
        )}

        {activeTab === "agenda" && (
          <>
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
                      <span className="text-lg font-bold" style={{ color: INK, opacity: 0.5 }}>
                        Day {block.dayNumber}
                      </span>
                      {isAlt && (
                        <span className="text-lg font-bold" style={{ color: MUSTARD }}>
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
                const dayNum = Number(day);
                const dayDate = getDayDate(trip.startDate, dayNum);
                const sortedBlocks = dayBlocks.sort((a, b) => a.sortOrder - b.sortOrder);
                const dayLocs = getDayLocations(dayBlocks);
                const dayDriveTotal = getDayDriveTotal(dayBlocks);
                const isMapOpen = dayMapOpen[dayNum] || false;
                const isRegenerating = regeneratingDay === dayNum;

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
                          <span
                            className="text-base italic"
                            style={{
                              color: INK,
                              opacity: 0.55,
                              fontFamily: "var(--font-fraunces), Georgia, serif",
                            }}
                          >
                            {formatDayDate(dayDate)}
                          </span>
                        )}
                      </div>

                      {/* Day drive total + map toggle + regen button */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {dayDriveTotal > 0 && (
                          <span
                            className="text-sm italic"
                            style={{
                              color: INK,
                              opacity: 0.5,
                              fontFamily: "var(--font-fraunces), Georgia, serif",
                            }}
                          >
                            ~{dayDriveTotal} min total driving
                          </span>
                        )}
                        {dayLocs.length >= 2 && (
                          <>
                            <a
                              href={mapsDirectionsUrl(dayLocs)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-full transition-all hover:scale-105"
                              style={{
                                background: CREAM,
                                border: `1.5px solid ${RUST}`,
                                color: INK,
                                fontFamily: "'Arial Black', Impact, sans-serif",
                                fontSize: "10px",
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                              }}
                            >
                              🗺 Route
                            </a>
                            <button
                              onClick={() => setDayMapOpen((prev) => ({ ...prev, [dayNum]: !prev[dayNum] }))}
                              className="px-3 py-1.5 rounded-full transition-all hover:scale-105"
                              style={{
                                background: isMapOpen ? RUST : CREAM,
                                color: isMapOpen ? CREAM : INK,
                                border: `1.5px solid ${RUST}`,
                                fontFamily: "'Arial Black', Impact, sans-serif",
                                fontSize: "10px",
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                              }}
                            >
                              {isMapOpen ? "Hide Map" : "Map"}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => regenDay(dayNum)}
                          disabled={regeneratingDay !== null}
                          className="px-3 py-1.5 rounded-full transition-all hover:scale-105"
                          style={{
                            background: isRegenerating ? MUSTARD : CREAM,
                            color: INK,
                            border: `1.5px solid ${RUST}`,
                            fontFamily: "'Arial Black', Impact, sans-serif",
                            fontSize: "10px",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            opacity: regeneratingDay !== null && !isRegenerating ? 0.4 : 1,
                            cursor: regeneratingDay !== null ? "not-allowed" : "pointer",
                          }}
                        >
                          {isRegenerating ? "Regenerating..." : "🔄 Regen Day"}
                        </button>
                      </div>
                    </div>

                    {/* Map link panel */}
                    {isMapOpen && dayLocs.length >= 2 && (
                      <div className="mb-4 px-5 py-4 text-center" style={{ backgroundColor: CARD_BG, border: `2px solid ${RUST}`, borderRadius: "2px" }}>
                        <p className="text-lg font-bold mb-2" style={{ color: INK }}>
                          {dayLocs.length} stops on this day
                        </p>
                        <a
                          href={mapsDirectionsUrl(dayLocs)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-lg font-bold px-5 py-3 underline underline-offset-4"
                          style={{ color: RUST }}
                        >
                          Open full route in Google Maps →
                        </a>
                      </div>
                    )}

                    {/* Blocks with travel cards + drag-to-reorder */}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd(dayNum)}
                    >
                      <SortableContext
                        items={sortedBlocks.map((b) => b.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-0">
                          {sortedBlocks.map((block, idx) => {
                            const config = TYPE_CONFIG[block.type] || TYPE_CONFIG.note;
                            const isExpanded = expandedBlock === block.id;
                            const isAlt = block.title.includes("(Alt)");
                            const isEditing = editingBlock === block.id;

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
                              <SortableBlock key={block.id} id={block.id}>
                                {showTravel && (
                                  <TravelCard
                                    fromLocation={prevBlock!.location!}
                                    toLocation={block.location!}
                                  />
                                )}
                                <div
                                  onClick={() => {
                                    if (!isEditing) setExpandedBlock(isExpanded ? null : block.id);
                                  }}
                                  className="cursor-pointer transition-opacity mb-4"
                                  style={{
                                    backgroundColor: CARD_BG,
                                    border: `2px solid ${isAlt ? MUSTARD : RUST}`,
                                    borderLeft: block.pinned ? `4px solid ${MUSTARD}` : (isAlt ? `2px dashed ${MUSTARD}` : `2px solid ${RUST}`),
                                    borderRadius: "2px",
                                    borderStyle: isAlt ? "dashed" : "solid",
                                    padding: "1.5rem 1.75rem",
                                    marginLeft: isAlt ? "1.5rem" : 0,
                                    opacity: isAlt && !isExpanded ? 0.8 : 1,
                                    overflow: "hidden",
                                  }}
                                >
                                  {/* ── Block toolbar ── */}
                                  <div className="flex items-center gap-2 mb-3">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); togglePin(block.id); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:scale-105"
                                      style={{
                                        background: block.pinned ? MUSTARD : CREAM,
                                        border: `1.5px solid ${RUST}`,
                                        color: INK,
                                        fontFamily: "'Arial Black', Impact, sans-serif",
                                        fontSize: "10px",
                                        letterSpacing: "0.1em",
                                        textTransform: "uppercase" as const,
                                      }}
                                    >
                                      <span style={{ fontSize: "12px" }}>📌</span>
                                      <span>{block.pinned ? "Pinned" : "Pin"}</span>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); startEditing(block); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:scale-105"
                                      style={{
                                        background: CREAM,
                                        border: `1.5px solid ${RUST}`,
                                        color: INK,
                                        fontFamily: "'Arial Black', Impact, sans-serif",
                                        fontSize: "10px",
                                        letterSpacing: "0.1em",
                                        textTransform: "uppercase" as const,
                                      }}
                                    >
                                      <span style={{ fontSize: "12px" }}>✏️</span>
                                      <span>Edit</span>
                                    </button>
                                  </div>

                                  {/* ── Edit form (replaces read-only content) ── */}
                                  {isEditing ? (
                                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                      <div>
                                        <label className="text-sm font-bold uppercase tracking-wider mb-1 block" style={{ color: INK, opacity: 0.55 }}>Title</label>
                                        <input
                                          type="text"
                                          value={editForm.title || ""}
                                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                                          style={{ ...inputStyle, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif", textTransform: "uppercase" }}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-sm font-bold uppercase tracking-wider mb-1 block" style={{ color: INK, opacity: 0.55 }}>Description</label>
                                        <textarea
                                          value={editForm.description || ""}
                                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                                          rows={3}
                                          style={inputStyle}
                                        />
                                      </div>
                                      <div className="flex gap-3">
                                        <div className="flex-1">
                                          <label className="text-sm font-bold uppercase tracking-wider mb-1 block" style={{ color: INK, opacity: 0.55 }}>Start Time</label>
                                          <input
                                            type="time"
                                            value={editForm.startTime || ""}
                                            onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value || null }))}
                                            style={inputStyle}
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <label className="text-sm font-bold uppercase tracking-wider mb-1 block" style={{ color: INK, opacity: 0.55 }}>End Time</label>
                                          <input
                                            type="time"
                                            value={editForm.endTime || ""}
                                            onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value || null }))}
                                            style={inputStyle}
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-sm font-bold uppercase tracking-wider mb-1 block" style={{ color: INK, opacity: 0.55 }}>Location</label>
                                        <input
                                          type="text"
                                          value={editForm.location || ""}
                                          onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value || null }))}
                                          style={inputStyle}
                                        />
                                      </div>
                                      <div className="flex gap-2 pt-1">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); saveEdit(block.id); }}
                                          disabled={saving}
                                          style={{
                                            backgroundColor: RUST,
                                            color: CREAM,
                                            border: `2px solid ${RUST}`,
                                            borderRadius: "2px",
                                            padding: "0.5rem 1.25rem",
                                            fontWeight: 700,
                                            fontSize: "0.875rem",
                                            cursor: saving ? "not-allowed" : "pointer",
                                            opacity: saving ? 0.6 : 1,
                                          }}
                                        >
                                          {saving ? "Saving..." : "Save"}
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); cancelEditing(); }}
                                          style={{
                                            backgroundColor: "transparent",
                                            color: INK,
                                            border: `2px solid ${RUST}`,
                                            borderRadius: "2px",
                                            padding: "0.5rem 1.25rem",
                                            fontWeight: 700,
                                            fontSize: "0.875rem",
                                            cursor: "pointer",
                                          }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
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
                                        {block.estimatedCost && parseFloat(block.estimatedCost) > 0 && (
                                          <span className="text-xl font-bold ml-auto" style={{ color: INK, opacity: 0.55 }}>
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
                                          className="inline-block text-xl mt-1.5 font-semibold underline underline-offset-4 decoration-1"
                                          style={{ color: INK, opacity: 0.75 }}
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
                                              <p className="text-lg font-black uppercase tracking-wider mb-1.5" style={{ color: INK, opacity: 0.55 }}>
                                                Why this made the cut
                                              </p>
                                              <p className="text-xl leading-relaxed font-semibold" style={{ color: INK }}>
                                                {block.aiReasoning}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </SortableBlock>
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                );
              })}
          </>
        )}
          </>
        )}

        {activeTab === "map" && data && (
          <MapTab blocks={data.blocks} startDate={data.trip?.startDate || null} />
        )}

        {activeTab === "ops" && data && (
          <OpsTab
            tripId={tripId}
            participants={(data.participants as Participant[]) || []}
            feedbackItems={feedbackItems}
            signOffs={signOffs}
          />
        )}

        {/* ═══ FOOTER ═══ */}
        <div className="mt-6 mb-16">
          <div className="p-6" style={{ backgroundColor: RUST, borderRadius: "2px" }}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xl font-black uppercase tracking-wider" style={{ color: MUSTARD }}>
                  Trip Total
                </p>
                <p className="text-xl mt-1 font-medium" style={{ color: CREAM, opacity: 0.8 }}>
                  {blocks.length} items across {Object.keys(dayGroups).length} days
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black" style={{ color: CREAM, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}>
                  ~${totalCost.toLocaleString()}
                </p>
                <p className="text-xl font-medium" style={{ color: CREAM, opacity: 0.7 }}>
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
