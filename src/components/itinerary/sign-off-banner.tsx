"use client";

import { useState } from "react";
import { INK, RUST, CREAM, MUSTARD } from "@/lib/itinerary-shared";

interface SignOffBannerProps {
  tripId: string;
  participantId: string | null;
  participantName: string | null;
  itineraryStatus: string;
  onSignOff: (status: "approved" | "has_feedback") => void;
  existingSignOff?: "approved" | "has_feedback" | null;
}

export function SignOffBanner({
  participantId,
  participantName,
  itineraryStatus,
  onSignOff,
  existingSignOff,
}: SignOffBannerProps) {
  const [submitted, setSubmitted] = useState(existingSignOff);

  if (!participantId) return null;

  const isDraft = itineraryStatus === "reviewing";
  const isFinal = itineraryStatus === "finalized";

  function handleSignOff(status: "approved" | "has_feedback") {
    setSubmitted(status);
    onSignOff(status);
  }

  return (
    <div className="mb-6">
      {isDraft && (
        <div
          className="text-center text-xs font-semibold uppercase tracking-widest py-2 mb-4 rounded-lg"
          style={{ background: MUSTARD, color: INK }}
        >
          Draft — your feedback helps shape the final plan
        </div>
      )}
      {isFinal && (
        <div
          className="text-center text-xs font-semibold uppercase tracking-widest py-2 mb-4 rounded-lg"
          style={{ background: "#4CAF50", color: "white" }}
        >
          Final Plan
        </div>
      )}

      {!submitted ? (
        <div className="rounded-xl p-6 text-center" style={{ background: CREAM, color: INK }}>
          <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "'Arial Black', Impact, sans-serif" }}>
            How&apos;s this look, {participantName}?
          </h3>
          <p className="text-sm opacity-70 mb-4" style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "15px" }}>
            Scroll through the week below. Tap <strong style={{ color: RUST }}>&#x22EF; React</strong> on any activity to leave a note, propose an alternative, or say you love it.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => handleSignOff("approved")}
              className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
              style={{ background: RUST, color: "white" }}
            >
              Looks great! I&apos;m in
            </button>
            <button
              onClick={() => handleSignOff("has_feedback")}
              className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 border-2"
              style={{ borderColor: RUST, color: RUST, background: "white" }}
            >
              I have some feedback
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl px-4 py-3 text-center text-sm" style={{ background: CREAM, color: INK }}>
          {submitted === "approved" ? (
            <span>&#x2705; You&apos;re all set, {participantName}! You can still tap <strong style={{ color: RUST }}>&#x22EF; React</strong> on any activity below to leave notes.</span>
          ) : (
            <span>&#x1F4DD; Thanks, {participantName}! Tap <strong style={{ color: RUST }}>&#x22EF; React</strong> on any activity below to share your thoughts.</span>
          )}
        </div>
      )}
    </div>
  );
}
