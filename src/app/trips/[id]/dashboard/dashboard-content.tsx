"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AggregatedVotes, VoteTally } from "@/lib/bigsky-dashboard";

const RUST = "#D14F36";
const MUSTARD = "#EBB644";
const CREAM = "#F3EBE0";
const CARD_BG = "#EBE1D3";

interface ItemInsight {
  itemId: string;
  insight: string;
  signal: "consensus" | "split" | "low_interest" | "conflict";
}

interface ScheduleSlot {
  time: "morning" | "afternoon" | "evening";
  activity: string;
  signal: "consensus" | "split" | "optional";
  note: string;
}

interface ScheduleDay {
  dayNumber: number;
  date: string;
  slots: ScheduleSlot[];
}

const SIGNAL_COLORS: Record<string, string> = {
  consensus: "#4ade80",
  split: MUSTARD,
  conflict: RUST,
  low_interest: "#a8a29e",
  optional: "#a8a29e",
};

interface Participant {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  lastRemindedAt: string | null;
}

interface Props {
  tripId: string;
  tripDestination: string | null;
  tripStartDate: string | null;
  tripEndDate: string | null;
  tripStatus: string;
  participants: Participant[];
  votes: AggregatedVotes;
  itineraryInfo: {
    version: number;
    generatedAt: string;
    newResponsesSince: number;
  } | null;
}

// ── Retro Header ────────────────────────────────────────────

function RetroHeader({
  destination,
  startDate,
  endDate,
}: {
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
}) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="px-5 py-6 sm:px-10 sm:py-8" style={{ backgroundColor: RUST }}>
      <p
        className="text-sm font-bold uppercase tracking-widest mb-3"
        style={{ color: MUSTARD, opacity: 0.85 }}
      >
        Trip Leader Dashboard
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
        {destination || "Trip"}
      </h1>
      {startDate && endDate && (
        <p
          className="text-lg sm:text-2xl font-bold mt-2"
          style={{ color: CREAM, opacity: 0.9 }}
        >
          {formatDate(startDate)} — {formatDate(endDate)}
        </p>
      )}
    </div>
  );
}

// ── Section Header ──────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <div className="border-t-2 mb-4" style={{ borderColor: RUST }} />
      <h2
        className="text-2xl sm:text-3xl font-black uppercase tracking-tight"
        style={{
          color: RUST,
          fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
        }}
      >
        {title}
      </h2>
      <p className="text-sm mt-1 font-medium" style={{ color: RUST, opacity: 0.7 }}>
        {subtitle}
      </p>
    </div>
  );
}

// ── Participant Tracker ─────────────────────────────────────

function ParticipantTracker({
  participants,
  tripId,
}: {
  participants: Participant[];
  tripId: string;
}) {
  const completed = participants.filter((p) => p.status === "completed").length;
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const statusEmoji: Record<string, string> = {
    completed: "\u2705",
    in_progress: "\u270f\ufe0f",
    invited: "\ud83d\udce9",
  };

  const relativeTime = (isoDate: string) => {
    const days = Math.floor(
      (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return "today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  const canRemind = (p: Participant) => {
    if (p.status === "completed") return false;
    if (sentIds.has(p.id)) return false;
    if (p.lastRemindedAt) {
      const hours =
        (Date.now() - new Date(p.lastRemindedAt).getTime()) / (1000 * 60 * 60);
      return hours >= 24;
    }
    return true;
  };

  const handleRemind = async (p: Participant) => {
    try {
      const res = await fetch(`/api/trips/${tripId}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: p.id }),
      });
      if (res.ok) {
        setSentIds((prev) => new Set(prev).add(p.id));
      }
    } catch {
      // silently fail
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/trips/${tripId}/intake`;
    navigator.clipboard.writeText(url);
    setCopiedId(tripId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      style={{
        backgroundColor: CARD_BG,
        border: `1.5px solid ${RUST}`,
        borderRadius: "2px",
        padding: "1.25rem",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p
          className="font-black uppercase text-sm tracking-wide"
          style={{
            color: RUST,
            fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
          }}
        >
          Responses
        </p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold" style={{ color: RUST }}>
            {completed} of {participants.length} completed
          </p>
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-xs font-bold px-2 py-1"
            style={{
              color: RUST,
              border: `1px solid ${RUST}`,
              borderRadius: "2px",
            }}
          >
            {copiedId ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {participants.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm">{statusEmoji[p.status] || "\ud83d\udce9"}</span>
              <span
                className="text-sm font-semibold truncate"
                style={{
                  color: RUST,
                  opacity: p.status === "invited" ? 0.5 : 1,
                }}
              >
                {p.name}
              </span>
              {p.status !== "completed" && (
                <span className="text-xs" style={{ color: RUST, opacity: 0.4 }}>
                  · {relativeTime(p.createdAt)}
                </span>
              )}
            </div>
            {p.status !== "completed" && (
              <button
                type="button"
                onClick={() => handleRemind(p)}
                disabled={!canRemind(p)}
                className="text-xs font-bold px-2 py-1 shrink-0 disabled:opacity-30"
                style={{
                  color: CREAM,
                  backgroundColor: RUST,
                  borderRadius: "2px",
                }}
              >
                {sentIds.has(p.id) ? "Sent!" : "Remind"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Vote Bar ────────────────────────────────────────────────

function VoteBar({
  tally,
  insight,
}: {
  tally: VoteTally;
  insight?: ItemInsight;
}) {
  const maxTotal = Math.max(tally.total, 1);
  const [showConflict, setShowConflict] = useState(false);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: RUST }}>
            {tally.label}
          </p>
          {tally.conflicted && (
            <button
              type="button"
              onClick={() => setShowConflict(!showConflict)}
              className="shrink-0 px-2 py-0.5 text-xs font-bold uppercase"
              style={{
                backgroundColor: RUST,
                color: CREAM,
                borderRadius: "2px",
                fontSize: "10px",
              }}
            >
              Split
            </button>
          )}
        </div>
        <p
          className="text-xs font-semibold whitespace-nowrap ml-3"
          style={{ color: RUST, opacity: 0.6 }}
        >
          {tally.yes} yes · {tally.fine} fine · {tally.pass} pass
        </p>
      </div>
      <div
        className="flex h-6 overflow-hidden"
        style={{
          borderRadius: "2px",
          border: "1px solid rgba(209, 79, 54, 0.3)",
        }}
      >
        {tally.yes > 0 && (
          <div style={{ width: `${(tally.yes / maxTotal) * 100}%`, backgroundColor: RUST }} />
        )}
        {tally.fine > 0 && (
          <div style={{ width: `${(tally.fine / maxTotal) * 100}%`, backgroundColor: MUSTARD }} />
        )}
        {tally.pass > 0 && (
          <div style={{ width: `${(tally.pass / maxTotal) * 100}%`, backgroundColor: CARD_BG }} />
        )}
      </div>
      {showConflict && tally.conflictPairs.length > 0 && (
        <div className="mt-1.5 text-xs font-medium" style={{ color: RUST, opacity: 0.7 }}>
          {tally.conflictPairs.slice(0, 3).map((pair, i) => (
            <span key={i}>
              {pair.yesVoter}: Yes vs {pair.passVoter}: Pass
              {i < Math.min(tally.conflictPairs.length, 3) - 1 && " · "}
            </span>
          ))}
          {tally.conflictPairs.length > 3 && ` +${tally.conflictPairs.length - 3} more`}
        </div>
      )}
      {insight && (
        <div className="flex items-center gap-2 mt-1.5">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: SIGNAL_COLORS[insight.signal] || MUSTARD }}
          />
          <p className="text-xs font-medium" style={{ color: RUST, opacity: 0.7 }}>
            {insight.insight}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Vote Section ────────────────────────────────────────────

function VoteSection({
  title,
  subtitle,
  tallies,
  insights,
}: {
  title: string;
  subtitle: string;
  tallies: VoteTally[];
  insights: ItemInsight[];
}) {
  if (tallies.length === 0) {
    return (
      <section className="mb-10">
        <SectionHeader title={title} subtitle={subtitle} />
        <p className="text-sm font-medium" style={{ color: RUST, opacity: 0.5 }}>
          No votes yet.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <SectionHeader title={title} subtitle={subtitle} />
      {tallies.map((tally) => (
        <VoteBar
          key={tally.id}
          tally={tally}
          insight={insights.find((i) => i.itemId === tally.id)}
        />
      ))}
    </section>
  );
}

// ── Schedule Preview ────────────────────────────────────────

function SchedulePreviewCard({ schedule }: { schedule: ScheduleDay[] }) {
  if (schedule.length === 0) return null;

  return (
    <div className="space-y-4">
      {schedule.map((day) => (
        <div
          key={day.dayNumber}
          style={{
            backgroundColor: CARD_BG,
            border: `1.5px solid ${RUST}`,
            borderRadius: "2px",
            padding: "1rem",
          }}
        >
          <p
            className="font-black uppercase text-sm mb-2"
            style={{
              color: RUST,
              fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
            }}
          >
            Day {day.dayNumber} — {day.date}
          </p>
          <div className="space-y-1.5">
            {day.slots.map((slot, i) => (
              <div key={i} className="flex items-start gap-2">
                <span
                  className="text-xs font-bold uppercase shrink-0 w-16 mt-0.5"
                  style={{ color: RUST, opacity: 0.5 }}
                >
                  {slot.time}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: SIGNAL_COLORS[slot.signal] || MUSTARD,
                      }}
                    />
                    <span className="text-sm font-semibold" style={{ color: RUST }}>
                      {slot.activity}
                    </span>
                  </div>
                  {slot.note && (
                    <p className="text-xs mt-0.5 ml-3.5" style={{ color: RUST, opacity: 0.6 }}>
                      {slot.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Generate Itinerary Button ───────────────────────────────

function GenerateItineraryButton({
  tripId,
  tripStatus,
  completedCount,
  hasExistingItinerary,
}: {
  tripId: string;
  tripStatus: string;
  completedCount: number;
  hasExistingItinerary: boolean;
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  const canGenerate =
    (tripStatus === "intake" || tripStatus === "reviewing") &&
    completedCount > 0;

  const handleGenerate = () => {
    setIsGenerating(true);
    router.push(`/trips/${tripId}`);
  };

  if (!canGenerate) return null;

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={isGenerating}
      className="w-full font-black uppercase text-base py-4 transition-all active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: MUSTARD,
        color: RUST,
        border: `2px solid ${RUST}`,
        borderRadius: "2px",
        fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
        letterSpacing: "0.05em",
        boxShadow: `0 4px 0 ${RUST}`,
      }}
    >
      {isGenerating
        ? "Heading to generator\u2026"
        : hasExistingItinerary
          ? "Regenerate Itinerary"
          : "Generate Itinerary"}
    </button>
  );
}

// ── Main Component ──────────────────────────────────────────

export function DashboardContent({
  tripId,
  tripDestination,
  tripStartDate,
  tripEndDate,
  tripStatus,
  participants,
  votes,
  itineraryInfo,
}: Props) {
  const [insights, setInsights] = useState<ItemInsight[]>([]);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const handleAnalyze = async () => {
    setLoadingInsights(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/insights`, { method: "POST" });
      if (res.ok) setInsights(await res.json());
    } catch { /* */ }
    setLoadingInsights(false);
  };

  const handleSchedule = async () => {
    setLoadingSchedule(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/schedule-preview`, { method: "POST" });
      if (res.ok) setSchedule(await res.json());
    } catch { /* */ }
    setLoadingSchedule(false);
  };

  const handleSummary = async () => {
    setLoadingSummary(true);
    setSummary("");
    try {
      const res = await fetch(`/api/trips/${tripId}/summary`, { method: "POST" });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setSummary(text);
      }
    } catch {
      setSummary("Failed to generate summary.");
    }
    setLoadingSummary(false);
  };

  const aiBtnClass =
    "font-black uppercase text-sm py-3 px-5 transition-all active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed";
  const aiBtnStyle = {
    backgroundColor: CARD_BG,
    color: RUST,
    border: `1.5px solid ${RUST}`,
    borderRadius: "2px",
    fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
    letterSpacing: "0.05em",
    boxShadow: `0 3px 0 ${RUST}`,
  };

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      <RetroHeader
        destination={tripDestination}
        startDate={tripStartDate}
        endDate={tripEndDate}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        {/* Participant Tracker */}
        <section className="mb-10">
          <ParticipantTracker participants={participants} tripId={tripId} />
        </section>

        {/* Vote Breakdown */}
        <VoteSection
          title="Activities"
          subtitle="Sorted by group enthusiasm — yes counts most, fine counts half."
          tallies={votes.activities}
          insights={insights}
        />
        <VoteSection
          title="Restaurants"
          subtitle="Dinner spots the group voted on."
          tallies={votes.restaurants}
          insights={insights}
        />
        <VoteSection
          title="Private Chefs"
          subtitle="In-house chef options."
          tallies={votes.chefs}
          insights={insights}
        />

        {/* AI Tools */}
        <section className="mb-10">
          <SectionHeader
            title="AI Tools"
            subtitle="Let Claude help you make sense of the votes."
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loadingInsights}
              className={aiBtnClass}
              style={aiBtnStyle}
            >
              {loadingInsights
                ? "Analyzing\u2026"
                : insights.length > 0
                  ? "Re-analyze Votes"
                  : "Analyze Votes"}
            </button>
            <button
              type="button"
              onClick={handleSchedule}
              disabled={loadingSchedule}
              className={aiBtnClass}
              style={aiBtnStyle}
            >
              {loadingSchedule
                ? "Planning\u2026"
                : schedule.length > 0
                  ? "Re-preview Schedule"
                  : "Preview Schedule"}
            </button>
            <button
              type="button"
              onClick={handleSummary}
              disabled={loadingSummary}
              className={aiBtnClass}
              style={aiBtnStyle}
            >
              {loadingSummary
                ? "Generating\u2026"
                : summary !== null
                  ? "Regenerate Summary"
                  : "Generate Summary"}
            </button>
          </div>
        </section>

        {/* Schedule Preview */}
        {schedule.length > 0 && (
          <section className="mb-10">
            <SectionHeader
              title="Schedule Preview"
              subtitle="A rough day-by-day framework based on votes. Not the final itinerary."
            />
            <SchedulePreviewCard schedule={schedule} />
          </section>
        )}

        {/* AI Summary */}
        {summary !== null && (
          <section className="mb-10">
            <SectionHeader
              title="AI Summary"
              subtitle="Claude's take on what the group wants."
            />
            <div
              className="p-5 text-sm leading-relaxed whitespace-pre-wrap font-medium"
              style={{
                backgroundColor: CARD_BG,
                border: `1.5px solid ${RUST}`,
                borderRadius: "2px",
                color: RUST,
              }}
            >
              {summary || "Generating\u2026"}
            </div>
          </section>
        )}

        {/* Suggestions */}
        {votes.openTextEntries.length > 0 && (
          <section className="mb-10">
            <SectionHeader
              title="Suggestions"
              subtitle="Free-form ideas from the group."
            />
            <div className="space-y-3">
              {votes.openTextEntries.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: CARD_BG,
                    border: `1.5px solid ${RUST}`,
                    borderRadius: "2px",
                    padding: "1rem",
                  }}
                >
                  <p
                    className="text-sm font-bold uppercase tracking-wide mb-1"
                    style={{ color: RUST, opacity: 0.5 }}
                  >
                    {entry.name}
                  </p>
                  <p
                    className="text-sm leading-relaxed font-medium"
                    style={{ color: RUST }}
                  >
                    {entry.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Generate Itinerary */}
        <section className="pb-16">
          {itineraryInfo && (
            <div
              className="mb-4 p-4"
              style={{
                backgroundColor: CARD_BG,
                border: `1.5px solid ${RUST}`,
                borderRadius: "2px",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold" style={{ color: RUST }}>
                    Itinerary v{itineraryInfo.version}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: RUST, opacity: 0.5 }}>
                    Generated {new Date(itineraryInfo.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                {itineraryInfo.newResponsesSince > 0 && (
                  <span
                    className="px-3 py-1 text-xs font-bold uppercase"
                    style={{
                      backgroundColor: MUSTARD,
                      color: RUST,
                      borderRadius: "2px",
                    }}
                  >
                    {itineraryInfo.newResponsesSince} new response{itineraryInfo.newResponsesSince > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          )}
          <GenerateItineraryButton
            tripId={tripId}
            tripStatus={tripStatus}
            completedCount={votes.completedCount}
            hasExistingItinerary={itineraryInfo !== null}
          />
        </section>
      </div>
    </div>
  );
}
