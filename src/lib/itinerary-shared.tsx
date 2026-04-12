"use client";

import React from "react";

// ── Block interface ──
export interface Block {
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
  imageUrl: string | null;
  pinned?: boolean;
}

export interface ShareData {
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

export interface FeedbackItem {
  id: string;
  blockId: string;
  participantId: string;
  participantName: string | null;
  type: "love" | "propose_alternative" | "different_time" | "skip" | "note";
  text: string | null;
  status: "pending" | "accepted" | "dismissed";
  adminNote: string | null;
  createdAt: string;
}

export interface SignOff {
  id: string;
  participantId: string;
  participantName: string | null;
  status: "approved" | "has_feedback";
  createdAt: string;
}

export interface Participant {
  id: string;
  name: string | null;
  role: string;
}

export const FEEDBACK_TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  love: { icon: "\u2764\uFE0F", label: "Loves this" },
  propose_alternative: { icon: "\uD83D\uDD04", label: "Proposed alternative" },
  different_time: { icon: "\u23F0", label: "Different time" },
  skip: { icon: "\u23ED\uFE0F", label: "Skipping" },
  note: { icon: "\uD83D\uDCDD", label: "Note" },
};

// ── Palette ──
export const INK = "#3B1A0F";
export const INK_MUTED = "rgba(59, 26, 15, 0.55)";
export const RUST = "#D14F36";
export const RUST_MUTED = "rgba(209, 79, 54, 0.55)";
export const MUSTARD = "#EBB644";
export const CREAM = "#F3EBE0";
export const CARD_BG = "#EBE1D3";

export const TYPE_CONFIG: Record<string, { icon: string; label: string; bg: string }> = {
  activity: { icon: "🏔", label: "Activity", bg: MUSTARD },
  meal: { icon: "🍽", label: "Meal", bg: "#E8D5B8" },
  transport: { icon: "🚗", label: "Transport", bg: CARD_BG },
  lodging: { icon: "🏠", label: "Lodging", bg: CARD_BG },
  free_time: { icon: "☀️", label: "Free Time", bg: "#E5DDD0" },
  note: { icon: "📝", label: "Note", bg: CARD_BG },
};

// ── Drive time estimates ──
export function estimateDriveMinutes(from: string, to: string): number | null {
  if (!from || !to) return null;
  const a = from.toLowerCase();
  const b = to.toLowerCase();
  if (a === b) return null;

  const bothBigSky =
    (a.includes("big sky") || a.includes("moose ridge") || a.includes("lone mountain") || a.includes("lone peak")) &&
    (b.includes("big sky") || b.includes("moose ridge") || b.includes("lone mountain") || b.includes("lone peak"));
  if (bothBigSky) return 10;

  const hasYellowstone = a.includes("yellowstone") || b.includes("yellowstone");
  const hasBigSky = a.includes("big sky") || a.includes("moose ridge") || b.includes("big sky") || b.includes("moose ridge");
  if (hasYellowstone && hasBigSky) return 90;
  if (hasYellowstone) return 45;

  const hasEnnis = a.includes("ennis") || b.includes("ennis");
  if (hasEnnis && hasBigSky) return 55;

  const hasGallatin = a.includes("gallatin gateway") || a.includes("rainbow ranch") || b.includes("gallatin gateway") || b.includes("rainbow ranch");
  if (hasGallatin && hasBigSky) return 25;

  const hasBozeman = a.includes("bozeman") || b.includes("bozeman") || a.includes("bzn") || b.includes("bzn");
  if (hasBozeman && hasBigSky) return 50;
  if (hasBozeman && hasYellowstone) return 90;

  const hasOusel = a.includes("ousel") || b.includes("ousel");
  if (hasOusel && hasBigSky) return 8;

  if (a.includes("big sky") && b.includes("big sky")) return 10;
  return 20;
}

export function mapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export function mapsDirectionsUrl(locations: string[]) {
  if (locations.length < 2) return mapsUrl(locations[0] || "Big Sky, MT");
  const origin = encodeURIComponent(locations[0]);
  const destination = encodeURIComponent(locations[locations.length - 1]);
  const waypoints = locations.slice(1, -1).map((l) => encodeURIComponent(l)).join("|");
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  return url;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

// Returns a Date object — use formatDayDate() to get a display string
export function getDayDate(startDate: string | null, dayNumber: number): Date | null {
  if (!startDate) return null;
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNumber - 1);
  return date;
}

export function formatDayDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function getWeekdayShort(startDate: string | null, dayNumber: number): string {
  if (!startDate) return `D${dayNumber}`;
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNumber - 1);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function getDayVibe(dayBlocks: Block[]): string {
  const first = [...dayBlocks].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  if (!first) return "";
  const t = first.title.replace(/^(Morning|Afternoon|Evening|Mid-Morning|Full-Day Trip):?\s*/i, "");
  return t.length > 25 ? t.slice(0, 25) + "..." : t;
}

export function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}

export function getDayLocations(dayBlocks: Block[]): string[] {
  const seen = new Set<string>();
  const locs: string[] = [];
  for (const b of dayBlocks.sort((a, c) => a.sortOrder - c.sortOrder)) {
    if (b.location && !b.title.includes("(Alt)") && !seen.has(b.location)) {
      seen.add(b.location);
      locs.push(b.location);
    }
  }
  return locs;
}

export function getDayDriveTotal(dayBlocks: Block[]): number {
  const locs = getDayLocations(dayBlocks);
  let total = 0;
  for (let i = 1; i < locs.length; i++) {
    const mins = estimateDriveMinutes(locs[i - 1], locs[i]);
    if (mins) total += mins;
  }
  return total;
}

export function TravelCard({ fromLocation, toLocation }: { fromLocation: string; toLocation: string }) {
  const minutes = estimateDriveMinutes(fromLocation, toLocation);
  if (!minutes) return null;
  const directionsUrl = mapsDirectionsUrl([fromLocation, toLocation]);

  return (
    <a
      href={directionsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-5 py-2.5 mx-auto"
      style={{ maxWidth: "fit-content" }}
    >
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-3" style={{ backgroundColor: RUST, opacity: 0.3 }} />
        <span className="text-lg">🚗</span>
        <div className="w-0.5 h-3" style={{ backgroundColor: RUST, opacity: 0.3 }} />
      </div>
      <span className="text-xl font-bold" style={{ color: INK, opacity: 0.6 }}>
        ~{minutes} min drive
      </span>
      <span className="text-lg underline underline-offset-2" style={{ color: RUST }}>
        Directions →
      </span>
    </a>
  );
}
