"use client";

import { useState, useEffect } from "react";
import {
  type Block,
  type ShareData,
  INK,
  INK_MUTED,
  RUST,
  CREAM,
  CARD_BG,
  TYPE_CONFIG,
  mapsUrl,
  formatTime,
  getDayDate,
  formatDayDate,
  TravelCard,
  type FeedbackItem,
  type Participant,
  type BlockRsvp,
  type RsvpStatus,
} from "@/lib/itinerary-shared";
import { getGuestParticipantId } from "@/lib/guest-identity";

export function MyPlanView({ tripId }: { tripId: string }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [rsvps, setRsvps] = useState<BlockRsvp[]>([]);

  // Fetch trip data
  useEffect(() => {
    fetch(`/api/trips/${tripId}/share`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((json: ShareData) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [tripId]);

  // Initialize guest identity from localStorage
  useEffect(() => {
    if (!data) return;
    const storedId = getGuestParticipantId(tripId);
    if (storedId) {
      const participant = (data.participants as Participant[] | undefined)?.find(
        (p) => p.id === storedId
      );
      if (participant) {
        setGuestId(storedId);
        setGuestName(participant.name || "Guest");
      }
    }
  }, [data, tripId]);

  // Fetch feedback items when guest is identified
  useEffect(() => {
    if (!guestId) return;
    fetch(`/api/trips/${tripId}/feedback`)
      .then((r) => r.json())
      .then((items: FeedbackItem[]) => setFeedbackItems(items))
      .catch(() => {});
  }, [guestId, tripId]);

  // Fetch RSVPs when guest is identified
  useEffect(() => {
    if (!guestId) return;
    fetch(`/api/trips/${tripId}/rsvps`)
      .then((r) => r.json())
      .then((rows: BlockRsvp[]) => setRsvps(rows))
      .catch(() => {});
  }, [guestId, tripId]);

  async function submitRsvp(blockId: string, status: RsvpStatus) {
    if (!guestId) return;
    const optimistic: BlockRsvp = {
      id: `tmp-${blockId}`,
      blockId,
      participantId: guestId,
      participantName: guestName,
      status,
      updatedAt: new Date().toISOString(),
    };
    setRsvps((prev) => [
      ...prev.filter(
        (r) => !(r.blockId === blockId && r.participantId === guestId)
      ),
      optimistic,
    ]);
    try {
      const res = await fetch(`/api/trips/${tripId}/rsvps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, participantId: guestId, status }),
      });
      if (res.ok) {
        const saved = (await res.json()) as BlockRsvp;
        setRsvps((prev) =>
          prev.map((r) => (r.id === optimistic.id ? { ...optimistic, id: saved.id } : r))
        );
      }
    } catch {
      // Leave optimistic state; user can retry
    }
  }

  if (loading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: CREAM }}
      >
        <p className="text-xl font-semibold" style={{ color: INK }}>
          Loading your plan...
        </p>
      </main>
    );
  }

  if (error || !data || !data.itinerary || data.blocks.length === 0) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: CREAM }}
      >
        <div className="text-center px-6">
          <p className="text-2xl font-bold" style={{ color: INK }}>
            No itinerary available
          </p>
          <a
            href={`/trips/${tripId}/share`}
            className="inline-block mt-4 text-lg font-semibold underline underline-offset-4"
            style={{ color: RUST }}
          >
            Back to full itinerary
          </a>
        </div>
      </main>
    );
  }

  // No guest identity — send them back to pick a name
  if (!guestId) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: CREAM }}
      >
        <div className="text-center px-6">
          <p
            className="text-2xl font-black uppercase"
            style={{
              color: RUST,
              fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
            }}
          >
            Pick your name first
          </p>
          <p className="mt-3 text-lg" style={{ color: INK_MUTED }}>
            We need to know who you are to show your personalized plan.
          </p>
          <a
            href={`/trips/${tripId}/share`}
            className="inline-block mt-6 text-lg font-bold px-6 py-3"
            style={{
              backgroundColor: RUST,
              color: CREAM,
              border: `2px solid ${RUST}`,
              borderRadius: "2px",
            }}
          >
            Go to itinerary
          </a>
        </div>
      </main>
    );
  }

  const { trip, blocks } = data;

  // Build feedback lookup for this participant
  const myFeedback = feedbackItems.filter((f) => f.participantId === guestId);
  const skippedBlockIds = new Set(
    myFeedback.filter((f) => f.type === "skip").map((f) => f.blockId)
  );
  const lovedBlockIds = new Set(
    myFeedback.filter((f) => f.type === "love").map((f) => f.blockId)
  );

  // RSVP lookup for this participant: blockId → status
  const myRsvpByBlock = new Map<string, RsvpStatus>();
  for (const r of rsvps) {
    if (r.participantId === guestId) myRsvpByBlock.set(r.blockId, r.status);
  }

  // Filter blocks for this participant's personal plan
  const myBlocks = blocks.filter((block: Block) => {
    const isAlt = block.title.includes("(Alt)");

    // Always exclude blocks they skipped
    if (skippedBlockIds.has(block.id)) return false;

    // Alt blocks: only include if explicitly loved
    if (isAlt) return lovedBlockIds.has(block.id);

    // Non-alt (default) blocks: include unless skipped (already handled above)
    return true;
  });

  // Group by day
  const dayGroups = myBlocks.reduce<Record<number, Block[]>>((acc, block) => {
    if (!acc[block.dayNumber]) acc[block.dayNumber] = [];
    acc[block.dayNumber].push(block);
    return acc;
  }, {});

  const dayNumbers = Object.keys(dayGroups)
    .map(Number)
    .sort((a, b) => a - b);

  // First name only for the header
  const firstName = guestName?.split(" ")[0] || "Your";

  return (
    <main style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-6 sm:px-8 max-w-2xl mx-auto">
        <p
          className="text-[10px] font-black uppercase tracking-[0.3em] mb-3"
          style={{
            color: RUST,
            fontFamily: "'Arial Black', Impact, sans-serif",
          }}
        >
          Personal Schedule
        </p>
        <h1
          className="text-4xl sm:text-5xl font-black uppercase leading-tight"
          style={{
            color: INK,
            fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
          }}
        >
          {firstName}&apos;s Big Sky Plan
        </h1>
        <p
          className="mt-3 text-lg"
          style={{
            color: INK_MUTED,
            fontFamily: "var(--font-fraunces), Georgia, serif",
          }}
        >
          {myBlocks.length} activities across {dayNumbers.length} days
        </p>
        <a
          href={`/trips/${tripId}/share`}
          className="inline-block mt-4 text-sm font-bold uppercase tracking-wider underline underline-offset-4 decoration-1"
          style={{ color: RUST }}
        >
          View full group itinerary
        </a>
      </div>

      {/* Day-by-day schedule */}
      <div className="max-w-2xl mx-auto px-5 pb-16 sm:px-8">
        {dayNumbers.map((dayNum) => {
          const dayBlocks = (dayGroups[dayNum] || []).sort(
            (a, b) => a.sortOrder - b.sortOrder
          );
          const dayDate = getDayDate(trip.startDate, dayNum);

          return (
            <div key={dayNum} className="mb-10">
              {/* Day header */}
              <div
                className="mb-4 pb-3"
                style={{ borderBottom: `2px solid ${RUST}` }}
              >
                <h2
                  className="text-2xl sm:text-3xl font-black uppercase"
                  style={{
                    color: RUST,
                    fontFamily:
                      "'Arial Black', Impact, 'system-ui', sans-serif",
                  }}
                >
                  Day {dayNum}
                </h2>
                {dayDate && (
                  <p
                    className="text-base italic mt-1"
                    style={{
                      color: INK_MUTED,
                      fontFamily: "var(--font-fraunces), Georgia, serif",
                    }}
                  >
                    {formatDayDate(dayDate)}
                  </p>
                )}
              </div>

              {/* Blocks */}
              <div className="space-y-0">
                {dayBlocks.map((block, idx) => {
                  const config = TYPE_CONFIG[block.type] || TYPE_CONFIG.note;
                  const isLoved = lovedBlockIds.has(block.id);

                  const prevBlock = idx > 0 ? dayBlocks[idx - 1] : null;
                  const showTravel =
                    prevBlock &&
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
                        className="mb-4"
                        style={{
                          backgroundColor: CARD_BG,
                          border: `2px solid ${RUST}`,
                          borderRadius: "2px",
                          padding: "1.25rem 1.5rem",
                          overflow: "hidden",
                        }}
                      >
                        {/* Time + type badge row */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {block.startTime && (
                            <span
                              className="text-sm font-mono font-bold"
                              style={{ color: INK_MUTED }}
                            >
                              {formatTime(block.startTime)}
                              {block.endTime &&
                                `\u2013${formatTime(block.endTime)}`}
                            </span>
                          )}
                          <span
                            className="text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: config.bg,
                              color: INK,
                              border: `1.5px solid ${RUST}`,
                              borderRadius: "2px",
                            }}
                          >
                            {config.icon} {config.label}
                          </span>
                          {isLoved && (
                            <span className="text-sm" title="You loved this">
                              ❤️
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <p
                          className="font-black uppercase text-xl leading-tight"
                          style={{
                            color: RUST,
                            fontFamily:
                              "'Arial Black', Impact, 'system-ui', sans-serif",
                          }}
                        >
                          {block.title.replace(/\s*\(Alt\)\s*/g, "")}
                        </p>

                        {/* Location */}
                        {block.location && (
                          <a
                            href={mapsUrl(block.location)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-sm mt-1.5 font-semibold underline underline-offset-4 decoration-1"
                            style={{ color: INK_MUTED }}
                          >
                            📍 {block.location}
                          </a>
                        )}

                        {/* Description */}
                        {block.description && (
                          <p
                            className="leading-relaxed mt-3 text-[15px]"
                            style={{
                              color: INK,
                              fontFamily:
                                "var(--font-fraunces), Georgia, serif",
                            }}
                          >
                            {block.description}
                          </p>
                        )}

                        {/* RSVP toggle — activity blocks only */}
                        {block.type === "activity" && (
                          <div className="mt-4 pt-3" style={{ borderTop: `1px dashed ${RUST}` }}>
                            <p
                              className="text-[10px] font-black uppercase tracking-[0.2em] mb-2"
                              style={{ color: INK_MUTED }}
                            >
                              Will you join?
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {(["yes", "maybe", "no"] as const).map((s) => {
                                const active = myRsvpByBlock.get(block.id) === s;
                                const labels = { yes: "Yes, I’m in", maybe: "Maybe", no: "No, skip me" };
                                return (
                                  <button
                                    key={s}
                                    onClick={() => submitRsvp(block.id, s)}
                                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all"
                                    style={{
                                      backgroundColor: active ? RUST : "transparent",
                                      color: active ? CREAM : RUST,
                                      border: `1.5px solid ${RUST}`,
                                      borderRadius: "2px",
                                    }}
                                  >
                                    {labels[s]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {dayBlocks.length === 0 && (
                  <p
                    className="text-base italic py-4"
                    style={{
                      color: INK_MUTED,
                      fontFamily: "var(--font-fraunces), Georgia, serif",
                    }}
                  >
                    Nothing scheduled — free day!
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="max-w-2xl mx-auto px-5 pb-16 sm:px-8">
        <div
          className="p-5"
          style={{ backgroundColor: RUST, borderRadius: "2px" }}
        >
          <p
            className="text-lg font-black uppercase tracking-wider"
            style={{ color: CREAM }}
          >
            That&apos;s your plan, {firstName}!
          </p>
          <a
            href={`/trips/${tripId}/share`}
            className="inline-block mt-3 text-sm font-bold uppercase tracking-wider underline underline-offset-4 decoration-1"
            style={{ color: CREAM, opacity: 0.8 }}
          >
            Back to full itinerary
          </a>
        </div>
      </div>
    </main>
  );
}
