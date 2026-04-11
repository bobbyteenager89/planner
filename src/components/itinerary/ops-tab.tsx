"use client";

import { useState } from "react";
import {
  type FeedbackItem,
  type SignOff,
  type Participant,
  INK,
  RUST,
  CREAM,
  MUSTARD,
  FEEDBACK_TYPE_CONFIG,
} from "@/lib/itinerary-shared";

interface OpsTabProps {
  tripId: string;
  participants: Participant[];
  feedbackItems: FeedbackItem[];
  signOffs: SignOff[];
}

export function OpsTab({ tripId, participants, feedbackItems, signOffs }: OpsTabProps) {
  const [activeSection, setActiveSection] = useState<"todos" | "rsvps" | "changes">("todos");

  const sections = [
    { key: "todos" as const, label: "Todos" },
    { key: "rsvps" as const, label: "RSVPs" },
    { key: "changes" as const, label: "Changes" },
  ];

  const changeFeed = [...feedbackItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: activeSection === s.key ? RUST : CREAM,
              color: activeSection === s.key ? "white" : INK,
            }}
          >
            {s.label}
            {s.key === "changes" && changeFeed.filter((f) => f.status === "pending").length > 0 && (
              <span
                className="ml-2 px-1.5 py-0.5 rounded-full text-xs"
                style={{ background: MUSTARD, color: INK }}
              >
                {changeFeed.filter((f) => f.status === "pending").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeSection === "todos" && (
        <div className="text-sm" style={{ color: INK }}>
          <p className="opacity-60 mb-4">
            Reservation tasks and booking deadlines. Managed via the ops doc system.
          </p>
          <a
            href={`/api/trips/${tripId}/ops/doc`}
            className="inline-block px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: RUST, color: "white" }}
          >
            Download Ops Doc
          </a>
        </div>
      )}

      {activeSection === "rsvps" && (
        <div>
          <h4 className="text-sm font-bold mb-3" style={{ color: INK }}>Review Status</h4>
          <div className="space-y-2 mb-6">
            {participants.filter((p) => p.role !== "owner").map((p) => {
              const signOff = signOffs.find((s) => s.participantId === p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ background: CREAM }}>
                  <span className="font-semibold text-sm" style={{ color: INK }}>{p.name || "Guest"}</span>
                  <span className="ml-auto text-xs">
                    {signOff?.status === "approved" && "\u2705 Approved"}
                    {signOff?.status === "has_feedback" && "\uD83D\uDCDD Has feedback"}
                    {!signOff && "\u23F3 Not reviewed yet"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSection === "changes" && (
        <div className="space-y-3">
          {changeFeed.length === 0 ? (
            <p className="text-sm opacity-60" style={{ color: INK }}>
              No feedback yet. Share the link and feedback will appear here.
            </p>
          ) : (
            changeFeed.map((item) => {
              const config = FEEDBACK_TYPE_CONFIG[item.type];
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-4 py-3 rounded-lg"
                  style={{ background: item.status === "pending" ? CREAM : "white", border: `1px solid ${CREAM}` }}
                >
                  <span>{config?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm" style={{ color: INK }}>{item.participantName || "Guest"}</span>
                    <span className="text-xs opacity-50 ml-2">{config?.label}</span>
                    {item.text && (
                      <p className="text-sm mt-1" style={{ color: INK }}>&ldquo;{item.text}&rdquo;</p>
                    )}
                    <p className="text-xs opacity-40 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  {item.status === "pending" && (
                    <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: MUSTARD, color: INK }}>New</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
