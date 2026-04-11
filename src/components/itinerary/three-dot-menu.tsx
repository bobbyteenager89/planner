"use client";

import { useState, useRef, useEffect } from "react";
import { INK, CREAM, RUST, MUSTARD } from "@/lib/itinerary-shared";

interface FeedbackActionsProps {
  blockId: string;
  onFeedback: (type: string, text?: string) => void;
  existingFeedback?: string; // type of existing feedback
}

const SUGGEST_OPTIONS = [
  { type: "propose_alternative", label: "Alternative activity", placeholder: "What would you suggest instead?" },
  { type: "different_time", label: "Different time", placeholder: "When would work better?" },
  { type: "skip", label: "I'll skip this", placeholder: "Any reason? (optional)", optional: true },
  { type: "note", label: "Just a note", placeholder: "What's on your mind?" },
];

export function ThreeDotMenu({ blockId, onFeedback, existingFeedback }: FeedbackActionsProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [text, setText] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSelectedType(null);
        setText("");
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const isLoved = existingFeedback === "love";
  const hasSuggestion = existingFeedback && existingFeedback !== "love";

  function handleLove() {
    if (isLoved) return; // already loved
    onFeedback("love");
  }

  function handleSubmitSuggestion() {
    if (!selectedType) return;
    const option = SUGGEST_OPTIONS.find((o) => o.type === selectedType);
    if (!option?.optional && !text.trim()) return;
    onFeedback(selectedType, text.trim() || undefined);
    setOpen(false);
    setSelectedType(null);
    setText("");
  }

  return (
    <div className="relative" ref={formRef}>
      <div className="flex gap-2">
        {/* Love button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleLove(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:scale-105"
          style={{
            background: isLoved ? RUST : CREAM,
            border: `1.5px solid ${RUST}`,
            color: isLoved ? "white" : INK,
            fontFamily: "'Arial Black', Impact, sans-serif",
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
          title={isLoved ? "You loved this" : "Love this activity"}
        >
          <span style={{ fontSize: "12px", lineHeight: 1 }}>{isLoved ? "\u2665" : "\u2661"}</span>
          <span>{isLoved ? "Loved" : "Love"}</span>
        </button>

        {/* Suggest button */}
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!open); setSelectedType(null); setText(""); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:scale-105"
          style={{
            background: hasSuggestion ? MUSTARD : CREAM,
            border: `1.5px solid ${RUST}`,
            color: INK,
            fontFamily: "'Arial Black', Impact, sans-serif",
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
          title="Propose a change or leave a note"
        >
          <span style={{ fontSize: "12px", lineHeight: 1 }}>{hasSuggestion ? "\u2713" : "\u270E"}</span>
          <span>{hasSuggestion ? "Sent" : "Suggest"}</span>
        </button>
      </div>

      {/* Suggest panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-xl shadow-lg border overflow-hidden w-[300px]"
          style={{ background: "white", borderColor: CREAM }}
        >
          {!selectedType ? (
            <div className="py-2">
              <div
                className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em]"
                style={{ color: RUST, fontFamily: "'Arial Black', Impact, sans-serif" }}
              >
                What kind of suggestion?
              </div>
              {SUGGEST_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setSelectedType(opt.type)}
                  className="w-full px-4 py-3 text-sm text-left hover:bg-black/5 transition-colors"
                  style={{ color: INK, fontFamily: "var(--font-fraunces), Georgia, serif" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold" style={{ color: INK, fontFamily: "'Arial Black', Impact, sans-serif", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {SUGGEST_OPTIONS.find((o) => o.type === selectedType)?.label}
                </p>
                <button
                  onClick={() => { setSelectedType(null); setText(""); }}
                  className="text-xs opacity-50 hover:opacity-100"
                  style={{ color: INK }}
                >
                  &larr; Back
                </button>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={SUGGEST_OPTIONS.find((o) => o.type === selectedType)?.placeholder}
                className="w-full rounded-lg border p-3 text-sm resize-none"
                style={{
                  borderColor: CREAM,
                  color: INK,
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  fontSize: "14px",
                }}
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSubmitSuggestion}
                  disabled={!SUGGEST_OPTIONS.find((o) => o.type === selectedType)?.optional && !text.trim()}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                  style={{
                    background: RUST,
                    fontFamily: "'Arial Black', Impact, sans-serif",
                    fontSize: "11px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
