"use client";

import { useState, useCallback } from "react";

interface Block {
  dayNumber: number;
  sortOrder: number;
  type: string;
  title: string;
  description: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  estimatedCost: string | null;
  aiReasoning: string | null;
}

const TYPE_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  activity: { bg: "bg-blue-100", text: "text-blue-800", label: "Activity" },
  meal: { bg: "bg-amber-100", text: "text-amber-800", label: "Meal" },
  transport: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Transport" },
  lodging: { bg: "bg-purple-100", text: "text-purple-800", label: "Lodging" },
  free_time: { bg: "bg-green-100", text: "text-green-800", label: "Free Time" },
  note: { bg: "bg-stone-100", text: "text-stone-600", label: "Note" },
};

export function GenerateView({
  tripId,
  tripDays,
  onComplete,
}: {
  tripId: string;
  tripDays: number;
  onComplete: () => void;
}) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startGeneration = useCallback(async () => {
    setIsGenerating(true);
    setBlocks([]);
    setError(null);

    try {
      const res = await fetch(`/api/trips/${tripId}/generate`, { method: "POST" });
      if (!res.ok) {
        setError(await res.text());
        setIsGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const block: Block = JSON.parse(line);
            setBlocks(prev => [...prev, block]);
            setCurrentDay(block.dayNumber);
          } catch {
            // Skip malformed lines
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const block: Block = JSON.parse(buffer);
          setBlocks(prev => [...prev, block]);
        } catch {
          // Skip
        }
      }

      setIsGenerating(false);
      // Small delay then refresh to show review UI
      setTimeout(onComplete, 1000);
    } catch {
      setError("Generation failed. Please try again.");
      setIsGenerating(false);
    }
  }, [tripId, onComplete]);

  // Group blocks by day
  const dayGroups = blocks.reduce<Record<number, Block[]>>((acc, block) => {
    if (!acc[block.dayNumber]) acc[block.dayNumber] = [];
    acc[block.dayNumber].push(block);
    return acc;
  }, {});

  if (!isGenerating && blocks.length === 0) {
    return (
      <div className="text-center py-12">
        <button
          onClick={startGeneration}
          className="bg-stone-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-stone-800 transition-colors"
        >
          Generate Itinerary
        </button>
        {error && <p className="text-red-600 mt-4 text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden">
      {/* Progress header */}
      <div className="bg-white px-5 py-4 border-b border-stone-200">
        <div className="flex items-center gap-2.5 mb-2">
          {isGenerating && (
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          )}
          <p className="text-sm font-semibold text-stone-900">
            {isGenerating ? "Building your itinerary..." : "Itinerary generated!"}
          </p>
        </div>
        {isGenerating && (
          <>
            <div className="h-1 bg-stone-200 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (currentDay / tripDays) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-stone-400 mt-1">Day {currentDay} of {tripDays}</p>
          </>
        )}
      </div>

      {/* Blocks */}
      {Object.entries(dayGroups)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([day, dayBlocks]) => (
          <div key={day}>
            <div className="px-5 py-3 border-b border-stone-100">
              <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold">
                Day {day}
              </p>
            </div>
            {dayBlocks
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((block, i) => {
                const badge = TYPE_BADGES[block.type] || TYPE_BADGES.note;
                return (
                  <div
                    key={`${day}-${i}`}
                    className="px-5 py-3.5 border-b border-stone-100 animate-in fade-in duration-300"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {block.startTime && (
                        <span className="text-xs text-stone-500">{block.startTime}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${badge.bg} ${badge.text} font-medium`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="font-semibold text-stone-900">{block.title}</p>
                    {block.description && (
                      <p className="text-sm text-stone-600 mt-0.5">{block.description}</p>
                    )}
                    {(block.location || block.estimatedCost) && (
                      <p className="text-xs text-stone-400 mt-1">
                        {block.location && `📍 ${block.location}`}
                        {block.location && block.estimatedCost && " · "}
                        {block.estimatedCost && `~$${block.estimatedCost}/person`}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        ))}

      {/* Typing indicator */}
      {isGenerating && (
        <div className="px-5 py-4 flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-pulse" />
            <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-pulse [animation-delay:200ms]" />
            <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-pulse [animation-delay:400ms]" />
          </div>
          <span className="text-xs text-stone-400">Planning next activity...</span>
        </div>
      )}

      {error && (
        <div className="px-5 py-4 bg-red-50 text-red-700 text-sm">{error}</div>
      )}
    </div>
  );
}
