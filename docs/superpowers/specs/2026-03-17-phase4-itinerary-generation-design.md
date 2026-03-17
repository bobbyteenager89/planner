# Phase 4: Itinerary Generation + Reactions

## Overview

Owner-triggered AI itinerary generation that aggregates all participant preferences, streams blocks in real-time, and supports a reaction/revision loop until the group is happy.

## Decisions

- **Trigger:** Owner manually hits "Generate Itinerary" (not auto)
- **Reactions:** Per-block (love/fine/rather not/hard no) + general comments per itinerary version
- **Revisions:** Unlimited versions, full history preserved
- **Generation UX:** Streaming — blocks appear one by one
- **Pinning:** Owner only — pinned blocks survive regeneration
- **Notifications:** Email via Resend when itinerary ready / new version
- **Design:** Light, readable palette (diverging from intake's dark theme)
- **Architecture:** Single streaming API route (Approach A)

## Data Flow

1. Owner hits "Generate Itinerary" on trip page (trip status must be `intake` or `reviewing`, ≥1 participant completed)
2. POST `/api/trips/[id]/generate` — auth-checked, owner only
3. **Synchronous pre-stream:** set `trip.status = 'generating'` immediately (so participants see "Itinerary being created..."). Also gate: reject if status is already `generating` (prevents double-tap).
4. **Server-side guard:** verify ≥1 participant has `status = 'completed'` before proceeding. Don't trust the client.
5. Server aggregates: trip details, onboarding conversation, all participant preferences, prior reactions (if revision)
6. Claude Sonnet 4.6 generates structured JSON blocks via streaming
7. Client renders blocks as they arrive (green fade-in, typing indicator)
8. After stream completes: client sends parsed blocks back to a persist endpoint OR the route buffers the full response and writes after stream ends
9. **Persist with confirmation:** create itinerary + blocks in DB, set `trip.status = 'reviewing'`. If DB write fails, set `trip.status` back to prior state (`intake` or `reviewing`) so the owner can retry. Client polls `GET /itinerary` after stream to confirm blocks exist.
10. Send "Itinerary Ready" email to all participants via Resend (fire-and-forget — email failure is non-critical)
11. Participants react to blocks + leave general comments
12. Owner reviews reactions, pins keepers, hits "Regenerate" → new version (step 2 again with reaction context)

## API Routes

### POST `/api/trips/[id]/generate`
Stream itinerary generation. Auth: owner only.

- **Guards:** trip.status must be `intake` or `reviewing` (reject `generating`). ≥1 participant completed.
- **Pre-stream:** set trip.status → `generating`
- **Stream format:** NDJSON (newline-delimited JSON). Each line is a complete, parseable JSON object representing one block: `{"dayNumber": 1, "sortOrder": 1, "type": "activity", ...}`. Client calls `JSON.parse()` on each line.
- **Post-stream:** persist itinerary + blocks to DB. On success: trip.status → `reviewing`. On failure: trip.status → previous state.
- **Version numbering:** query `SELECT MAX(version) FROM itineraries WHERE tripId = ?`, then insert with `version + 1` (or 1 if none). Race condition is acceptable — only the owner can generate, and the `generating` status gate prevents concurrent calls.

### GET `/api/trips/[id]/itinerary`
Load current itinerary + blocks + reactions. Auth: any trip participant.

**Response shape:**
```typescript
{
  itinerary: {
    id: string;
    version: number;
    status: string;
    comments: Array<{ participantId: string; name: string; text: string; createdAt: string }>;
    createdAt: string;
  };
  blocks: Array<{
    id: string;
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
    pinned: boolean;
    reactions: Array<{ participantId: string; name: string; reaction: string; note: string | null }>;
    reactionSummary: { love: number; fine: number; rather_not: number; hard_no: number };
  }>;
  versions: Array<{ version: number; createdAt: string }>; // for version switcher
  viewer: { participantId: string; role: string }; // caller's context
}
```

Returns the latest version by default. Optional `?version=N` query param for history.

### POST `/api/trips/[id]/reactions`
Save reaction to a block. Auth: any trip participant.

- **Body:** `{ blockId: string; reaction: "love" | "fine" | "rather_not" | "hard_no"; note?: string }`
- **Behavior:** Upsert — if participant already reacted to this block, replace the reaction. Uses `onConflictDoUpdate` on the `(blockId, participantId)` unique index.
- **`participantId`** derived server-side from session (never accepted from client).

### POST `/api/trips/[id]/comments`
Save general comment on itinerary. Auth: any trip participant.

- **Body:** `{ text: string }`
- **`participantId`** derived server-side from session.
- Appends to `itineraries.comments` JSONB array (read-modify-write on latest itinerary version).

## Schema Changes

One addition to existing schema (Drizzle column definition):

```typescript
// Add to itineraries table in schema.ts
comments: jsonb("comments").default([]),
// Array of { participantId: string, text: string, createdAt: string }
```

All other tables already exist: `itineraries`, `itinerary_blocks`, `reactions`.

**`itineraries.status`:** set to `skeleton` on creation. Transitions: `skeleton` → `finalized` when owner finalizes. (Intermediate states `specifics` and `final_details` are reserved for Phase 5 progressive detail enhancement.)

## Prompt Architecture

New function `buildItineraryPrompt` in `src/lib/ai/prompts.ts`:

```typescript
function buildItineraryPrompt(params: {
  trip: { title: string; destination: string | null; startDate: string | null; endDate: string | null };
  onboardingConversation: Array<{ role: string; content: string }>;
  participants: Array<{ name: string; preferences: PreferencesRow | null }>;
  priorItinerary?: { blocks: BlockRow[]; reactions: ReactionWithName[]; comments: CommentEntry[] };
  pinnedBlocks?: BlockRow[];
}): string
```

System prompt built dynamically with:

1. **Trip context** — destination, dates, duration, group size
2. **Owner's vision** — full onboarding conversation
3. **Participant preferences** — aggregated rawData, activityPreferences, budgets, dietary restrictions, hard nos, must haves
4. **Conflict resolution** — when preferences clash, blend and explain trade-offs in `aiReasoning`
5. **For revisions:** prior blocks with reaction aggregates + general comments

**Pinned block strategy: post-hoc merge.** Pinned blocks are NOT sent to Claude. Instead, after Claude generates the new itinerary, pinned blocks from the prior version are spliced back in at their original `dayNumber`/`sortOrder` positions. Claude is told "Day 1 slot 2 is reserved (pinned)" so it plans around them but doesn't output them. This prevents the model from modifying pinned content.

**Output format:** NDJSON — one complete JSON object per line. Each block: `{dayNumber, sortOrder, type, title, description, startTime, endTime, location, estimatedCost, aiReasoning}`.

**Model:** Claude Sonnet 4.6, `max_tokens: 8192` (a 7-day trip with 6 blocks/day = ~42 blocks, each ~100-150 tokens of JSON = ~5,000-6,000 tokens).

## Trip Page States

File to modify: `src/app/trips/[id]/page.tsx` — extend existing status switch to handle `generating` and `reviewing`.

### Owner View

| Trip Status | UI |
|-------------|-----|
| `intake` | Participant status list + "Generate Itinerary" button (enabled when ≥1 completed) |
| `generating` | Streaming blocks appearing with progress bar (day X of Y) |
| `reviewing` | Full itinerary with reaction aggregates, pin toggles, "Regenerate" + "Finalize" buttons |

### Participant View

| Trip Status | UI |
|-------------|-----|
| `intake` (not done) | "Complete Your Intake" button |
| `intake` (done) | "Waiting for others..." |
| `generating` | "Itinerary being created..." |
| `reviewing` | Full itinerary with reaction buttons + comment box |

## UI Design

Light palette (`bg-stone-50`, `text-stone-900`) for readability on dense content.

### Review Screen
- Version switcher tabs at top
- Day headers grouping blocks
- Each block: time, type badge (color-coded), title, description, location, cost
- Per-block reaction buttons with aggregate counts
- Pin indicator (golden banner) on pinned blocks
- Hard-no highlighting: red background + surfaced notes
- General comments section at bottom
- Owner action bar: reaction progress count, "Regenerate" + "Finalize" buttons

### Streaming Screen
- Progress header with green pulse dot + day progress bar
- Blocks appear with green fade-in background
- Typing indicator (pulsing dots) for next block
- No reaction buttons during generation

### Block Type Badges
- Activity: blue (`bg-blue-100 text-blue-800`)
- Meal: amber (`bg-amber-100 text-amber-800`)
- Transport: indigo (`bg-indigo-100 text-indigo-800`)
- Lodging: purple (`bg-purple-100 text-purple-800`)
- Free Time: green (`bg-green-100 text-green-800`)
- Note: gray (`bg-stone-100 text-stone-600`)

## Email Notifications

### Itinerary Ready
- **To:** All participants
- **Subject:** "Your [destination] trip itinerary is ready!"
- **Body:** [Owner] generated an itinerary. Share your reactions.
- **CTA:** "View Itinerary" → `/trips/[id]`

### New Version
- **To:** All participants
- **Subject:** "Updated itinerary for [destination] (v[N])"
- **Body:** [Owner] revised based on feedback. React to changes.
- **CTA:** "View Updated Itinerary" → `/trips/[id]`

## Out of Scope (Phase 5)
- Finalized itinerary view (read-only, shareable)
- Research feed
- Export to calendar / PDF
- Real-time collaboration / live reactions
