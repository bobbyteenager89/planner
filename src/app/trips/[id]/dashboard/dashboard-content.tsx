"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AggregatedVotes, VoteTally } from "@/lib/bigsky-dashboard";

const RUST = "#D14F36";
const MUSTARD = "#EBB644";
const CREAM = "#F3EBE0";
const CARD_BG = "#EBE1D3";

interface Participant {
  id: string;
  name: string;
  status: string;
}

interface Props {
  tripId: string;
  tripDestination: string | null;
  tripStartDate: string | null;
  tripEndDate: string | null;
  tripStatus: string;
  participants: Participant[];
  votes: AggregatedVotes;
}

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

function ParticipantTracker({ participants }: { participants: Participant[] }) {
  const completed = participants.filter((p) => p.status === "completed").length;
  const statusEmoji: Record<string, string> = {
    completed: "\u2705",
    in_progress: "\u270f\ufe0f",
    invited: "\ud83d\udce9",
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
        <p className="text-sm font-bold" style={{ color: RUST }}>
          {completed} of {participants.length} completed
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {participants.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold"
            style={{
              borderRadius: "999px",
              border: `1.5px solid ${RUST}`,
              backgroundColor: p.status === "completed" ? RUST : "transparent",
              color: p.status === "completed" ? CREAM : RUST,
              opacity: p.status === "invited" ? 0.5 : 1,
            }}
          >
            <span>{statusEmoji[p.status] || "\ud83d\udce9"}</span>
            <span>{p.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function VoteBar({ tally }: { tally: VoteTally }) {
  const maxTotal = Math.max(tally.total, 1);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-bold truncate mr-3" style={{ color: RUST }}>
          {tally.label}
        </p>
        <p
          className="text-xs font-semibold whitespace-nowrap"
          style={{ color: RUST, opacity: 0.6 }}
        >
          {tally.yes} yes · {tally.fine} fine · {tally.pass} pass
        </p>
      </div>
      <div
        className="flex h-6 overflow-hidden"
        style={{
          borderRadius: "2px",
          border: `1px solid rgba(209, 79, 54, 0.3)`,
        }}
      >
        {tally.yes > 0 && (
          <div
            style={{
              width: `${(tally.yes / maxTotal) * 100}%`,
              backgroundColor: RUST,
            }}
          />
        )}
        {tally.fine > 0 && (
          <div
            style={{
              width: `${(tally.fine / maxTotal) * 100}%`,
              backgroundColor: MUSTARD,
            }}
          />
        )}
        {tally.pass > 0 && (
          <div
            style={{
              width: `${(tally.pass / maxTotal) * 100}%`,
              backgroundColor: CARD_BG,
            }}
          />
        )}
      </div>
    </div>
  );
}

function VoteSection({
  title,
  subtitle,
  tallies,
}: {
  title: string;
  subtitle: string;
  tallies: VoteTally[];
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
        <VoteBar key={tally.id} tally={tally} />
      ))}
    </section>
  );
}

function AISummarySection({ tripId }: { tripId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setSummary("");

    try {
      const res = await fetch(`/api/trips/${tripId}/summary`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to generate summary");
      if (!res.body) throw new Error("No response body");

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
      setSummary("Failed to generate summary. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isLoading}
        className="font-black uppercase text-sm py-3 px-6 transition-all active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: CARD_BG,
          color: RUST,
          border: `1.5px solid ${RUST}`,
          borderRadius: "2px",
          fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
          letterSpacing: "0.05em",
          boxShadow: `0 3px 0 ${RUST}`,
        }}
      >
        {isLoading ? "Generating\u2026" : "Generate AI Summary"}
      </button>
      {summary !== null && (
        <div
          className="mt-4 p-5 text-sm leading-relaxed whitespace-pre-wrap font-medium"
          style={{
            backgroundColor: CARD_BG,
            border: `1.5px solid ${RUST}`,
            borderRadius: "2px",
            color: RUST,
          }}
        >
          {summary || "Generating\u2026"}
        </div>
      )}
    </div>
  );
}

function GenerateItineraryButton({
  tripId,
  tripStatus,
  completedCount,
}: {
  tripId: string;
  tripStatus: string;
  completedCount: number;
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  const canGenerate =
    (tripStatus === "intake" || tripStatus === "reviewing") &&
    completedCount > 0;

  const handleGenerate = async () => {
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
      {isGenerating ? "Heading to generator\u2026" : "Generate Itinerary"}
    </button>
  );
}

export function DashboardContent({
  tripId,
  tripDestination,
  tripStartDate,
  tripEndDate,
  tripStatus,
  participants,
  votes,
}: Props) {
  return (
    <div style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      <RetroHeader
        destination={tripDestination}
        startDate={tripStartDate}
        endDate={tripEndDate}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        <section className="mb-10">
          <ParticipantTracker participants={participants} />
        </section>

        <VoteSection
          title="Activities"
          subtitle="Sorted by group enthusiasm — yes counts most, fine counts half."
          tallies={votes.activities}
        />

        <VoteSection
          title="Restaurants"
          subtitle="Dinner spots the group voted on."
          tallies={votes.restaurants}
        />

        <VoteSection
          title="Private Chefs"
          subtitle="In-house chef options."
          tallies={votes.chefs}
        />

        <section className="mb-10">
          <SectionHeader
            title="AI Summary"
            subtitle="Claude reads all responses and summarizes what the group wants."
          />
          <AISummarySection tripId={tripId} />
        </section>

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

        <section className="pb-16">
          <GenerateItineraryButton
            tripId={tripId}
            tripStatus={tripStatus}
            completedCount={votes.completedCount}
          />
        </section>
      </div>
    </div>
  );
}
