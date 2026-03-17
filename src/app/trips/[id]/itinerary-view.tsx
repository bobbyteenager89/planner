"use client";

import { useState, useEffect, useCallback } from "react";

interface Reaction {
  participantId: string;
  name: string;
  reaction: string;
  note: string | null;
}

interface ReactionSummary {
  love: number;
  fine: number;
  rather_not: number;
  hard_no: number;
}

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
  pinned: boolean;
  reactions: Reaction[];
  reactionSummary: ReactionSummary;
}

interface Comment {
  participantId: string;
  name: string;
  text: string;
  createdAt: string;
}

interface ItineraryData {
  itinerary: {
    id: string;
    version: number;
    status: string;
    comments: Comment[];
    createdAt: string;
  };
  blocks: Block[];
  versions: Array<{ version: number; createdAt: string }>;
  viewer: { participantId: string; role: string };
}

const TYPE_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  activity: { bg: "bg-blue-100", text: "text-blue-800", label: "Activity" },
  meal: { bg: "bg-amber-100", text: "text-amber-800", label: "Meal" },
  transport: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Transport" },
  lodging: { bg: "bg-purple-100", text: "text-purple-800", label: "Lodging" },
  free_time: { bg: "bg-green-100", text: "text-green-800", label: "Free Time" },
  note: { bg: "bg-stone-100", text: "text-stone-600", label: "Note" },
};

const REACTION_BUTTONS = [
  { key: "love", emoji: "❤️", label: "Love" },
  { key: "fine", emoji: "👍", label: "Fine" },
  { key: "rather_not", emoji: "🤷", label: "Rather Not" },
  { key: "hard_no", emoji: "🚫", label: "Hard No" },
] as const;

export function ItineraryView({
  tripId,
  isOwner,
  onRegenerate,
}: {
  tripId: string;
  isOwner: boolean;
  onRegenerate: () => void;
}) {
  const [data, setData] = useState<ItineraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [reactingBlockId, setReactingBlockId] = useState<string | null>(null);

  const fetchItinerary = useCallback(async (version?: number) => {
    setLoading(true);
    const url = version
      ? `/api/trips/${tripId}/itinerary?version=${version}`
      : `/api/trips/${tripId}/itinerary`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      setData(json);
      setSelectedVersion(json.itinerary?.version ?? null);
    }
    setLoading(false);
  }, [tripId]);

  useEffect(() => { fetchItinerary(); }, [fetchItinerary]);

  const handleReaction = async (blockId: string, reaction: string) => {
    setReactingBlockId(blockId);
    await fetch(`/api/trips/${tripId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId, reaction }),
    });
    await fetchItinerary(selectedVersion ?? undefined);
    setReactingBlockId(null);
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    await fetch(`/api/trips/${tripId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: commentText }),
    });
    setCommentText("");
    await fetchItinerary(selectedVersion ?? undefined);
    setSubmittingComment(false);
  };

  if (loading || !data || !data.itinerary) {
    return <div className="text-center py-12 text-stone-500">Loading itinerary...</div>;
  }

  const { itinerary, blocks, versions, viewer } = data;

  // Group blocks by day
  const dayGroups = blocks.reduce<Record<number, Block[]>>((acc, block) => {
    if (!acc[block.dayNumber]) acc[block.dayNumber] = [];
    acc[block.dayNumber].push(block);
    return acc;
  }, {});

  // Find viewer's existing reactions
  const viewerReactions = new Map<string, string>();
  for (const block of blocks) {
    const myReaction = block.reactions.find(r => r.participantId === viewer.participantId);
    if (myReaction) viewerReactions.set(block.id, myReaction.reaction);
  }

  return (
    <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden">
      {/* Version bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-stone-200">
        <span className="text-xs text-stone-500">
          Version {itinerary.version} of {versions.length}
        </span>
        <div className="flex gap-1.5">
          {versions.map(v => (
            <button
              key={v.version}
              onClick={() => fetchItinerary(v.version)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                v.version === selectedVersion
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200"
              }`}
            >
              v{v.version}
            </button>
          ))}
        </div>
      </div>

      {/* Blocks by day */}
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
              .map((block) => {
                const badge = TYPE_BADGES[block.type] || TYPE_BADGES.note;
                const hasHardNos = block.reactionSummary.hard_no > 0;
                const hardNoNotes = block.reactions.filter(r => r.reaction === "hard_no" && r.note);
                const myReaction = viewerReactions.get(block.id);

                return (
                  <div
                    key={block.id}
                    className={`px-5 py-4 border-b border-stone-100 ${hasHardNos ? "bg-red-50" : ""}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {block.startTime && (
                            <span className="text-xs text-stone-500">{block.startTime}</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded ${badge.bg} ${badge.text} font-medium`}>
                            {badge.label}
                          </span>
                          {hasHardNos && (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 font-semibold">
                              ⚠ {block.reactionSummary.hard_no} Hard No{block.reactionSummary.hard_no > 1 ? "s" : ""}
                            </span>
                          )}
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
                      {isOwner && (
                        <button
                          className={`border rounded-md px-2 py-1.5 text-sm ${
                            block.pinned
                              ? "bg-amber-50 border-amber-300 text-amber-700"
                              : "border-stone-200 text-stone-400 hover:bg-stone-50"
                          }`}
                          title={block.pinned ? "Pinned" : "Pin this block"}
                        >
                          📌
                        </button>
                      )}
                    </div>

                    {/* Pinned indicator */}
                    {block.pinned && (
                      <div className="flex items-center gap-1.5 mt-2.5 px-2.5 py-1.5 bg-amber-50 rounded-md border border-amber-200">
                        <span className="text-xs">📌</span>
                        <span className="text-xs text-amber-700 font-medium">Pinned — won&apos;t change on regeneration</span>
                      </div>
                    )}

                    {/* Hard no notes */}
                    {hardNoNotes.length > 0 && (
                      <div className="mt-2 px-3 py-2 bg-white rounded-md border border-red-200">
                        <p className="text-xs text-red-700 font-medium mb-1">Notes from group:</p>
                        {hardNoNotes.map((r, i) => (
                          <p key={i} className="text-xs text-stone-600">&quot;{r.note}&quot; — {r.name}</p>
                        ))}
                      </div>
                    )}

                    {/* Reaction buttons */}
                    <div className="flex gap-1.5 mt-3">
                      {REACTION_BUTTONS.map(({ key, emoji, label }) => {
                        const count = block.reactionSummary[key as keyof ReactionSummary];
                        const isSelected = myReaction === key;
                        return (
                          <button
                            key={key}
                            onClick={() => handleReaction(block.id, key)}
                            disabled={reactingBlockId === block.id}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                              isSelected
                                ? key === "hard_no"
                                  ? "bg-red-50 border-2 border-red-400"
                                  : "bg-green-50 border-2 border-green-400"
                                : "bg-stone-100 border border-stone-200 hover:bg-stone-200"
                            }`}
                          >
                            {emoji} {label}
                            {count > 0 && (
                              <span className={`font-semibold ${
                                key === "hard_no" ? "text-red-600" : "text-green-600"
                              }`}>{count}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        ))}

      {/* General comments */}
      <div className="px-5 py-4 bg-white border-t-2 border-stone-200">
        <p className="text-sm font-semibold text-stone-900 mb-3">💬 General Comments</p>

        {itinerary.comments.map((c, i) => (
          <div key={i} className="px-3 py-2.5 bg-stone-50 rounded-lg mb-2">
            <p className="text-xs text-stone-500 mb-0.5">{c.name}</p>
            <p className="text-sm text-stone-700">{c.text}</p>
          </div>
        ))}

        <div className="flex gap-2 mt-2">
          <input
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleComment()}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2.5 border border-stone-200 rounded-lg text-sm outline-none focus:border-stone-400"
          />
          <button
            onClick={handleComment}
            disabled={submittingComment || !commentText.trim()}
            className="bg-stone-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {/* Owner action bar */}
      {isOwner && (
        <div className="flex items-center justify-between px-5 py-4 bg-stone-50 border-t-2 border-stone-200">
          <span className="text-xs text-stone-500">
            {blocks.filter(b => b.reactions.length > 0).length} of {blocks.length} blocks have reactions
          </span>
          <div className="flex gap-2">
            <button
              onClick={onRegenerate}
              className="px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm hover:bg-stone-50 transition-colors"
            >
              🔄 Regenerate
            </button>
            <button className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
              ✓ Finalize
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
