# Phase 2: Host Curation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the trip host a workbench to curate the AI-generated itinerary — edit blocks inline, drag to reorder, pin favorites, and regenerate individual days.

**Architecture:** Extract ~300 lines of shared code (palette, types, utilities, components) from guest + review into a shared module. Add 4 mutation API routes for block CRUD. Add `@dnd-kit` for drag-to-reorder. Review page gets an edit mode overlay per block and a per-day regen button. All mutations are auth-gated to trip owner.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (neon-http), @dnd-kit/core + @dnd-kit/sortable, Anthropic SDK (per-day regen)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/lib/itinerary-shared.ts` | **NEW** — Block/ShareData types, palette constants, TYPE_CONFIG, estimateDriveMinutes, mapsUrl, mapsDirectionsUrl, formatTime, getDayDate, getDayLocations, getDayDriveTotal, TravelCard, SectionDivider |
| `src/app/trips/[id]/review/review-content.tsx` | **MODIFY** — Import from shared, add edit mode, drag-to-reorder, pin/unpin, per-day regen button |
| `src/app/trips/[id]/share/guest-itinerary.tsx` | **MODIFY** — Import from shared, remove duplicated code |
| `src/app/api/trips/[id]/blocks/[blockId]/route.ts` | **NEW** — PATCH: update block fields (title, description, startTime, endTime, location, estimatedCost) |
| `src/app/api/trips/[id]/blocks/[blockId]/pin/route.ts` | **NEW** — PATCH: toggle pinned boolean |
| `src/app/api/trips/[id]/blocks/reorder/route.ts` | **NEW** — PATCH: batch update sortOrder for blocks within a day |
| `src/app/api/trips/[id]/generate-day/route.ts` | **NEW** — POST: regenerate blocks for a single day number, preserving pinned blocks |

---

### Task 1: Extract Shared Module

**Files:**
- Create: `src/lib/itinerary-shared.ts`
- Modify: `src/app/trips/[id]/share/guest-itinerary.tsx`
- Modify: `src/app/trips/[id]/review/review-content.tsx`

- [ ] **Step 1: Create `src/lib/itinerary-shared.ts`**

Extract from both files into one shared module. This code is identical (or near-identical) in both files:

```ts
// ── Types ──

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

// ── Palette ──

export const INK = "#3B1A0F";
export const RUST = "#D14F36";
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

// ── Utilities ──

export function estimateDriveMinutes(from: string, to: string): number | null {
  // ... exact copy of the existing function from review-content.tsx
}

export function mapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export function mapsDirectionsUrl(locations: string[]) {
  // ... exact copy
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

export function getDayDate(startDate: string | null, dayNumber: number) {
  if (!startDate) return null;
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNumber - 1);
  return date;
}

export function formatDayDate(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function getWeekdayShort(startDate: string | null, dayNumber: number) {
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

export function getDayLocations(dayBlocks: Block[]): string[] {
  const seen = new Set<string>();
  const locs: string[] = [];
  for (const b of [...dayBlocks].sort((a, c) => a.sortOrder - c.sortOrder)) {
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
```

Note: `TravelCard` and `SectionDivider` are React components that use `"use client"` context. Export them from the shared module too — the importing files are both `"use client"` already so this works fine. Include `"use client"` at the top of `itinerary-shared.ts` since it exports JSX components.

- [ ] **Step 2: Update `guest-itinerary.tsx` to import from shared**

Remove all duplicated code (Block, ShareData, palette, TYPE_CONFIG, all utility functions, TravelCard). Replace with:

```ts
import {
  type Block, type ShareData,
  INK, RUST, MUSTARD, CREAM, CARD_BG, TYPE_CONFIG,
  estimateDriveMinutes, mapsUrl, mapsDirectionsUrl, formatTime,
  getDayDate, formatDayDate, getWeekdayShort, getDayVibe,
  getDayLocations, getDayDriveTotal, TravelCard,
} from "@/lib/itinerary-shared";
```

Keep guest-specific code: `weatherEmoji`, `PackingListSection`, `GuestItinerary` component, `DayPicker` import.

- [ ] **Step 3: Update `review-content.tsx` to import from shared**

Same pattern — remove duplicated code, import from shared. Keep review-specific code: `ReviewItinerary` component, view mode toggle, reasoning view, footer with cost total.

- [ ] **Step 4: Build check**

```bash
cd ~/Projects/planner && npm run build
```

Verify no type errors or missing imports.

- [ ] **Step 5: Commit**

```bash
git add src/lib/itinerary-shared.ts src/app/trips/*/share/guest-itinerary.tsx src/app/trips/*/review/review-content.tsx
git commit -m "refactor: extract shared itinerary code into itinerary-shared.ts

DRY up ~300 lines duplicated between guest + review pages."
```

---

### Task 2: Block Update API

**Files:**
- Create: `src/app/api/trips/[id]/blocks/[blockId]/route.ts`

- [ ] **Step 1: Create the PATCH route**

```ts
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, itineraryBlocks, itineraries } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, blockId } = await params;
  const database = db();

  // Verify trip ownership
  const [trip] = await database
    .select({ id: trips.id, ownerId: trips.ownerId })
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) return Response.json({ error: "Trip not found" }, { status: 404 });
  if (trip.ownerId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify block belongs to this trip's latest itinerary
  const [latestItinerary] = await database
    .select({ id: itineraries.id })
    .from(itineraries)
    .where(eq(itineraries.tripId, id))
    .orderBy(desc(itineraries.version))
    .limit(1);

  if (!latestItinerary) {
    return Response.json({ error: "No itinerary" }, { status: 404 });
  }

  const [block] = await database
    .select({ id: itineraryBlocks.id })
    .from(itineraryBlocks)
    .where(
      and(
        eq(itineraryBlocks.id, blockId),
        eq(itineraryBlocks.itineraryId, latestItinerary.id)
      )
    )
    .limit(1);

  if (!block) {
    return Response.json({ error: "Block not found" }, { status: 404 });
  }

  // Parse and validate update fields
  const body = await request.json();
  const allowedFields = ["title", "description", "startTime", "endTime", "location", "estimatedCost"] as const;
  const updates: Record<string, string | null> = {};

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field] ?? null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await database
    .update(itineraryBlocks)
    .set(updates)
    .where(eq(itineraryBlocks.id, blockId));

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Add route to middleware public allowlist if needed**

Check `src/middleware.ts` — this route requires auth (owner only), so it does NOT need to be in the public allowlist. The auth middleware should already protect it. Verify that `/api/trips/[id]/blocks/*` is NOT in the public paths array.

- [ ] **Step 3: Build check**

```bash
cd ~/Projects/planner && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/trips/*/blocks/*/route.ts
git commit -m "feat: add block update API (PATCH /api/trips/[id]/blocks/[blockId])"
```

---

### Task 3: Pin/Unpin API

**Files:**
- Create: `src/app/api/trips/[id]/blocks/[blockId]/pin/route.ts`

- [ ] **Step 1: Create the PATCH route**

```ts
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, itineraryBlocks, itineraries } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, blockId } = await params;
  const database = db();

  // Verify trip ownership
  const [trip] = await database
    .select({ id: trips.id, ownerId: trips.ownerId })
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) return Response.json({ error: "Trip not found" }, { status: 404 });
  if (trip.ownerId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get block's current pinned state
  const [latestItinerary] = await database
    .select({ id: itineraries.id })
    .from(itineraries)
    .where(eq(itineraries.tripId, id))
    .orderBy(desc(itineraries.version))
    .limit(1);

  if (!latestItinerary) {
    return Response.json({ error: "No itinerary" }, { status: 404 });
  }

  const [block] = await database
    .select({ id: itineraryBlocks.id, pinned: itineraryBlocks.pinned })
    .from(itineraryBlocks)
    .where(
      and(
        eq(itineraryBlocks.id, blockId),
        eq(itineraryBlocks.itineraryId, latestItinerary.id)
      )
    )
    .limit(1);

  if (!block) {
    return Response.json({ error: "Block not found" }, { status: 404 });
  }

  // Toggle pinned
  const newPinned = !block.pinned;
  await database
    .update(itineraryBlocks)
    .set({ pinned: newPinned })
    .where(eq(itineraryBlocks.id, blockId));

  return Response.json({ pinned: newPinned });
}
```

- [ ] **Step 2: Build check + commit**

```bash
cd ~/Projects/planner && npm run build
git add src/app/api/trips/*/blocks/*/pin/route.ts
git commit -m "feat: add pin/unpin toggle API"
```

---

### Task 4: Reorder API

**Files:**
- Create: `src/app/api/trips/[id]/blocks/reorder/route.ts`

- [ ] **Step 1: Create the PATCH route**

Accepts `{ dayNumber: number, blockIds: string[] }` — blockIds in desired order. Updates sortOrder sequentially.

```ts
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, itineraryBlocks, itineraries } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const database = db();

  // Verify trip ownership
  const [trip] = await database
    .select({ id: trips.id, ownerId: trips.ownerId })
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) return Response.json({ error: "Trip not found" }, { status: 404 });
  if (trip.ownerId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { blockIds } = await request.json() as { blockIds: string[] };

  if (!Array.isArray(blockIds) || blockIds.length === 0) {
    return Response.json({ error: "blockIds required" }, { status: 400 });
  }

  // Sequential updates (neon-http has no transaction support)
  for (let i = 0; i < blockIds.length; i++) {
    await database
      .update(itineraryBlocks)
      .set({ sortOrder: i + 1 })
      .where(eq(itineraryBlocks.id, blockIds[i]));
  }

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Build check + commit**

```bash
cd ~/Projects/planner && npm run build
git add src/app/api/trips/*/blocks/reorder/route.ts
git commit -m "feat: add block reorder API (batch sortOrder update)"
```

---

### Task 5: Per-Day Regeneration API

**Files:**
- Create: `src/app/api/trips/[id]/generate-day/route.ts`

- [ ] **Step 1: Create the POST route**

Accepts `{ dayNumber: number }`. Deletes unpinned blocks for that day, generates new ones via Claude, inserts them. Pinned blocks are kept.

```ts
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  trips, participants, preferences,
  itineraries, itineraryBlocks,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ai } from "@/lib/ai/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { dayNumber } = await request.json() as { dayNumber: number };
  const database = db();

  // Verify trip ownership
  const [trip] = await database.select().from(trips).where(eq(trips.id, id)).limit(1);
  if (!trip) return Response.json({ error: "Trip not found" }, { status: 404 });
  if (trip.ownerId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get latest itinerary
  const [latestItinerary] = await database
    .select()
    .from(itineraries)
    .where(eq(itineraries.tripId, id))
    .orderBy(desc(itineraries.version))
    .limit(1);

  if (!latestItinerary) {
    return Response.json({ error: "No itinerary" }, { status: 404 });
  }

  // Get all blocks for this day
  const dayBlocks = await database
    .select()
    .from(itineraryBlocks)
    .where(
      and(
        eq(itineraryBlocks.itineraryId, latestItinerary.id),
        eq(itineraryBlocks.dayNumber, dayNumber)
      )
    );

  const pinnedBlocks = dayBlocks.filter((b) => b.pinned);
  const unpinnedIds = dayBlocks.filter((b) => !b.pinned).map((b) => b.id);

  // Get all blocks for context (other days)
  const allBlocks = await database
    .select()
    .from(itineraryBlocks)
    .where(eq(itineraryBlocks.itineraryId, latestItinerary.id));

  const otherDaysSummary = allBlocks
    .filter((b) => b.dayNumber !== dayNumber)
    .sort((a, b) => a.dayNumber - b.dayNumber || a.sortOrder - b.sortOrder)
    .map((b) => `Day ${b.dayNumber}: ${b.title} (${b.type})`)
    .join("\n");

  // Load participant preferences for context
  const allParticipants = await database
    .select()
    .from(participants)
    .where(eq(participants.tripId, id));

  const participantsWithPrefs = await Promise.all(
    allParticipants.map(async (p) => {
      const [pref] = await db()
        .select()
        .from(preferences)
        .where(eq(preferences.participantId, p.id))
        .limit(1);
      return { name: p.name || p.email, preferences: pref };
    })
  );

  const prefsContext = participantsWithPrefs.map((p) => {
    if (!p.preferences) return `${p.name}: no preferences`;
    const prefs = p.preferences;
    return `${p.name}: likes ${prefs.activityPreferences?.join(", ") || "n/a"}, hard nos: ${prefs.hardNos?.join(", ") || "none"}`;
  }).join("\n");

  // Calculate trip dates for this day
  let dayDate = "";
  if (trip.startDate) {
    const d = new Date(trip.startDate);
    d.setDate(d.getDate() + dayNumber - 1);
    dayDate = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  const pinnedContext = pinnedBlocks.length > 0
    ? `\nPinned blocks (DO NOT replace these — work around them):\n${pinnedBlocks.map((b) => `- sortOrder ${b.sortOrder}: "${b.title}" at ${b.startTime || "?"} (${b.type})`).join("\n")}`
    : "";

  const prompt = `You are regenerating ONLY Day ${dayNumber}${dayDate ? ` (${dayDate})` : ""} of a ${trip.title} trip to ${trip.destination || "the destination"}.

Group: ${allParticipants.length} people
${prefsContext}

Other days (for context — do NOT duplicate these activities):
${otherDaysSummary}
${pinnedContext}

Generate 4-7 blocks for Day ${dayNumber} as NDJSON (one JSON object per line).
Each line: {"sortOrder": <int>, "type": "<activity|meal|transport|lodging|free_time|note>", "title": "<string>", "description": "<string>", "startTime": "<HH:MM or null>", "endTime": "<HH:MM or null>", "location": "<string or null>", "estimatedCost": "<number or null>", "aiReasoning": "<why this fits>"}

${pinnedBlocks.length > 0 ? `IMPORTANT: Pinned blocks occupy sortOrders ${pinnedBlocks.map((b) => b.sortOrder).join(", ")}. Number your new blocks to fill around them. The final order should make chronological sense.` : "Start sortOrder at 1."}

Output ONLY JSON lines. No markdown, no commentary.`;

  const response = await ai().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    stream: true,
    messages: [{ role: "user", content: prompt }],
  });

  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            fullResponse += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();

        // Parse generated blocks
        const lines = fullResponse.trim().split("\n").filter((l) => l.trim());
        const parsedBlocks: Array<{
          sortOrder: number;
          type: string;
          title: string;
          description: string;
          startTime: string | null;
          endTime: string | null;
          location: string | null;
          estimatedCost: string | null;
          aiReasoning: string | null;
        }> = [];

        for (const line of lines) {
          try { parsedBlocks.push(JSON.parse(line)); } catch {}
        }

        const persistDb = db();

        // Delete unpinned blocks for this day
        for (const blockId of unpinnedIds) {
          await persistDb
            .delete(itineraryBlocks)
            .where(eq(itineraryBlocks.id, blockId));
        }

        // Insert new blocks
        if (parsedBlocks.length > 0) {
          await persistDb.insert(itineraryBlocks).values(
            parsedBlocks.map((b) => ({
              itineraryId: latestItinerary.id,
              dayNumber,
              sortOrder: b.sortOrder,
              type: b.type as "activity" | "meal" | "transport" | "lodging" | "free_time" | "note",
              title: b.title,
              description: b.description,
              startTime: b.startTime,
              endTime: b.endTime,
              location: b.location,
              estimatedCost: b.estimatedCost,
              aiReasoning: b.aiReasoning,
              pinned: false,
            }))
          );
        }
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

- [ ] **Step 2: Build check + commit**

```bash
cd ~/Projects/planner && npm run build
git add src/app/api/trips/*/generate-day/route.ts
git commit -m "feat: add per-day regeneration API (POST /api/trips/[id]/generate-day)"
```

---

### Task 6: Install @dnd-kit

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

```bash
cd ~/Projects/planner && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @dnd-kit for drag-to-reorder"
```

---

### Task 7: Update Share API to Include `pinned`

**Files:**
- Modify: `src/app/api/trips/[id]/share/route.ts`

- [ ] **Step 1: Add `pinned` to the blocks select**

In the `blocks` query inside the `Promise.all`, add `pinned: itineraryBlocks.pinned` to the select object (alongside `imageUrl`, `aiReasoning`, etc.).

- [ ] **Step 2: Build check + commit**

```bash
cd ~/Projects/planner && npm run build
git add src/app/api/trips/*/share/route.ts
git commit -m "feat: include pinned field in share API response"
```

---

### Task 8: Review Page — Host Curation UI

**Files:**
- Modify: `src/app/trips/[id]/review/review-content.tsx`

This is the big one. Transform the review page from a read-only view into an interactive workbench. The UI additions:

1. **Edit mode per block** — pencil icon on each card, click to enter edit mode with input fields
2. **Pin/unpin button** — 📌 toggle on each card, pinned blocks get a visual indicator (solid pin icon + subtle border glow)
3. **Drag handles** — grip icon on each card, drag within a day to reorder
4. **Per-day regen button** — "🔄 Regenerate Day" button in each day header, streams new blocks
5. **Save/cancel on edit** — inline save button that PATCHes the block

- [ ] **Step 1: Add state management for edit mode and saving**

Add to `ReviewItinerary` component:

```ts
const [editingBlock, setEditingBlock] = useState<string | null>(null);
const [editForm, setEditForm] = useState<Partial<Block>>({});
const [saving, setSaving] = useState(false);
const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null);
```

- [ ] **Step 2: Add mutation functions**

```ts
async function saveBlockEdit(blockId: string) {
  setSaving(true);
  await fetch(`/api/trips/${tripId}/blocks/${blockId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(editForm),
  });
  // Update local state
  setData((prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId ? { ...b, ...editForm } : b
      ),
    };
  });
  setEditingBlock(null);
  setEditForm({});
  setSaving(false);
}

async function togglePin(blockId: string) {
  const res = await fetch(`/api/trips/${tripId}/blocks/${blockId}/pin`, {
    method: "PATCH",
  });
  const { pinned } = await res.json();
  setData((prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId ? { ...b, pinned } : b
      ),
    };
  });
}

async function reorderBlocks(dayNumber: number, blockIds: string[]) {
  await fetch(`/api/trips/${tripId}/blocks/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blockIds }),
  });
  // Update local sortOrder
  setData((prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      blocks: prev.blocks.map((b) => {
        const idx = blockIds.indexOf(b.id);
        return idx >= 0 ? { ...b, sortOrder: idx + 1 } : b;
      }),
    };
  });
}

async function regenerateDay(dayNumber: number) {
  setRegeneratingDay(dayNumber);
  const res = await fetch(`/api/trips/${tripId}/generate-day`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dayNumber }),
  });
  // After streaming completes, refetch data
  await res.text(); // consume the stream
  const freshData = await fetch(`/api/trips/${tripId}/share`).then((r) => r.json());
  setData(freshData);
  setRegeneratingDay(null);
}
```

- [ ] **Step 3: Add DnD wrapper for each day's blocks**

Wrap each day's block list in a `SortableContext` from `@dnd-kit/sortable`. Each block card becomes a `useSortable` item with a drag handle.

```tsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
```

Create a `SortableBlock` wrapper component:

```tsx
function SortableBlock({ block, children }: { block: Block; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex items-center px-2 cursor-grab active:cursor-grabbing touch-none"
          style={{ color: INK, opacity: 0.35 }}
          title="Drag to reorder"
        >
          <span className="text-xl">⠿</span>
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
```

Wrap day blocks:

```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={(event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const dayBlockIds = sortedBlocks.map((b) => b.id);
    const oldIndex = dayBlockIds.indexOf(active.id as string);
    const newIndex = dayBlockIds.indexOf(over.id as string);
    const newOrder = [...dayBlockIds];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, active.id as string);
    reorderBlocks(Number(day), newOrder);
  }}
>
  <SortableContext items={sortedBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
    {sortedBlocks.map((block, idx) => (
      <SortableBlock key={block.id} block={block}>
        {/* existing block card JSX here */}
      </SortableBlock>
    ))}
  </SortableContext>
</DndContext>
```

- [ ] **Step 4: Add edit mode UI to block cards**

When a block is being edited (`editingBlock === block.id`), replace the static text with input fields:

```tsx
{editingBlock === block.id ? (
  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
    <input
      className="w-full text-xl font-black uppercase p-2"
      style={{ backgroundColor: CREAM, color: RUST, border: `2px solid ${RUST}`, borderRadius: "2px", fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
      value={editForm.title ?? block.title}
      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
    />
    <textarea
      className="w-full text-lg p-2 min-h-[80px]"
      style={{ backgroundColor: CREAM, color: INK, border: `2px solid ${RUST}`, borderRadius: "2px" }}
      value={editForm.description ?? block.description ?? ""}
      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
      placeholder="Description..."
    />
    <div className="flex gap-2">
      <input
        type="time"
        className="text-lg p-2"
        style={{ backgroundColor: CREAM, color: INK, border: `2px solid ${RUST}`, borderRadius: "2px" }}
        value={editForm.startTime ?? block.startTime ?? ""}
        onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
      />
      <input
        type="time"
        className="text-lg p-2"
        style={{ backgroundColor: CREAM, color: INK, border: `2px solid ${RUST}`, borderRadius: "2px" }}
        value={editForm.endTime ?? block.endTime ?? ""}
        onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
      />
    </div>
    <input
      className="w-full text-lg p-2"
      style={{ backgroundColor: CREAM, color: INK, border: `2px solid ${RUST}`, borderRadius: "2px" }}
      value={editForm.location ?? block.location ?? ""}
      onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
      placeholder="Location..."
    />
    <div className="flex gap-2">
      <button
        onClick={() => saveBlockEdit(block.id)}
        disabled={saving}
        className="text-lg font-bold px-5 py-2"
        style={{ backgroundColor: RUST, color: CREAM, borderRadius: "2px" }}
      >
        {saving ? "Saving..." : "Save"}
      </button>
      <button
        onClick={() => { setEditingBlock(null); setEditForm({}); }}
        className="text-lg font-bold px-5 py-2"
        style={{ backgroundColor: CARD_BG, color: INK, border: `2px solid ${RUST}`, borderRadius: "2px" }}
      >
        Cancel
      </button>
    </div>
  </div>
) : (
  /* existing read-only block content */
)}
```

- [ ] **Step 5: Add pin and edit buttons to block header**

Add a toolbar row at the top of each block card (above the photo banner):

```tsx
{/* Block toolbar — only in schedule view */}
<div className="flex items-center gap-2 mb-2 -mt-1">
  <button
    onClick={(e) => { e.stopPropagation(); togglePin(block.id); }}
    className="text-lg px-2 py-1 font-bold"
    style={{
      backgroundColor: block.pinned ? MUSTARD : "transparent",
      color: block.pinned ? INK : INK,
      opacity: block.pinned ? 1 : 0.4,
      border: `1.5px solid ${block.pinned ? MUSTARD : RUST}`,
      borderRadius: "2px",
    }}
    title={block.pinned ? "Unpin — will be replaced on regen" : "Pin — keep during regen"}
  >
    📌 {block.pinned ? "Pinned" : "Pin"}
  </button>
  <button
    onClick={(e) => {
      e.stopPropagation();
      setEditingBlock(block.id);
      setEditForm({
        title: block.title,
        description: block.description,
        startTime: block.startTime,
        endTime: block.endTime,
        location: block.location,
        estimatedCost: block.estimatedCost,
      });
    }}
    className="text-lg px-2 py-1 font-bold"
    style={{ color: INK, opacity: 0.4, border: `1.5px solid ${RUST}`, borderRadius: "2px" }}
    title="Edit this block"
  >
    ✏️ Edit
  </button>
</div>
```

- [ ] **Step 6: Add per-day regeneration button**

In the day header (inside the sticky header), add after the map toggle:

```tsx
<button
  onClick={() => regenerateDay(Number(day))}
  disabled={regeneratingDay !== null}
  className="text-lg font-bold px-4 py-1.5"
  style={{
    backgroundColor: regeneratingDay === Number(day) ? MUSTARD : CARD_BG,
    color: INK,
    border: `2px solid ${RUST}`,
    borderRadius: "2px",
    opacity: regeneratingDay !== null && regeneratingDay !== Number(day) ? 0.5 : 1,
  }}
>
  {regeneratingDay === Number(day) ? "Regenerating..." : "🔄 Regen Day"}
</button>
```

- [ ] **Step 7: Add pinned visual indicator on block cards**

For pinned blocks, add a subtle left border accent:

```tsx
style={{
  // ... existing styles
  borderLeft: block.pinned ? `4px solid ${MUSTARD}` : undefined,
}}
```

- [ ] **Step 8: Build check**

```bash
cd ~/Projects/planner && npm run build
```

Fix any type errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/trips/*/review/review-content.tsx
git commit -m "feat: host curation UI — inline edit, drag-to-reorder, pin/unpin, per-day regen

Phase 2 complete: review page is now an interactive workbench."
```

---

### Task 9: Browser Verification

- [ ] **Step 1: Start dev server**

```bash
cd ~/Projects/planner && npm run dev
```

- [ ] **Step 2: Open the review page and verify all 4 features**

Navigate to `http://localhost:3000/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/review`

Check:
1. Edit button appears on each block → click → inputs appear → change title → save → title updates
2. Pin button toggles → pinned block gets mustard border + "Pinned" label
3. Drag handle on blocks → drag one block below another → order persists on refresh
4. "Regen Day" button → click → streams, then day refreshes with new blocks (pinned blocks remain)
5. Guest page (`/share`) still works unchanged

- [ ] **Step 3: Deploy and verify on Vercel**

```bash
cd ~/Projects/planner && vercel
```

Check the preview URL.

---

### Task 10: Final Cleanup

- [ ] **Step 1: Verify guest page is unaffected**

Open `/trips/83fdfdb7.../share` — should look identical to before (no edit controls, no drag handles, no pin buttons).

- [ ] **Step 2: Run full build**

```bash
cd ~/Projects/planner && npm run build
```

- [ ] **Step 3: Final commit if any cleanup needed**
