"use client";

import { useState } from "react";
import {
  type FeedbackItem,
  INK,
  RUST,
  CREAM,
  MUSTARD,
  FEEDBACK_TYPE_CONFIG,
} from "@/lib/itinerary-shared";

interface FeedbackInboxProps {
  items: FeedbackItem[];
  onAction: (feedbackId: string, action: "accepted" | "dismissed", adminNote?: string) => void;
}

export function FeedbackInbox({ items, onAction }: FeedbackInboxProps) {
  const [expanded, setExpanded] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const pendingItems = items.filter((i) => i.status === "pending");

  if (pendingItems.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border-2 overflow-hidden" style={{ borderColor: MUSTARD }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold"
        style={{ background: MUSTARD, color: INK }}
      >
        <span>
          &#x1F4EC; {pendingItems.length} new feedback item{pendingItems.length !== 1 ? "s" : ""}
        </span>
        <span>{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>

      {expanded && (
        <div className="divide-y" style={{ background: "white" }}>
          {pendingItems.map((item) => {
            const config = FEEDBACK_TYPE_CONFIG[item.type];
            return (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg">{config?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm" style={{ color: INK }}>
                        {item.participantName || "Guest"}
                      </span>
                      <span className="text-xs opacity-50">{config?.label}</span>
                    </div>
                    {item.text && (
                      <p className="text-sm mb-2" style={{ color: INK }}>
                        &ldquo;{item.text}&rdquo;
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onAction(item.id, "accepted")}
                        className="px-3 py-1 rounded text-xs font-semibold text-white"
                        style={{ background: "#4CAF50" }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => onAction(item.id, "dismissed")}
                        className="px-3 py-1 rounded text-xs font-semibold"
                        style={{ color: RUST, border: `1px solid ${RUST}` }}
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => setReplyingTo(replyingTo === item.id ? null : item.id)}
                        className="px-3 py-1 rounded text-xs"
                        style={{ color: INK }}
                      >
                        Reply
                      </button>
                    </div>
                    {replyingTo === item.id && (
                      <div className="mt-2 flex gap-2">
                        <input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Reply note..."
                          className="flex-1 rounded border px-3 py-1 text-sm"
                          style={{ borderColor: CREAM }}
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            onAction(item.id, "accepted", replyText);
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                          className="px-3 py-1 rounded text-xs font-semibold text-white"
                          style={{ background: RUST }}
                        >
                          Send
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
