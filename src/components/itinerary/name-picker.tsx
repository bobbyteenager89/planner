"use client";

import { useState } from "react";
import { type Participant, INK, RUST, CREAM } from "@/lib/itinerary-shared";
import { getGuestParticipantId, setGuestParticipantId } from "@/lib/guest-identity";

interface NamePickerProps {
  tripId: string;
  participants: Participant[];
  onSelect: (participantId: string, name: string) => void;
}

export function NamePicker({ tripId, participants, onSelect }: NamePickerProps) {
  const [selected, setSelected] = useState<string | null>(
    getGuestParticipantId(tripId)
  );

  function handleSelect(participantId: string) {
    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return;
    setGuestParticipantId(tripId, participantId);
    setSelected(participantId);
    onSelect(participantId, participant.name || "Guest");
  }

  if (selected) {
    const name = participants.find((p) => p.id === selected)?.name || "Guest";
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
        style={{ background: CREAM, color: INK }}
      >
        <span>Viewing as <strong>{name}</strong></span>
        <button
          onClick={() => { setSelected(null); }}
          className="underline text-xs"
          style={{ color: RUST }}
        >
          Switch
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-6 text-center" style={{ background: CREAM, color: INK }}>
      <h3 className="text-lg font-bold mb-3" style={{ fontFamily: "'Arial Black', Impact, sans-serif" }}>
        Who are you?
      </h3>
      <p className="text-sm mb-4 opacity-70">Select your name to leave feedback</p>
      <div className="flex flex-wrap justify-center gap-2">
        {participants
          .filter((p) => p.role !== "owner")
          .map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105"
              style={{ background: RUST, color: "white" }}
            >
              {p.name || "Guest"}
            </button>
          ))}
      </div>
    </div>
  );
}
