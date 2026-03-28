"use client";

import { useState, useEffect } from "react";

interface Block {
  id: string;
  dayNumber: number;
  sortOrder: number;
  type: string;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  estimatedCost: string | null;
  aiReasoning: string | null;
}

interface ShareData {
  trip: {
    id: string;
    title: string;
    destination: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string;
  };
  itinerary: {
    id: string;
    version: number;
    status: string;
    createdAt: string;
  } | null;
  blocks: Block[];
  participants: Array<{ name: string | null; role: string }>;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  activity: { icon: "🏔", label: "Activity", color: "bg-blue-50 text-blue-700 border-blue-200" },
  meal: { icon: "🍽", label: "Meal", color: "bg-amber-50 text-amber-700 border-amber-200" },
  transport: { icon: "🚗", label: "Transport", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  lodging: { icon: "🏠", label: "Lodging", color: "bg-purple-50 text-purple-700 border-purple-200" },
  free_time: { icon: "☀️", label: "Free Time", color: "bg-green-50 text-green-700 border-green-200" },
  note: { icon: "📝", label: "Note", color: "bg-stone-50 text-stone-600 border-stone-200" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getDayDate(startDate: string | null, dayNumber: number) {
  if (!startDate) return null;
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNumber - 1);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function ShareItinerary({ tripId }: { tripId: string }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/trips/${tripId}/share`)
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tripId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-400 text-sm">Loading itinerary...</div>
      </div>
    );
  }

  if (!data || !data.itinerary || data.blocks.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-500 text-lg">No itinerary yet</p>
          <p className="text-stone-400 text-sm mt-1">Check back soon!</p>
        </div>
      </div>
    );
  }

  const { trip, itinerary, blocks, participants } = data;

  // Group blocks by day
  const dayGroups = blocks.reduce<Record<number, Block[]>>((acc, block) => {
    if (!acc[block.dayNumber]) acc[block.dayNumber] = [];
    acc[block.dayNumber].push(block);
    return acc;
  }, {});

  // Cost totals
  const totalCost = blocks.reduce((sum, b) => sum + (b.estimatedCost ? parseFloat(b.estimatedCost) : 0), 0);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <p className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-2">
            Trip Itinerary
          </p>
          <h1 className="text-2xl font-bold text-stone-900">{trip.title}</h1>
          {trip.destination && (
            <p className="text-stone-500 mt-1">{trip.destination}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-stone-500">
            {trip.startDate && trip.endDate && (
              <span>
                {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
              </span>
            )}
            <span>{participants.length} travelers</span>
            <span>v{itinerary.version}</span>
          </div>
          {participants.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {participants.map((p, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-stone-100 rounded-full text-xs text-stone-600 font-medium"
                >
                  {p.name || "Guest"}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Itinerary */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {Object.entries(dayGroups)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([day, dayBlocks]) => {
            const dayDate = getDayDate(trip.startDate, Number(day));
            return (
              <div key={day} className="mb-8">
                {/* Day header */}
                <div className="sticky top-0 z-10 bg-stone-50 pb-3 pt-2">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-stone-900">
                      Day {day}
                    </span>
                    {dayDate && (
                      <span className="text-sm text-stone-400">{dayDate}</span>
                    )}
                  </div>
                </div>

                {/* Blocks */}
                <div className="space-y-3">
                  {dayBlocks
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((block) => {
                      const config = TYPE_CONFIG[block.type] || TYPE_CONFIG.note;
                      const isExpanded = expandedBlock === block.id;
                      const isAlt = block.title.includes("(Alt)");

                      return (
                        <div
                          key={block.id}
                          onClick={() =>
                            setExpandedBlock(isExpanded ? null : block.id)
                          }
                          className={`bg-white rounded-xl border border-stone-200 px-4 py-3.5 cursor-pointer transition-all hover:border-stone-300 ${
                            isAlt ? "ml-6 border-dashed" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-lg mt-0.5">{config.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {block.startTime && (
                                  <span className="text-xs font-mono text-stone-400">
                                    {block.startTime}
                                    {block.endTime && `–${block.endTime}`}
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${config.color}`}
                                >
                                  {config.label}
                                </span>
                                {isAlt && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 font-medium">
                                    Alternative
                                  </span>
                                )}
                                {block.estimatedCost && parseFloat(block.estimatedCost) > 0 && (
                                  <span className="text-xs text-stone-400">
                                    ~${block.estimatedCost}
                                  </span>
                                )}
                              </div>
                              <p className="font-semibold text-stone-900 mt-1 text-[15px]">
                                {block.title}
                              </p>
                              {block.location && (
                                <p className="text-xs text-stone-400 mt-0.5">
                                  {block.location}
                                </p>
                              )}

                              {/* Expanded details */}
                              {isExpanded && (
                                <div className="mt-3 space-y-2">
                                  {block.description && (
                                    <p className="text-sm text-stone-600 leading-relaxed">
                                      {block.description}
                                    </p>
                                  )}
                                  {block.aiReasoning && (
                                    <div className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                                      <p className="text-xs text-blue-600 font-medium mb-0.5">
                                        Why this made the cut
                                      </p>
                                      <p className="text-xs text-blue-700 leading-relaxed">
                                        {block.aiReasoning}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}

        {/* Footer summary */}
        <div className="mt-8 mb-12 bg-white rounded-xl border border-stone-200 px-5 py-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-stone-900">Trip Summary</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {blocks.length} activities across {Object.keys(dayGroups).length} days
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-stone-900">
                ~${totalCost.toLocaleString()}
              </p>
              <p className="text-xs text-stone-400">estimated total</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
