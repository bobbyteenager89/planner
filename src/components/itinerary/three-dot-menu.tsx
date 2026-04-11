"use client";

import { useState, useRef, useEffect } from "react";
import { INK, CREAM, RUST } from "@/lib/itinerary-shared";

interface ThreeDotMenuProps {
  blockId: string;
  onFeedback: (type: string, text?: string) => void;
  existingFeedback?: string;
}

const MENU_ITEMS = [
  { type: "love", icon: "\u2764\uFE0F", label: "Love this" },
  { type: "propose_alternative", icon: "\uD83D\uDD04", label: "Propose alternative" },
  { type: "different_time", icon: "\u23F0", label: "Different time" },
  { type: "skip", icon: "\u23ED\uFE0F", label: "I'll skip this" },
  { type: "note", icon: "\uD83D\uDCDD", label: "Add a note" },
];

export function ThreeDotMenu({ blockId, onFeedback, existingFeedback }: ThreeDotMenuProps) {
  const [open, setOpen] = useState(false);
  const [textMode, setTextMode] = useState<string | null>(null);
  const [text, setText] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setTextMode(null);
        setText("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleItemClick(type: string) {
    if (type === "love") {
      onFeedback("love");
      setOpen(false);
      return;
    }
    setTextMode(type);
  }

  function handleSubmit() {
    if (textMode && text.trim()) {
      onFeedback(textMode, text.trim());
      setOpen(false);
      setTextMode(null);
      setText("");
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); setTextMode(null); setText(""); }}
        className="p-1.5 rounded-full hover:bg-black/5 transition-colors"
        style={{ color: INK }}
        title="Options"
      >
        <span className="text-lg leading-none">{"\u22EF"}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-lg border overflow-hidden min-w-[220px]"
          style={{ background: "white", borderColor: CREAM }}
        >
          {!textMode ? (
            MENU_ITEMS.map((item) => (
              <button
                key={item.type}
                onClick={() => handleItemClick(item.type)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-black/5 transition-colors"
                style={{ color: INK, background: existingFeedback === item.type ? CREAM : undefined }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {existingFeedback === item.type && (
                  <span className="ml-auto text-xs opacity-50">sent</span>
                )}
              </button>
            ))
          ) : (
            <div className="p-4">
              <p className="text-sm font-semibold mb-2" style={{ color: INK }}>
                {MENU_ITEMS.find((m) => m.type === textMode)?.label}
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What do you have in mind?"
                className="w-full rounded-lg border p-3 text-sm resize-none"
                style={{ borderColor: CREAM, color: INK }}
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim()}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                  style={{ background: RUST }}
                >
                  Send
                </button>
                <button
                  onClick={() => { setTextMode(null); setText(""); }}
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ color: INK }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
