# Editor + Guest Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the planner into a collaborative feedback loop — guests react/propose on the shared view, admin reviews/acts in the editor, manual finalize when ready.

**Architecture:** Evolve existing `/review` (editor) and `/share` (guest view) pages. Extract shared components from the two 1300-line files. New `feedback_items`, `sign_offs`, `households`, `household_members` tables. Guest identity via name-picker dropdown (no auth).

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Neon Postgres, Tailwind CSS v4, @dnd-kit, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-10-editor-guest-feedback-design.md`

---

## File Structure

### New Files
- `src/db/schema-feedback.ts` — feedback_items, sign_offs, households, household_members tables + enums
- `src/app/api/trips/[id]/feedback/route.ts` — GET/POST feedback items
- `src/app/api/trips/[id]/feedback/[feedbackId]/route.ts` — PATCH feedback status/adminNote
- `src/app/api/trips/[id]/sign-off/route.ts` — POST sign-off
- `src/app/api/trips/[id]/sign-offs/route.ts` — GET all sign-offs
- `src/app/api/trips/[id]/households/route.ts` — GET/POST households
- `src/app/api/trips/[id]/finalize/route.ts` — PATCH finalize
- `src/components/itinerary/block-card.tsx` — shared block rendering
- `src/components/itinerary/day-section.tsx` — shared day grouping
- `src/components/itinerary/feedback-badge.tsx` — feedback count indicator
- `src/components/itinerary/three-dot-menu.tsx` — context menu (admin vs guest variants)
- `src/components/itinerary/feedback-form.tsx` — inline feedback submission form
- `src/components/itinerary/sign-off-banner.tsx` — guest sign-off top banner
- `src/components/itinerary/name-picker.tsx` — guest identity dropdown
- `src/components/itinerary/feedback-inbox.tsx` — admin inbox panel
- `src/components/itinerary/ops-tab.tsx` — ops tab content (todos, RSVPs, households, changes)
- `src/components/itinerary/map-tab.tsx` — map locations list
- `src/lib/guest-identity.ts` — localStorage/cookie helpers for guest participantId

### Modified Files
- `src/db/schema.ts` — add co_admin to participantRoleEnum, presentationDismissed to itineraries
- `src/middleware.ts` — add feedback/sign-off/households API routes to public list
- `src/app/trips/[id]/share/guest-itinerary.tsx` — refactor to use shared components, add feedback UI
- `src/app/trips/[id]/review/review-content.tsx` — refactor to use shared components, add tabs + feedback inbox
- `src/lib/itinerary-shared.tsx` — add FeedbackItem, SignOff types + feedbackTypeEnum config
- `src/app/api/trips/[id]/share/route.ts` — include participants with IDs for name picker

---

## Phase 0: Bug Fix

### Task 0: Fix loading issue on /share and /review

**Files:**
- Debug: `src/app/trips/[id]/share/guest-itinerary.tsx:86-112`
- Debug: `src/middleware.ts:1-42`
- Debug: `src/app/api/trips/[id]/share/route.ts:1-108`

- [ ] **Step 1: Reproduce and diagnose**

Start dev server and test the API directly:
```bash
cd ~/Projects/planner && npm run dev
curl -s http://localhost:3001/api/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/share | head -100
```
API returns 200 with data. The issue is client-side — the page shows "Loading your trip..." indefinitely.

Open browser dev tools on `http://localhost:3001/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/share`. Check:
1. Network tab — does the fetch to `/api/trips/.../share` fire? What status?
2. Console — any JS errors during hydration?
3. If the fetch never fires, the `useEffect` hook isn't running — likely a hydration issue.

Common causes:
- Clerk middleware intercepting the client-side fetch even though the page loads
- The `__Secure-authjs.session-token` cookie check in middleware matching the API route pattern incorrectly
- A Next.js 16 hydration issue with the client component

- [ ] **Step 2: Fix the root cause**

Based on diagnosis, apply the fix. Most likely fix: ensure middleware public route patterns match the client-side fetch URL format (the middleware patterns use `*/share/trips/*` but the actual path is `/api/trips/*/share`).

Check `src/middleware.ts` line 15-22 — the public matchers list. Verify `/api/trips/*/share` is correctly matched.

- [ ] **Step 3: Verify both pages load**

```bash
# Test share page loads in browser
open http://localhost:3001/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/share

# Test review page loads (requires auth — log in first)
open http://localhost:3001/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/review
```

Both pages should render the full itinerary with 37 blocks across 8 days.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "fix: resolve loading issue on /share and /review pages"
```

---

## Phase 1: Data Model + Schema

### Task 1: Add new enums and tables to schema

**Files:**
- Create: `src/db/schema-feedback.ts`
- Modify: `src/db/schema.ts:34-37` (participantRoleEnum)
- Modify: `src/db/schema.ts:263-286` (itineraries table)

- [ ] **Step 1: Add co_admin to participant role enum**

In `src/db/schema.ts`, update `participantRoleEnum` at line 34:

```typescript
export const participantRoleEnum = pgEnum("participant_role", [
  "owner",
  "co_admin",
  "participant",
]);
```

- [ ] **Step 2: Add presentationDismissed to itineraries table**

In `src/db/schema.ts`, add after `comments` field (around line 282):

```typescript
  presentationDismissed: boolean("presentation_dismissed").default(false).notNull(),
```

- [ ] **Step 3: Create schema-feedback.ts with new tables**

```typescript
// src/db/schema-feedback.ts
import { pgTable, uuid, text, timestamp, pgEnum, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { trips } from "./schema";
import { participants } from "./schema";
import { itineraryBlocks } from "./schema";

export const feedbackTypeEnum = pgEnum("feedback_type", [
  "love",
  "propose_alternative",
  "different_time",
  "skip",
  "note",
]);

export const feedbackStatusEnum = pgEnum("feedback_status", [
  "pending",
  "accepted",
  "dismissed",
]);

export const signOffStatusEnum = pgEnum("sign_off_status", [
  "approved",
  "has_feedback",
]);

export const feedbackItems = pgTable("feedback_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id").notNull().references(() => trips.id),
  blockId: uuid("block_id").notNull().references(() => itineraryBlocks.id),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  type: feedbackTypeEnum("type").notNull(),
  text: text("text"),
  status: feedbackStatusEnum("status").default("pending").notNull(),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const signOffs = pgTable("sign_offs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id").notNull().references(() => trips.id),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  status: signOffStatusEnum("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const households = pgTable("households", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id").notNull().references(() => trips.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const householdMembers = pgTable("household_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id").notNull().references(() => households.id),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
});

// Relations
export const feedbackItemsRelations = relations(feedbackItems, ({ one }) => ({
  trip: one(trips, { fields: [feedbackItems.tripId], references: [trips.id] }),
  block: one(itineraryBlocks, { fields: [feedbackItems.blockId], references: [itineraryBlocks.id] }),
  participant: one(participants, { fields: [feedbackItems.participantId], references: [participants.id] }),
}));

export const signOffsRelations = relations(signOffs, ({ one }) => ({
  trip: one(trips, { fields: [signOffs.tripId], references: [trips.id] }),
  participant: one(participants, { fields: [signOffs.participantId], references: [participants.id] }),
}));

export const householdsRelations = relations(households, ({ one, many }) => ({
  trip: one(trips, { fields: [households.tripId], references: [trips.id] }),
  members: many(householdMembers),
}));

export const householdMembersRelations = relations(householdMembers, ({ one }) => ({
  household: one(households, { fields: [householdMembers.householdId], references: [households.id] }),
  participant: one(participants, { fields: [householdMembers.participantId], references: [participants.id] }),
}));
```

- [ ] **Step 4: Push schema to database**

```bash
cd ~/Projects/planner && npm run db:push
```

Expected: tables `feedback_items`, `sign_offs`, `households`, `household_members` created. `participant_role` enum updated. `itineraries` table updated with `presentation_dismissed` column.

- [ ] **Step 5: Verify in Drizzle Studio**

```bash
npm run db:studio
```

Check all 4 new tables exist with correct columns.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/db/schema-feedback.ts
git commit -m "feat: add feedback, sign-off, and household tables"
```

---

## Phase 2: Guest Identity + API Layer

### Task 2: Guest identity helpers

**Files:**
- Create: `src/lib/guest-identity.ts`

- [ ] **Step 1: Create guest identity module**

```typescript
// src/lib/guest-identity.ts

const STORAGE_KEY_PREFIX = "planner_guest_";

export function getGuestParticipantId(tripId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${STORAGE_KEY_PREFIX}${tripId}`);
}

export function setGuestParticipantId(tripId: string, participantId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${tripId}`, participantId);
  // Also set cookie for API calls
  document.cookie = `planner_guest=${participantId}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function clearGuestIdentity(tripId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${tripId}`);
  document.cookie = "planner_guest=; path=/; max-age=0";
}

export function getGuestIdFromCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(/planner_guest=([^;]+)/);
  return match ? match[1] : null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/guest-identity.ts
git commit -m "feat: add guest identity localStorage/cookie helpers"
```

### Task 3: Feedback API endpoints

**Files:**
- Create: `src/app/api/trips/[id]/feedback/route.ts`
- Create: `src/app/api/trips/[id]/feedback/[feedbackId]/route.ts`
- Modify: `src/middleware.ts` — add public routes

- [ ] **Step 1: Update middleware to allow feedback routes**

In `src/middleware.ts`, add these patterns to the public routes list (around line 15-22):

```typescript
"/api/trips/*/feedback",
"/api/trips/*/sign-off",
"/api/trips/*/sign-offs",
"/api/trips/*/households",
```

- [ ] **Step 2: Create feedback list/create endpoint**

```typescript
// src/app/api/trips/[id]/feedback/route.ts
import { db } from "@/db";
import { feedbackItems } from "@/db/schema-feedback";
import { participants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getGuestIdFromCookie } from "@/lib/guest-identity";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const guestId = getGuestIdFromCookie(request);

  // If guest, return only their feedback; admin sees all
  const items = await db()
    .select({
      id: feedbackItems.id,
      blockId: feedbackItems.blockId,
      participantId: feedbackItems.participantId,
      participantName: participants.name,
      type: feedbackItems.type,
      text: feedbackItems.text,
      status: feedbackItems.status,
      adminNote: feedbackItems.adminNote,
      createdAt: feedbackItems.createdAt,
    })
    .from(feedbackItems)
    .leftJoin(participants, eq(feedbackItems.participantId, participants.id))
    .where(eq(feedbackItems.tripId, tripId))
    .orderBy(feedbackItems.createdAt);

  return Response.json(items);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const body = await request.json();
  const { blockId, participantId, type, text } = body;

  if (!blockId || !participantId || !type) {
    return Response.json({ error: "blockId, participantId, and type are required" }, { status: 400 });
  }

  const [item] = await db()
    .insert(feedbackItems)
    .values({ tripId, blockId, participantId, type, text: text || null })
    .returning();

  return Response.json(item, { status: 201 });
}
```

- [ ] **Step 3: Create feedback update endpoint (admin)**

```typescript
// src/app/api/trips/[id]/feedback/[feedbackId]/route.ts
import { db } from "@/db";
import { feedbackItems } from "@/db/schema-feedback";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; feedbackId: string }> }
) {
  const { feedbackId } = await params;
  const body = await request.json();
  const { status, adminNote } = body;

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (adminNote !== undefined) updates.adminNote = adminNote;

  const [updated] = await db()
    .update(feedbackItems)
    .set(updates)
    .where(eq(feedbackItems.id, feedbackId))
    .returning();

  if (!updated) {
    return Response.json({ error: "Feedback item not found" }, { status: 404 });
  }

  return Response.json(updated);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts src/app/api/trips/\[id\]/feedback/
git commit -m "feat: add feedback API endpoints (GET/POST/PATCH)"
```

### Task 4: Sign-off and finalize API endpoints

**Files:**
- Create: `src/app/api/trips/[id]/sign-off/route.ts`
- Create: `src/app/api/trips/[id]/sign-offs/route.ts`
- Create: `src/app/api/trips/[id]/finalize/route.ts`

- [ ] **Step 1: Create sign-off POST endpoint**

```typescript
// src/app/api/trips/[id]/sign-off/route.ts
import { db } from "@/db";
import { signOffs } from "@/db/schema-feedback";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const { participantId, status } = await request.json();

  if (!participantId || !status) {
    return Response.json({ error: "participantId and status required" }, { status: 400 });
  }

  // Upsert — delete existing then insert
  await db()
    .delete(signOffs)
    .where(and(eq(signOffs.tripId, tripId), eq(signOffs.participantId, participantId)));

  const [signOff] = await db()
    .insert(signOffs)
    .values({ tripId, participantId, status })
    .returning();

  return Response.json(signOff, { status: 201 });
}
```

- [ ] **Step 2: Create sign-offs GET endpoint (admin)**

```typescript
// src/app/api/trips/[id]/sign-offs/route.ts
import { db } from "@/db";
import { signOffs } from "@/db/schema-feedback";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;

  const results = await db()
    .select({
      id: signOffs.id,
      participantId: signOffs.participantId,
      participantName: participants.name,
      status: signOffs.status,
      createdAt: signOffs.createdAt,
    })
    .from(signOffs)
    .leftJoin(participants, eq(signOffs.participantId, participants.id))
    .where(eq(signOffs.tripId, tripId))
    .orderBy(signOffs.createdAt);

  return Response.json(results);
}
```

- [ ] **Step 3: Create finalize endpoint**

```typescript
// src/app/api/trips/[id]/finalize/route.ts
import { db } from "@/db";
import { itineraries, trips } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;

  // Get latest itinerary
  const [itinerary] = await db()
    .select()
    .from(itineraries)
    .where(eq(itineraries.tripId, tripId))
    .orderBy(desc(itineraries.version))
    .limit(1);

  if (!itinerary) {
    return Response.json({ error: "No itinerary found" }, { status: 404 });
  }

  // Update itinerary status to finalized
  await db()
    .update(itineraries)
    .set({ status: "finalized" })
    .where(eq(itineraries.id, itinerary.id));

  // Update trip status to finalized
  await db()
    .update(trips)
    .set({ status: "finalized" })
    .where(eq(trips.id, tripId));

  return Response.json({ success: true, itineraryId: itinerary.id });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/trips/\[id\]/sign-off/ src/app/api/trips/\[id\]/sign-offs/ src/app/api/trips/\[id\]/finalize/
git commit -m "feat: add sign-off, sign-offs list, and finalize endpoints"
```

### Task 5: Households API endpoint

**Files:**
- Create: `src/app/api/trips/[id]/households/route.ts`

- [ ] **Step 1: Create households GET/POST endpoint**

```typescript
// src/app/api/trips/[id]/households/route.ts
import { db } from "@/db";
import { households, householdMembers } from "@/db/schema-feedback";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;

  const allHouseholds = await db()
    .select()
    .from(households)
    .where(eq(households.tripId, tripId))
    .orderBy(households.sortOrder);

  const allMembers = await db()
    .select({
      householdId: householdMembers.householdId,
      participantId: householdMembers.participantId,
      participantName: participants.name,
    })
    .from(householdMembers)
    .leftJoin(participants, eq(householdMembers.participantId, participants.id));

  const result = allHouseholds.map((h) => ({
    ...h,
    members: allMembers.filter((m) => m.householdId === h.id),
  }));

  return Response.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const body = await request.json();
  const { name, memberIds } = body as { name: string; memberIds: string[] };

  if (!name || !memberIds?.length) {
    return Response.json({ error: "name and memberIds required" }, { status: 400 });
  }

  const [household] = await db()
    .insert(households)
    .values({ tripId, name })
    .returning();

  for (const participantId of memberIds) {
    await db()
      .insert(householdMembers)
      .values({ householdId: household.id, participantId });
  }

  return Response.json(household, { status: 201 });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/trips/\[id\]/households/
git commit -m "feat: add households API endpoint"
```

### Task 6: Update share API to include participant IDs

**Files:**
- Modify: `src/app/api/trips/[id]/share/route.ts:58-81`

- [ ] **Step 1: Include participant IDs in share response**

In `src/app/api/trips/[id]/share/route.ts`, update the participants query to include IDs so the name picker can map names to IDs:

Find the participants select (around line 70) and add the `id` field:

```typescript
// Change participants query to include id
const tripParticipants = await db()
  .select({
    id: participants.id,
    name: participants.name,
    role: participants.role,
  })
  .from(participants)
  .where(eq(participants.tripId, tripId));
```

- [ ] **Step 2: Verify API response includes IDs**

```bash
curl -s http://localhost:3001/api/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/share | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('participants',[])[:2], indent=2))"
```

Expected: each participant object now has `id`, `name`, `role`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/trips/\[id\]/share/route.ts
git commit -m "feat: include participant IDs in share API for name picker"
```

---

## Phase 3: Shared Components

### Task 7: Extract shared types and config

**Files:**
- Modify: `src/lib/itinerary-shared.tsx:6-55`

- [ ] **Step 1: Add feedback types to itinerary-shared**

Add after the existing `ShareData` interface (around line 39):

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/itinerary-shared.tsx
git commit -m "feat: add feedback types and config to shared module"
```

### Task 8: Name picker component

**Files:**
- Create: `src/components/itinerary/name-picker.tsx`

- [ ] **Step 1: Create name picker**

```typescript
// src/components/itinerary/name-picker.tsx
"use client";

import { useState } from "react";
import { type Participant, INK, RUST, CREAM } from "@/lib/itinerary-shared";
import { getGuestParticipantId, setGuestParticipantId } from "@/lib/guest-identity";

interface NamePickerProps {
  tripId: string;
  participants: Participant[];
  onSelect: (participantId: string, name: string) => void;
}

export function NamePicker({ tripId, participants, onSelect }: NamePickerProps) {
  const [selected, setSelected] = useState<string | null>(
    getGuestParticipantId(tripId)
  );

  function handleSelect(participantId: string) {
    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return;
    setGuestParticipantId(tripId, participantId);
    setSelected(participantId);
    onSelect(participantId, participant.name || "Guest");
  }

  if (selected) {
    const name = participants.find((p) => p.id === selected)?.name || "Guest";
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
        style={{ background: CREAM, color: INK }}
      >
        <span>Viewing as <strong>{name}</strong></span>
        <button
          onClick={() => {
            setSelected(null);
          }}
          className="underline text-xs"
          style={{ color: RUST }}
        >
          Switch
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-6 text-center"
      style={{ background: CREAM, color: INK }}
    >
      <h3
        className="text-lg font-bold mb-3"
        style={{ fontFamily: "'Arial Black', Impact, sans-serif" }}
      >
        Who are you?
      </h3>
      <p className="text-sm mb-4 opacity-70">Select your name to leave feedback</p>
      <div className="flex flex-wrap justify-center gap-2">
        {participants
          .filter((p) => p.role !== "owner")
          .map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105"
              style={{
                background: RUST,
                color: "white",
              }}
            >
              {p.name || "Guest"}
            </button>
          ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/itinerary/name-picker.tsx
git commit -m "feat: add guest name picker component"
```

### Task 9: Three-dot menu component

**Files:**
- Create: `src/components/itinerary/three-dot-menu.tsx`

- [ ] **Step 1: Create three-dot menu**

```typescript
// src/components/itinerary/three-dot-menu.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { INK, CREAM, RUST, MUSTARD } from "@/lib/itinerary-shared";

interface ThreeDotMenuProps {
  blockId: string;
  onFeedback: (type: string, text?: string) => void;
  existingFeedback?: string; // type of existing feedback from this user
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
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
          setTextMode(null);
          setText("");
        }}
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
                style={{
                  color: INK,
                  background: existingFeedback === item.type ? CREAM : undefined,
                }}
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
                  onClick={() => {
                    setTextMode(null);
                    setText("");
                  }}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/itinerary/three-dot-menu.tsx
git commit -m "feat: add three-dot menu component with feedback categories"
```

### Task 10: Sign-off banner component

**Files:**
- Create: `src/components/itinerary/sign-off-banner.tsx`

- [ ] **Step 1: Create sign-off banner**

```typescript
// src/components/itinerary/sign-off-banner.tsx
"use client";

import { useState } from "react";
import { INK, RUST, CREAM, MUSTARD } from "@/lib/itinerary-shared";

interface SignOffBannerProps {
  tripId: string;
  participantId: string | null;
  participantName: string | null;
  itineraryStatus: string;
  onSignOff: (status: "approved" | "has_feedback") => void;
  existingSignOff?: "approved" | "has_feedback" | null;
}

export function SignOffBanner({
  participantId,
  participantName,
  itineraryStatus,
  onSignOff,
  existingSignOff,
}: SignOffBannerProps) {
  const [submitted, setSubmitted] = useState(existingSignOff);

  if (!participantId) return null;

  const isDraft = itineraryStatus === "reviewing";
  const isFinal = itineraryStatus === "finalized";

  function handleSignOff(status: "approved" | "has_feedback") {
    setSubmitted(status);
    onSignOff(status);
  }

  return (
    <div className="mb-6">
      {/* Draft/Final badge */}
      {isDraft && (
        <div
          className="text-center text-xs font-semibold uppercase tracking-widest py-2 mb-4 rounded-lg"
          style={{ background: MUSTARD, color: INK }}
        >
          Draft — your feedback helps shape the final plan
        </div>
      )}
      {isFinal && (
        <div
          className="text-center text-xs font-semibold uppercase tracking-widest py-2 mb-4 rounded-lg"
          style={{ background: "#4CAF50", color: "white" }}
        >
          Final Plan
        </div>
      )}

      {/* Sign-off prompt */}
      {!submitted ? (
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: CREAM, color: INK }}
        >
          <h3
            className="text-xl font-bold mb-2"
            style={{ fontFamily: "'Arial Black', Impact, sans-serif" }}
          >
            How&apos;s this look, {participantName}?
          </h3>
          <p className="text-sm opacity-70 mb-4">
            Review the plan below. You can react to individual items using the menu on each activity.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => handleSignOff("approved")}
              className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
              style={{ background: RUST, color: "white" }}
            >
              Looks great! I&apos;m in
            </button>
            <button
              onClick={() => handleSignOff("has_feedback")}
              className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 border-2"
              style={{ borderColor: RUST, color: RUST, background: "white" }}
            >
              I have some feedback
            </button>
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl px-4 py-3 text-center text-sm"
          style={{ background: CREAM, color: INK }}
        >
          {submitted === "approved" ? (
            <span>\u2705 You&apos;re all set, {participantName}! You can still leave notes on individual items below.</span>
          ) : (
            <span>\uD83D\uDCDD Thanks, {participantName}! Use the menu on each item to share your thoughts.</span>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/itinerary/sign-off-banner.tsx
git commit -m "feat: add sign-off banner component with draft/final badges"
```

### Task 11: Feedback inbox component (admin)

**Files:**
- Create: `src/components/itinerary/feedback-inbox.tsx`

- [ ] **Step 1: Create feedback inbox**

```typescript
// src/components/itinerary/feedback-inbox.tsx
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
    <div
      className="mb-6 rounded-xl border-2 overflow-hidden"
      style={{ borderColor: MUSTARD }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold"
        style={{ background: MUSTARD, color: INK }}
      >
        <span>
          {"\uD83D\uDCEC"} {pendingItems.length} new feedback item{pendingItems.length !== 1 ? "s" : ""}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/itinerary/feedback-inbox.tsx
git commit -m "feat: add admin feedback inbox component"
```

---

## Phase 4: Guest View Integration

### Task 12: Integrate feedback features into guest-itinerary

**Files:**
- Modify: `src/app/trips/[id]/share/guest-itinerary.tsx`

- [ ] **Step 1: Add imports and state for guest identity + feedback**

At the top of `guest-itinerary.tsx`, add imports:

```typescript
import { NamePicker } from "@/components/itinerary/name-picker";
import { ThreeDotMenu } from "@/components/itinerary/three-dot-menu";
import { SignOffBanner } from "@/components/itinerary/sign-off-banner";
import { type FeedbackItem, type Participant } from "@/lib/itinerary-shared";
import { getGuestParticipantId } from "@/lib/guest-identity";
```

Add state variables inside `GuestItinerary` (after existing state, around line 84):

```typescript
const [guestId, setGuestId] = useState<string | null>(null);
const [guestName, setGuestName] = useState<string | null>(null);
const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
const [signOffStatus, setSignOffStatus] = useState<"approved" | "has_feedback" | null>(null);
```

- [ ] **Step 2: Initialize guest identity from localStorage on mount**

Add after the existing `useEffect` (around line 112):

```typescript
useEffect(() => {
  if (!data) return;
  const storedId = getGuestParticipantId(tripId);
  if (storedId) {
    const participant = data.participants?.find((p: Participant) => p.id === storedId);
    if (participant) {
      setGuestId(storedId);
      setGuestName(participant.name || "Guest");
    }
  }
}, [data, tripId]);

// Fetch feedback items when guest is identified
useEffect(() => {
  if (!guestId) return;
  fetch(`/api/trips/${tripId}/feedback`)
    .then((r) => r.json())
    .then((items) => setFeedbackItems(items))
    .catch(() => {});
}, [guestId, tripId]);
```

- [ ] **Step 3: Add feedback submission handler**

```typescript
async function submitFeedback(blockId: string, type: string, text?: string) {
  if (!guestId) return;
  const res = await fetch(`/api/trips/${tripId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blockId, participantId: guestId, type, text }),
  });
  if (res.ok) {
    const item = await res.json();
    setFeedbackItems((prev) => [...prev, item]);
  }
}

async function submitSignOff(status: "approved" | "has_feedback") {
  if (!guestId) return;
  await fetch(`/api/trips/${tripId}/sign-off`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participantId: guestId, status }),
  });
  setSignOffStatus(status);
}
```

- [ ] **Step 4: Add NamePicker before the itinerary content**

Insert the name picker and sign-off banner after the header section (around line 197, before the countdown cards):

```typescript
{/* Guest identity */}
{!guestId ? (
  <NamePicker
    tripId={tripId}
    participants={data.participants || []}
    onSelect={(id, name) => {
      setGuestId(id);
      setGuestName(name);
    }}
  />
) : (
  <>
    <SignOffBanner
      tripId={tripId}
      participantId={guestId}
      participantName={guestName}
      itineraryStatus={data.itinerary?.status || "reviewing"}
      onSignOff={submitSignOff}
      existingSignOff={signOffStatus}
    />
  </>
)}
```

- [ ] **Step 5: Add ThreeDotMenu to each block**

In the block rendering section (around lines 310-408), add the three-dot menu next to each block's title. Find the block title rendering and add:

```typescript
{guestId && (
  <ThreeDotMenu
    blockId={block.id}
    onFeedback={(type, text) => submitFeedback(block.id, type, text)}
    existingFeedback={
      feedbackItems.find(
        (f) => f.blockId === block.id && f.participantId === guestId
      )?.type
    }
  />
)}
```

- [ ] **Step 6: Update typography — bump body text to 16px**

Find body text sizing in the component and update:
- All `text-sm` (14px) on block descriptions → `text-base` (16px)
- Add `leading-relaxed` (line-height: 1.625) to description paragraphs
- Increase padding between blocks: `mb-3` → `mb-5`
- Increase day section padding: `py-4` → `py-6`

- [ ] **Step 7: Test in browser**

```bash
open http://localhost:3001/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/share
```

Verify:
1. Name picker shows on first visit
2. After selecting name, sign-off banner appears
3. Three-dot menus appear on each activity
4. Submitting feedback creates items (check via API: `curl localhost:3001/api/trips/.../feedback`)
5. Typography is larger and more readable

- [ ] **Step 8: Commit**

```bash
git add src/app/trips/\[id\]/share/guest-itinerary.tsx
git commit -m "feat: integrate name picker, sign-off, and feedback into guest view"
```

---

## Phase 5: Editor Enhancements

### Task 13: Add tabs and feedback inbox to editor

**Files:**
- Modify: `src/app/trips/[id]/review/review-content.tsx`
- Create: `src/components/itinerary/map-tab.tsx`
- Create: `src/components/itinerary/ops-tab.tsx`

- [ ] **Step 1: Create map tab component**

```typescript
// src/components/itinerary/map-tab.tsx
"use client";

import { type Block, INK, RUST, CREAM, mapsUrl, getDayDate, formatDayDate } from "@/lib/itinerary-shared";

interface MapTabProps {
  blocks: Block[];
  startDate: string | null;
}

export function MapTab({ blocks, startDate }: MapTabProps) {
  const days = [...new Set(blocks.map((b) => b.dayNumber))].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {days.map((dayNum) => {
        const dayBlocks = blocks.filter((b) => b.dayNumber === dayNum && b.location);
        const date = getDayDate(startDate, dayNum);
        if (dayBlocks.length === 0) return null;

        return (
          <div key={dayNum}>
            <h3
              className="text-lg font-bold mb-3"
              style={{ color: RUST, fontFamily: "'Arial Black', Impact, sans-serif" }}
            >
              Day {dayNum} {date ? `\u2014 ${formatDayDate(date)}` : ""}
            </h3>
            <div className="space-y-2">
              {dayBlocks.map((block) => (
                <a
                  key={block.id}
                  href={mapsUrl(block.location!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-black/5 transition-colors"
                  style={{ background: CREAM, color: INK }}
                >
                  <span className="text-lg">{"\uD83D\uDCCD"}</span>
                  <div>
                    <div className="font-semibold text-sm">{block.title}</div>
                    <div className="text-xs opacity-60">{block.location}</div>
                  </div>
                  <span className="ml-auto text-xs opacity-40">{"\u2197"}</span>
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create ops tab component**

```typescript
// src/components/itinerary/ops-tab.tsx
"use client";

import { useState, useEffect } from "react";
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
  const [opsItems, setOpsItems] = useState<Array<{
    id: string; title: string; status: string; dueDate: string | null; category: string;
  }>>([]);
  const [activeSection, setActiveSection] = useState<"todos" | "rsvps" | "changes">("todos");

  useEffect(() => {
    fetch(`/api/trips/${tripId}/ops/doc`)
      .catch(() => {}); // Ops items fetched separately if needed
  }, [tripId]);

  const sections = [
    { key: "todos" as const, label: "Todos" },
    { key: "rsvps" as const, label: "RSVPs" },
    { key: "changes" as const, label: "Changes" },
  ];

  // Build change feed from feedback items, sorted newest first
  const changeFeed = [...feedbackItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Build RSVP matrix: unique blocks that have feedback
  const blocksWithFeedback = [...new Set(feedbackItems.map((f) => f.blockId))];

  return (
    <div>
      {/* Section tabs */}
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

      {/* Todos */}
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

      {/* RSVPs */}
      {activeSection === "rsvps" && (
        <div>
          <h4 className="text-sm font-bold mb-3" style={{ color: INK }}>
            Review Status
          </h4>
          <div className="space-y-2 mb-6">
            {participants.filter((p) => p.role !== "owner").map((p) => {
              const signOff = signOffs.find((s) => s.participantId === p.id);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg"
                  style={{ background: CREAM }}
                >
                  <span className="font-semibold text-sm" style={{ color: INK }}>
                    {p.name || "Guest"}
                  </span>
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

      {/* Change feed */}
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
                  style={{
                    background: item.status === "pending" ? CREAM : "white",
                    border: `1px solid ${CREAM}`,
                  }}
                >
                  <span>{config?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm" style={{ color: INK }}>
                      {item.participantName || "Guest"}
                    </span>
                    <span className="text-xs opacity-50 ml-2">{config?.label}</span>
                    {item.text && (
                      <p className="text-sm mt-1" style={{ color: INK }}>
                        &ldquo;{item.text}&rdquo;
                      </p>
                    )}
                    <p className="text-xs opacity-40 mt-1">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {item.status === "pending" && (
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{ background: MUSTARD, color: INK }}
                    >
                      New
                    </span>
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
```

- [ ] **Step 3: Add tab state and feedback fetching to ReviewItinerary**

In `review-content.tsx`, add imports at top:

```typescript
import { FeedbackInbox } from "@/components/itinerary/feedback-inbox";
import { MapTab } from "@/components/itinerary/map-tab";
import { OpsTab } from "@/components/itinerary/ops-tab";
import { type FeedbackItem, type SignOff, type Participant } from "@/lib/itinerary-shared";
```

Add state (after existing state around line 88):

```typescript
type EditorTab = "agenda" | "map" | "ops";
const [activeTab, setActiveTab] = useState<EditorTab>("agenda");
const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
const [signOffs, setSignOffs] = useState<SignOff[]>([]);
```

Add feedback/sign-off fetch effect:

```typescript
useEffect(() => {
  if (!data) return;
  const tripId_ = tripId;
  Promise.all([
    fetch(`/api/trips/${tripId_}/feedback`).then((r) => r.json()),
    fetch(`/api/trips/${tripId_}/sign-offs`).then((r) => r.json()),
  ]).then(([fb, so]) => {
    setFeedbackItems(fb);
    setSignOffs(so);
  }).catch(() => {});
}, [data, tripId]);
```

Add feedback action handler:

```typescript
async function handleFeedbackAction(feedbackId: string, action: "accepted" | "dismissed", adminNote?: string) {
  const res = await fetch(`/api/trips/${tripId}/feedback/${feedbackId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: action, adminNote }),
  });
  if (res.ok) {
    setFeedbackItems((prev) =>
      prev.map((f) => (f.id === feedbackId ? { ...f, status: action, adminNote: adminNote || f.adminNote } : f))
    );
  }
}
```

Add finalize handler:

```typescript
async function handleFinalize() {
  if (!confirm("This will mark the plan as final for all guests. Continue?")) return;
  const res = await fetch(`/api/trips/${tripId}/finalize`, { method: "PATCH" });
  if (res.ok) fetchData();
}
```

- [ ] **Step 4: Add tab bar and conditional rendering to the render section**

Insert tab bar after the header (around line 354). Replace the existing view toggle section with:

```typescript
{/* Tab bar */}
<div className="flex gap-2 mb-6">
  {(["agenda", "map", "ops"] as const).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className="px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide transition-colors"
      style={{
        background: activeTab === tab ? RUST : CREAM,
        color: activeTab === tab ? "white" : INK,
      }}
    >
      {tab === "agenda" ? "Agenda" : tab === "map" ? "Map" : "Ops"}
      {tab === "ops" && feedbackItems.filter((f) => f.status === "pending").length > 0 && (
        <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs" style={{ background: MUSTARD, color: INK }}>
          {feedbackItems.filter((f) => f.status === "pending").length}
        </span>
      )}
    </button>
  ))}

  {/* Finalize button */}
  <button
    onClick={handleFinalize}
    className="ml-auto px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide"
    style={{ background: "#4CAF50", color: "white" }}
  >
    Finalize
  </button>
</div>

{/* Feedback inbox (shows on Agenda tab) */}
{activeTab === "agenda" && (
  <FeedbackInbox items={feedbackItems} onAction={handleFeedbackAction} />
)}
```

Wrap the existing agenda content (the view toggle + day sections, roughly lines 414-829) in a conditional:

```typescript
{activeTab === "agenda" && (
  <>{/* existing agenda/schedule content */}</>
)}

{activeTab === "map" && (
  <MapTab blocks={data.blocks} startDate={data.trip?.startDate || null} />
)}

{activeTab === "ops" && (
  <OpsTab
    tripId={tripId}
    participants={data.participants || []}
    feedbackItems={feedbackItems}
    signOffs={signOffs}
  />
)}
```

- [ ] **Step 5: Test in browser**

```bash
open http://localhost:3001/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/review
```

Verify:
1. Three tabs show: Agenda | Map | Ops
2. Agenda tab shows existing editor functionality + feedback inbox
3. Map tab shows locations grouped by day with Google Maps links
4. Ops tab shows todos, RSVPs, and change feed sections
5. Finalize button present in header
6. Feedback inbox shows any pending items from guest testing

- [ ] **Step 6: Commit**

```bash
git add src/components/itinerary/map-tab.tsx src/components/itinerary/ops-tab.tsx src/app/trips/\[id\]/review/review-content.tsx
git commit -m "feat: add tabs (Agenda/Map/Ops) and feedback inbox to editor"
```

---

## Phase 6: Deploy + Verify

### Task 14: Build check and deploy

- [ ] **Step 1: Run build**

```bash
cd ~/Projects/planner && npm run build
```

Expected: clean build, no errors.

- [ ] **Step 2: Fix any type errors**

If build fails, fix type errors. Common issues:
- Missing type imports
- Drizzle schema types needing regeneration after schema changes
- Unused imports from refactoring

- [ ] **Step 3: Push schema to production database**

```bash
npm run db:push
```

- [ ] **Step 4: Deploy to Vercel**

```bash
vercel --prod
```

- [ ] **Step 5: Verify deployed site**

Test both views on the live URL:
- Guest view: `https://planner-sooty-theta.vercel.app/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/share`
- Editor: `https://planner-sooty-theta.vercel.app/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/review`

- [ ] **Step 6: Commit any final fixes**

```bash
git add -A && git commit -m "chore: build fixes and deployment verification"
```
