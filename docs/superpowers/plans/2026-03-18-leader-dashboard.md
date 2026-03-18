# Leader Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone leader dashboard at `/trips/[id]/dashboard` where the trip owner sees aggregated Big Sky participant votes, participant completion status, an AI-generated preference summary, and can trigger itinerary generation.

**Architecture:** Server Component page with auth check and data fetch, passing aggregated data to a client component for interactive features (AI summary streaming). A pure utility function handles vote aggregation from rawData. Retro Big Sky visual theme (cream/rust/mustard).

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (Neon), Anthropic SDK (Haiku for summary), Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-03-17-leader-dashboard-design.md`

---

## File Structure

| File | Type | Responsibility |
|------|------|---------------|
| `src/lib/bigsky-dashboard.ts` | Pure utility | `aggregateBigSkyVotes()` — parses rawData, tallies votes, returns grouped results |
| `src/app/trips/[id]/dashboard/page.tsx` | Server Component | Auth check (owner-only), data fetch (trip + participants + preferences), renders layout |
| `src/app/trips/[id]/dashboard/dashboard-content.tsx` | Client Component | Vote bars, participant tracker, AI summary streaming, generate itinerary button |
| `src/app/api/trips/[id]/summary/route.ts` | API Route | Streams Claude Haiku summary of aggregated votes + open text (API route needed for streaming — Server Actions can't stream) |
| `src/app/trips/[id]/trip-content.tsx` | Existing (modify) | Add "View Responses" link for owner during intake+ status |

---

### Task 1: Vote Aggregation Utility

**Files:**
- Create: `src/lib/bigsky-dashboard.ts`

This is a pure function with no DB access — takes preferences array, returns aggregated vote tallies.

- [ ] **Step 1: Create the types and function skeleton**

```ts
// src/lib/bigsky-dashboard.ts

import {
  ACTIVITIES,
  DINNER_SPOTS,
  CHEF_OPTIONS,
} from "@/app/trips/[id]/intake/bigsky-config";

export interface VoteTally {
  id: string;
  label: string;
  yes: number;
  fine: number;
  pass: number;
  total: number;
  enthusiasm: number;
  voters: { name: string; vote: "yes" | "fine" | "pass" }[];
}

export interface AggregatedVotes {
  activities: VoteTally[];
  restaurants: VoteTally[];
  chefs: VoteTally[];
  openTextEntries: { name: string; text: string }[];
  participantCount: number;
  completedCount: number;
}

interface RawPreference {
  rawData: unknown;
  participantName: string;
}

// Lookup maps for resolving IDs to display names
const ACTIVITY_LABELS: Record<string, string> = {};
for (const a of ACTIVITIES) {
  ACTIVITY_LABELS[a.id] = a.title;
}

const DINNER_LABELS: Record<string, string> = {};
for (const d of DINNER_SPOTS) {
  DINNER_LABELS[d.id] = d.name;
}

const CHEF_LABELS: Record<string, string> = {};
for (const c of CHEF_OPTIONS) {
  CHEF_LABELS[c.id] = c.name;
}

function humanizeId(id: string): string {
  return id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function tallyVotes(
  allVotes: Record<string, Record<string, "yes" | "fine" | "pass">>,
  labelMap: Record<string, string>,
  names: Record<string, string>
): VoteTally[] {
  const tallies: Record<string, VoteTally> = {};

  for (const [participantKey, votes] of Object.entries(allVotes)) {
    const name = names[participantKey] || "Unknown";
    for (const [itemId, vote] of Object.entries(votes)) {
      if (!tallies[itemId]) {
        tallies[itemId] = {
          id: itemId,
          label: labelMap[itemId] || humanizeId(itemId),
          yes: 0,
          fine: 0,
          pass: 0,
          total: 0,
          enthusiasm: 0,
          voters: [],
        };
      }
      tallies[itemId][vote]++;
      tallies[itemId].total++;
      tallies[itemId].voters.push({ name, vote });
    }
  }

  // Calculate enthusiasm and sort
  return Object.values(tallies)
    .map((t) => ({ ...t, enthusiasm: t.yes + t.fine * 0.5 }))
    .sort((a, b) => b.enthusiasm - a.enthusiasm);
}

export function aggregateBigSkyVotes(
  prefs: RawPreference[]
): AggregatedVotes {
  const activityVotesAll: Record<string, Record<string, "yes" | "fine" | "pass">> = {};
  const dinnerVotesAll: Record<string, Record<string, "yes" | "fine" | "pass">> = {};
  const chefVotesAll: Record<string, Record<string, "yes" | "fine" | "pass">> = {};
  const names: Record<string, string> = {};
  const openTextEntries: { name: string; text: string }[] = [];

  let completedCount = 0;

  for (let i = 0; i < prefs.length; i++) {
    const { rawData, participantName } = prefs[i];
    if (!rawData || typeof rawData !== "object") continue;

    const data = rawData as Record<string, unknown>;
    if (data.surveyType !== "bigsky") continue;

    completedCount++;
    const key = String(i);
    names[key] = participantName || "Anonymous";

    if (data.activityVotes && typeof data.activityVotes === "object") {
      activityVotesAll[key] = data.activityVotes as Record<string, "yes" | "fine" | "pass">;
    }

    if (data.dinnerVotes && typeof data.dinnerVotes === "object") {
      dinnerVotesAll[key] = data.dinnerVotes as Record<string, "yes" | "fine" | "pass">;
    }

    if (data.chefVotes && typeof data.chefVotes === "object") {
      chefVotesAll[key] = data.chefVotes as Record<string, "yes" | "fine" | "pass">;
    }

    if (data.openText && typeof data.openText === "string" && data.openText.trim()) {
      openTextEntries.push({ name: names[key], text: data.openText.trim() });
    }
  }

  return {
    activities: tallyVotes(activityVotesAll, ACTIVITY_LABELS, names),
    restaurants: tallyVotes(dinnerVotesAll, DINNER_LABELS, names),
    chefs: tallyVotes(chefVotesAll, CHEF_LABELS, names),
    openTextEntries,
    participantCount: prefs.length,
    completedCount,
  };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/andrew/Projects/planner && npx tsc --noEmit src/lib/bigsky-dashboard.ts 2>&1 | head -20`

If there are import path issues (tsconfig aliases), just run: `npm run build 2>&1 | grep -i error | head -10`

- [ ] **Step 3: Commit**

```bash
git add src/lib/bigsky-dashboard.ts
git commit -m "feat: add aggregateBigSkyVotes utility for leader dashboard"
```

---

### Task 2: Dashboard Server Component (page.tsx)

**Files:**
- Create: `src/app/trips/[id]/dashboard/page.tsx`

Auth check, data fetch, pass aggregated data to client component.

- [ ] **Step 1: Create the server component**

```tsx
// src/app/trips/[id]/dashboard/page.tsx

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, participants, preferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { aggregateBigSkyVotes } from "@/lib/bigsky-dashboard";
import { DashboardContent } from "./dashboard-content";

export default async function LeaderDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const database = db();

  // Load trip
  const [trip] = await database
    .select()
    .from(trips)
    .where(eq(trips.id, id));

  if (!trip) notFound();

  // Owner-only check
  if (trip.ownerId !== session.user.id) notFound();

  // Load all participants
  const allParticipants = await database
    .select()
    .from(participants)
    .where(eq(participants.tripId, id));

  // Load preferences for each participant
  const participantPrefs = await Promise.all(
    allParticipants.map(async (p) => {
      const [pref] = await database
        .select()
        .from(preferences)
        .where(eq(preferences.participantId, p.id))
        .limit(1);
      return {
        participantId: p.id,
        name: p.name || p.email,
        status: p.status,
        rawData: pref?.rawData ?? null,
      };
    })
  );

  // Aggregate votes from completed participants with rawData
  const prefsForAggregation = participantPrefs
    .filter((p) => p.rawData !== null)
    .map((p) => ({
      rawData: p.rawData,
      participantName: p.name,
    }));

  const votes = aggregateBigSkyVotes(prefsForAggregation);

  return (
    <DashboardContent
      tripId={id}
      tripDestination={trip.destination}
      tripStartDate={trip.startDate?.toISOString() ?? null}
      tripEndDate={trip.endDate?.toISOString() ?? null}
      tripStatus={trip.status}
      participants={participantPrefs.map((p) => ({
        id: p.participantId,
        name: p.name,
        status: p.status,
      }))}
      votes={votes}
    />
  );
}
```

- [ ] **Step 2: Verify it compiles (will fail until dashboard-content.tsx exists — that's expected)**

Run: `cd /Users/andrew/Projects/planner && npx tsc --noEmit 2>&1 | head -10`

Expected: Error about missing `./dashboard-content` — confirms page.tsx itself is correct.

- [ ] **Step 3: Commit**

```bash
git add src/app/trips/[id]/dashboard/page.tsx
git commit -m "feat: add leader dashboard server component with auth + data fetch"
```

---

### Task 3: Dashboard Client Component (dashboard-content.tsx)

**Files:**
- Create: `src/app/trips/[id]/dashboard/dashboard-content.tsx`

This is the main visual component — retro Big Sky theme, vote bars, participant tracker, AI summary, generate button.

- [ ] **Step 1: Create the client component**

```tsx
// src/app/trips/[id]/dashboard/dashboard-content.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AggregatedVotes, VoteTally } from "@/lib/bigsky-dashboard";

const RUST = "#D14F36";
const MUSTARD = "#EBB644";
const CREAM = "#F3EBE0";
const CARD_BG = "#EBE1D3";

interface Participant {
  id: string;
  name: string;
  status: string;
}

interface Props {
  tripId: string;
  tripDestination: string | null;
  tripStartDate: string | null;
  tripEndDate: string | null;
  tripStatus: string;
  participants: Participant[];
  votes: AggregatedVotes;
}

// ── Retro Header ────────────────────────────────────────────

function RetroHeader({
  destination,
  startDate,
  endDate,
}: {
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
}) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="px-5 py-6 sm:px-10 sm:py-8" style={{ backgroundColor: RUST }}>
      <p
        className="text-sm font-bold uppercase tracking-widest mb-3"
        style={{ color: MUSTARD, opacity: 0.85 }}
      >
        Trip Leader Dashboard
      </p>
      <h1
        className="text-5xl sm:text-7xl font-black uppercase leading-none"
        style={{
          color: CREAM,
          fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
          textShadow: `3px 3px 0 ${MUSTARD}`,
          letterSpacing: "-0.02em",
        }}
      >
        {destination || "Trip"}
      </h1>
      {startDate && endDate && (
        <p
          className="text-lg sm:text-2xl font-bold mt-2"
          style={{ color: CREAM, opacity: 0.9 }}
        >
          {formatDate(startDate)} — {formatDate(endDate)}
        </p>
      )}
    </div>
  );
}

// ── Section Header ──────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6">
      <div className="border-t-2 mb-4" style={{ borderColor: RUST }} />
      <h2
        className="text-2xl sm:text-3xl font-black uppercase tracking-tight"
        style={{
          color: RUST,
          fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
        }}
      >
        {title}
      </h2>
      <p
        className="text-sm mt-1 font-medium"
        style={{ color: RUST, opacity: 0.7 }}
      >
        {subtitle}
      </p>
    </div>
  );
}

// ── Participant Tracker ─────────────────────────────────────

function ParticipantTracker({
  participants,
}: {
  participants: Participant[];
}) {
  const completed = participants.filter((p) => p.status === "completed").length;
  const statusEmoji: Record<string, string> = {
    completed: "✅",
    in_progress: "✏️",
    invited: "📩",
  };

  return (
    <div
      style={{
        backgroundColor: CARD_BG,
        border: `1.5px solid ${RUST}`,
        borderRadius: "2px",
        padding: "1.25rem",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p
          className="font-black uppercase text-sm tracking-wide"
          style={{
            color: RUST,
            fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
          }}
        >
          Responses
        </p>
        <p className="text-sm font-bold" style={{ color: RUST }}>
          {completed} of {participants.length} completed
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {participants.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold"
            style={{
              borderRadius: "999px",
              border: `1.5px solid ${RUST}`,
              backgroundColor:
                p.status === "completed" ? RUST : "transparent",
              color: p.status === "completed" ? CREAM : RUST,
              opacity: p.status === "invited" ? 0.5 : 1,
            }}
          >
            <span>{statusEmoji[p.status] || "📩"}</span>
            <span>{p.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Vote Bar ────────────────────────────────────────────────

function VoteBar({ tally }: { tally: VoteTally }) {
  const maxTotal = Math.max(tally.total, 1);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <p
          className="text-sm font-bold truncate mr-3"
          style={{ color: RUST }}
        >
          {tally.label}
        </p>
        <p
          className="text-xs font-semibold whitespace-nowrap"
          style={{ color: RUST, opacity: 0.6 }}
        >
          {tally.yes} yes · {tally.fine} fine · {tally.pass} pass
        </p>
      </div>
      <div
        className="flex h-6 overflow-hidden"
        style={{
          borderRadius: "2px",
          border: `1px solid rgba(209, 79, 54, 0.3)`,
        }}
      >
        {/* Yes segment */}
        {tally.yes > 0 && (
          <div
            style={{
              width: `${(tally.yes / maxTotal) * 100}%`,
              backgroundColor: RUST,
            }}
          />
        )}
        {/* Fine segment */}
        {tally.fine > 0 && (
          <div
            style={{
              width: `${(tally.fine / maxTotal) * 100}%`,
              backgroundColor: MUSTARD,
            }}
          />
        )}
        {/* Pass segment */}
        {tally.pass > 0 && (
          <div
            style={{
              width: `${(tally.pass / maxTotal) * 100}%`,
              backgroundColor: CARD_BG,
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Vote Section ────────────────────────────────────────────

function VoteSection({
  title,
  subtitle,
  tallies,
}: {
  title: string;
  subtitle: string;
  tallies: VoteTally[];
}) {
  if (tallies.length === 0) {
    return (
      <section className="mb-10">
        <SectionHeader title={title} subtitle={subtitle} />
        <p className="text-sm font-medium" style={{ color: RUST, opacity: 0.5 }}>
          No votes yet.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <SectionHeader title={title} subtitle={subtitle} />
      {tallies.map((tally) => (
        <VoteBar key={tally.id} tally={tally} />
      ))}
    </section>
  );
}

// ── AI Summary ──────────────────────────────────────────────

function AISummarySection({
  tripId,
}: {
  tripId: string;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setSummary("");

    try {
      const res = await fetch(`/api/trips/${tripId}/summary`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to generate summary");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setSummary(text);
      }
    } catch {
      setSummary("Failed to generate summary. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isLoading}
        className="font-black uppercase text-sm py-3 px-6 transition-all active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: CARD_BG,
          color: RUST,
          border: `1.5px solid ${RUST}`,
          borderRadius: "2px",
          fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
          letterSpacing: "0.05em",
          boxShadow: `0 3px 0 ${RUST}`,
        }}
      >
        {isLoading ? "Generating…" : "Generate AI Summary"}
      </button>
      {summary !== null && (
        <div
          className="mt-4 p-5 text-sm leading-relaxed whitespace-pre-wrap font-medium"
          style={{
            backgroundColor: CARD_BG,
            border: `1.5px solid ${RUST}`,
            borderRadius: "2px",
            color: RUST,
          }}
        >
          {summary || "Generating…"}
        </div>
      )}
    </div>
  );
}

// ── Generate Itinerary Button ───────────────────────────────

function GenerateItineraryButton({
  tripId,
  tripStatus,
  completedCount,
}: {
  tripId: string;
  tripStatus: string;
  completedCount: number;
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  const canGenerate =
    (tripStatus === "intake" || tripStatus === "reviewing") &&
    completedCount > 0;

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Navigate to the trip detail page which handles the generation UI
    router.push(`/trips/${tripId}`);
  };

  if (!canGenerate) return null;

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={isGenerating}
      className="w-full font-black uppercase text-base py-4 transition-all active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: MUSTARD,
        color: RUST,
        border: `2px solid ${RUST}`,
        borderRadius: "2px",
        fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
        letterSpacing: "0.05em",
        boxShadow: `0 4px 0 ${RUST}`,
      }}
    >
      {isGenerating ? "Heading to generator…" : "Generate Itinerary"}
    </button>
  );
}

// ── Main Component ──────────────────────────────────────────

export function DashboardContent({
  tripId,
  tripDestination,
  tripStartDate,
  tripEndDate,
  tripStatus,
  participants,
  votes,
}: Props) {
  return (
    <div style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      <RetroHeader
        destination={tripDestination}
        startDate={tripStartDate}
        endDate={tripEndDate}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        {/* Participant Tracker */}
        <section className="mb-10">
          <ParticipantTracker participants={participants} />
        </section>

        {/* Vote Breakdown */}
        <VoteSection
          title="Activities"
          subtitle="Sorted by group enthusiasm — yes counts most, fine counts half."
          tallies={votes.activities}
        />

        <VoteSection
          title="Restaurants"
          subtitle="Dinner spots the group voted on."
          tallies={votes.restaurants}
        />

        <VoteSection
          title="Private Chefs"
          subtitle="In-house chef options."
          tallies={votes.chefs}
        />

        {/* AI Summary */}
        <section className="mb-10">
          <SectionHeader
            title="AI Summary"
            subtitle="Claude reads all responses and summarizes what the group wants."
          />
          <AISummarySection tripId={tripId} />
        </section>

        {/* Open Text Suggestions */}
        {votes.openTextEntries.length > 0 && (
          <section className="mb-10">
            <SectionHeader
              title="Suggestions"
              subtitle="Free-form ideas from the group."
            />
            <div className="space-y-3">
              {votes.openTextEntries.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: CARD_BG,
                    border: `1.5px solid ${RUST}`,
                    borderRadius: "2px",
                    padding: "1rem",
                  }}
                >
                  <p
                    className="text-sm font-bold uppercase tracking-wide mb-1"
                    style={{ color: RUST, opacity: 0.5 }}
                  >
                    {entry.name}
                  </p>
                  <p
                    className="text-sm leading-relaxed font-medium"
                    style={{ color: RUST }}
                  >
                    {entry.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Generate Itinerary */}
        <section className="pb-16">
          <GenerateItineraryButton
            tripId={tripId}
            tripStatus={tripStatus}
            completedCount={votes.completedCount}
          />
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/andrew/Projects/planner && npx tsc --noEmit 2>&1 | head -20`

Expected: May show error about missing `/api/trips/[id]/summary` route — that's fine, it's a runtime fetch. Should have no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/trips/[id]/dashboard/dashboard-content.tsx
git commit -m "feat: add dashboard client component with retro Big Sky theme"
```

---

### Task 4: AI Summary API Route

**Files:**
- Create: `src/app/api/trips/[id]/summary/route.ts`

Streams a Claude Haiku summary of aggregated votes + open text. Using a route handler (not server action) because we need to stream a `ReadableStream` response — server actions can't return streaming responses directly.

- [ ] **Step 1: Create the summary route**

```ts
// src/app/api/trips/[id]/summary/route.ts

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, participants, preferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ai } from "@/lib/ai/client";
import { aggregateBigSkyVotes } from "@/lib/bigsky-dashboard";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const database = db();

  // Load trip — owner only
  const [trip] = await database
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) return new Response("Trip not found", { status: 404 });
  if (trip.ownerId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // Load participants + preferences
  const allParticipants = await database
    .select()
    .from(participants)
    .where(eq(participants.tripId, id));

  const prefsWithNames = await Promise.all(
    allParticipants.map(async (p) => {
      const [pref] = await database
        .select()
        .from(preferences)
        .where(eq(preferences.participantId, p.id))
        .limit(1);
      return {
        rawData: pref?.rawData ?? null,
        participantName: p.name || p.email,
      };
    })
  );

  const votes = aggregateBigSkyVotes(
    prefsWithNames.filter((p) => p.rawData !== null)
  );

  // Build summary prompt
  const voteSummary = [
    "## Activities (sorted by enthusiasm)",
    ...votes.activities.map(
      (a) => `- ${a.label}: ${a.yes} yes, ${a.fine} fine, ${a.pass} pass`
    ),
    "",
    "## Restaurants",
    ...votes.restaurants.map(
      (r) => `- ${r.label}: ${r.yes} yes, ${r.fine} fine, ${r.pass} pass`
    ),
    "",
    "## Private Chefs",
    ...votes.chefs.map(
      (c) => `- ${c.label}: ${c.yes} yes, ${c.fine} fine, ${c.pass} pass`
    ),
  ].join("\n");

  const openTextSection =
    votes.openTextEntries.length > 0
      ? [
          "",
          "## Open Suggestions",
          ...votes.openTextEntries.map(
            (e) => `- ${e.name}: "${e.text}"`
          ),
        ].join("\n")
      : "";

  const systemPrompt = `You are a trip planning assistant helping a trip leader understand their group's preferences. You have vote data from a survey where participants voted "yes" (excited), "fine" (would go along), or "pass" (not interested) on activities, restaurants, and private chef options.

Write a concise 3-4 paragraph summary that:
1. Highlights clear winners and consensus picks
2. Notes any divisive items or conflicts
3. Calls out any open suggestions worth considering
4. Gives a brief recommendation on what to prioritize

Be warm and conversational. This is a family trip to Big Sky, Montana. ${votes.completedCount} of ${votes.participantCount} people have responded so far.`;

  const userMessage = `Here are the survey results:\n\n${voteSummary}${openTextSection}`;

  // Stream from Claude Haiku
  const response = await ai().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    stream: true,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/andrew/Projects/planner && npx tsc --noEmit 2>&1 | head -20`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/trips/[id]/summary/route.ts
git commit -m "feat: add streaming AI summary route for leader dashboard"
```

---

### Task 5: Add "View Responses" Link to Trip Detail Page

**Files:**
- Modify: `src/app/trips/[id]/trip-content.tsx`

Add a link to `/trips/[id]/dashboard` in the owner's intake-phase view.

- [ ] **Step 1: Add the link**

In `src/app/trips/[id]/trip-content.tsx`, read the file first, then find the `if (status === "intake") { if (isOwner)` block.

Replace the owner intake block with:

```tsx
    if (isOwner) {
      return (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {completedCount === 0
                    ? "Waiting for participants to complete their intake."
                    : `${completedCount} participant${completedCount > 1 ? "s" : ""} completed intake.`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {completedCount > 0 && (
                  <Link href={`/trips/${tripId}/dashboard`}>
                    <Button variant="outline">View Responses</Button>
                  </Link>
                )}
                {completedCount > 0 && (
                  <GenerateView
                    tripId={tripId}
                    tripDays={tripDays}
                    onComplete={handleGenerateComplete}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
```

Also add the link for the "reviewing" status. Find the `if (status === "reviewing")` block and replace it with:

```tsx
  if (status === "reviewing") {
    return (
      <div>
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Reviewing itinerary
              </p>
              {isOwner && (
                <Link href={`/trips/${tripId}/dashboard`}>
                  <Button variant="outline" size="sm">View Responses</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
        <ItineraryView
          tripId={tripId}
          isOwner={isOwner}
          onRegenerate={handleRegenerate}
        />
      </div>
    );
  }
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/andrew/Projects/planner && npx tsc --noEmit 2>&1 | head -20`

Expected: No errors.

- [ ] **Step 3: Verify build**

Run: `cd /Users/andrew/Projects/planner && npm run build 2>&1 | tail -20`

Expected: Build succeeds. All routes compile.

- [ ] **Step 4: Commit**

```bash
git add src/app/trips/[id]/trip-content.tsx
git commit -m "feat: add 'View Responses' link to trip detail page for owner"
```

---

### Task 6: Manual Verification

- [ ] **Step 1: Start dev server**

Run: `cd /Users/andrew/Projects/planner && npm run dev`

- [ ] **Step 2: Test dashboard page loads**

Navigate to: `http://localhost:3000/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/dashboard`

Must be logged in as the trip owner. Verify:
- Retro Big Sky header renders (rust background, "BIG SKY" title)
- Participant tracker shows names with status pills
- Vote bars display for activities, restaurants, chefs
- Items are sorted by enthusiasm (most popular first)
- "Suggestions" section shows any open text entries
- "Generate AI Summary" button is visible

- [ ] **Step 3: Test AI summary**

Click "Generate AI Summary" button. Verify:
- Button shows "Generating…" while streaming
- Text streams in progressively
- Summary is coherent and references actual vote data

- [ ] **Step 4: Test "View Responses" link on trip detail page**

Navigate to: `http://localhost:3000/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42`

Verify: "View Responses" button is visible next to the generate button.

- [ ] **Step 5: Test auth guard**

Open an incognito window and navigate to the dashboard URL without logging in. Verify it redirects to `/login`.

- [ ] **Step 6: Fix any issues found, commit**

```bash
git add -A
git commit -m "fix: address issues from manual verification"
```

(Only if issues were found.)

---

### Task 7: Production Build + Deploy

- [ ] **Step 1: Full production build**

Run: `cd /Users/andrew/Projects/planner && npm run build 2>&1 | tail -30`

Expected: Build succeeds with no errors. Dashboard route should appear in the output.

- [ ] **Step 2: Push to GitHub**

```bash
cd /Users/andrew/Projects/planner && git push origin main
```

- [ ] **Step 3: Verify Vercel deployment**

Wait for Vercel to build and deploy. Check: `https://planner-sooty-theta.vercel.app/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/dashboard`

Verify same checks as Task 6 on production.
