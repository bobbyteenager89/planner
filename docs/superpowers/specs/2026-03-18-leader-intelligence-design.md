# Leader Intelligence — Design Spec

## Overview

Enhance the leader dashboard at `/trips/[id]/dashboard` with AI-powered decision support: per-item vote insights, conflict detection, scheduling intelligence, and participant engagement tools. Builds directly on the dashboard shipped in Session 5.

**Scope:** Big Sky trip format. Builds on existing `aggregateBigSkyVotes()` utility and dashboard components.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tiebreak approach | AI-powered recommendations | Most useful — analyzes context, not just numbers |
| AI format | Inline per-item insights | Contextual, right where the data is |
| Insight generation | Batch on button click | One round-trip, simple, can be re-triggered |
| Conflict detection | Pure computation (no AI) | Simple yes+pass overlap check, fast |
| Scheduling intelligence | AI preview on button click | Rough framework, not full itinerary |
| Nudge method | Email via Resend + copy link | Both automated and manual options |
| Existing AI summary | Kept as-is | Different purpose — narrative vs granular |

## Feature 1: Conflict Detection

**Pure logic enhancement — no AI, no new routes.**

### Data Model Change

Add to `VoteTally` interface in `src/lib/bigsky-dashboard.ts`:

```ts
conflicted: boolean;        // true if any voter said "yes" AND any said "pass"
conflictPairs: { yesVoter: string; passVoter: string }[];
```

### Logic

Conflict computation happens in the final `.map()` call of `tallyVotes()` (after all participants have been tallied), not mid-loop:
- In the existing `.map((t) => ({ ...t, enthusiasm: ... }))` step, also compute:
- `conflicted`: `t.yes > 0 && t.pass > 0`
- `conflictPairs`: filter `t.voters` for "yes" voters and "pass" voters, pair each yes with each pass

### Display

- Conflicted items show a small rust-colored "Split" badge next to their label
- Tapping/clicking the badge expands to show conflict pairs: "Andrew: Yes! vs Dad: Pass"
- Non-conflicted items show nothing extra

### Files

- Modify: `src/lib/bigsky-dashboard.ts`
- Modify: `src/app/trips/[id]/dashboard/dashboard-content.tsx`

## Feature 2: Per-Item AI Insights (Batch)

### API Route

`POST /api/trips/[id]/insights`

**Auth:** Owner-only (same pattern as summary route).

**Flow:**
1. Load all preferences, run `aggregateBigSkyVotes()`
2. Build prompt with full vote data per item
3. Claude Haiku returns JSON array of insights

**Prompt strategy:** Send the vote tallies per item, including both `id` and `label` for each item, and instruct Haiku to return a JSON array using the `id` values (so the client can match insights to tallies):
```
Here are the vote results. For each item I'm giving you the id and label.

Activities:
- id: "fly-fishing", label: "Fly Fishing (Gallatin River)": 5 yes, 2 fine, 1 pass
...

For each item, return: { "itemId": "<the id value>", "insight": "...", "signal": "consensus|split|low_interest|conflict" }
```

Signal must be one of: "consensus" (most people agree), "split" (polarized votes), "low_interest" (mostly pass/fine), "conflict" (yes vs pass tension)

**Empty state:** If `completedCount === 0`, return a 200 with an empty JSON array `[]` without calling Haiku.

**Response:** Single JSON blob (not streaming — small payload). Parsed client-side. Match insights to tallies by `itemId` only (ignore `category` field if present — simpler and more tolerant of Haiku output variations).

### Response Shape

```ts
interface ItemInsight {
  itemId: string;
  insight: string;
  signal: "consensus" | "split" | "low_interest" | "conflict";
}
```

**Note:** No `category` field — match insights to tallies by `itemId` alone. This is more tolerant of Haiku output variations. If Haiku returns extra fields, ignore them.

### Display

Below each vote bar, when insights are loaded:
- Green dot (#4ade80) + insight text for "consensus"
- Yellow dot (#EBB644) + insight text for "split"
- Rust dot (#D14F36) + insight text for "conflict"
- Gray dot + insight text for "low_interest"

### Files

- Create: `src/app/api/trips/[id]/insights/route.ts`
- Modify: `src/app/trips/[id]/dashboard/dashboard-content.tsx`

## Feature 3: Scheduling Intelligence

### API Route

`POST /api/trips/[id]/schedule-preview`

**Auth:** Owner-only.

**Flow:**
1. Load trip (need `startDate`, `endDate`)
2. **Guard:** If either `startDate` or `endDate` is null, return 400 with message "Trip dates must be set before generating a schedule preview"
3. Load votes via `aggregateBigSkyVotes()`
4. **Guard:** If `completedCount === 0`, return 400 with message "No completed responses yet"
5. Calculate number of available days from dates
6. Claude Haiku generates rough day-by-day framework

**Prompt strategy:** Provide:
- Vote data sorted by enthusiasm
- Number of days available, with actual dates
- Fixed-date events hardcoded in the prompt (not parsed from config): "Rodeo at Lone Mountain Ranch is only on Tuesday July 21. Farmers Market is only on Wednesday July 22 (5-8 PM)." These are known constraints for the Big Sky trip.
- Instruct: "Assign top-voted activities to days. Mark split items as optional. Include free time. Respect fixed dates. Output JSON."

**Response shape:**
```ts
interface ScheduleDay {
  dayNumber: number;
  date: string;          // "July 18" format
  slots: ScheduleSlot[];
}

interface ScheduleSlot {
  time: "morning" | "afternoon" | "evening";
  activity: string;
  signal: "consensus" | "split" | "optional";
  note: string;          // e.g. "Make optional — group is split"
}
```

### Display

Rendered in a retro-styled card below the AI Tools section:
- Vertical timeline layout, one card per day
- Each slot shows time of day, activity name, signal badge, and note
- Retro styling consistent with dashboard (cream/rust/mustard)
- Not persisted — regenerate anytime

### Files

- Create: `src/app/api/trips/[id]/schedule-preview/route.ts`
- Modify: `src/app/trips/[id]/dashboard/dashboard-content.tsx`

## Feature 4: Participant Engagement

### Schema Change

Add to `participants` table in `src/db/schema.ts`:

```ts
lastRemindedAt: timestamp("last_reminded_at", { mode: "date" }),
```

Nullable, no default. Run `npm run db:push` to apply.

### API Route

`POST /api/trips/[id]/remind`

**Auth:** Owner-only.

**Body:** `{ participantId: string }`

**Flow:**
1. Load participant by querying with BOTH `id = participantId` AND `tripId = id` (from route param) — prevents cross-trip manipulation
2. If not found, return 404
3. Check `lastRemindedAt` — if within 24 hours, return 429 with message "Reminder already sent recently"
4. Send nudge email via Resend with survey link: `${BASE_URL}/trips/${tripId}/intake` (public URL, no token needed for Big Sky)
5. Update `lastRemindedAt` to now
6. Return 200

### Email Template

`src/lib/email/survey-reminder.ts`

Simple nudge email:
- Subject: "Reminder: Share your preferences for [trip title]"
- Body: "Hey [name], [owner name] is planning a trip to [destination] and would love your input. Click below to fill out a quick survey." + survey link button

Uses same Resend pattern as `src/lib/email/itinerary-ready.ts`.

**Survey URL:** `${process.env.NEXTAUTH_URL || 'https://planner-sooty-theta.vercel.app'}/trips/${tripId}/intake` — public URL, no token needed for Big Sky's anonymous intake.

### Display Changes

**Participant interface change:** The `Participant` interface in `dashboard-content.tsx` must be extended:
```ts
interface Participant {
  id: string;
  name: string;
  status: string;
  createdAt: string;            // ISO string for relative time display
  lastRemindedAt: string | null; // ISO string, for 24h rate-limit check client-side
}
```

The server page (`page.tsx`) must be updated to select and pass `createdAt` and `lastRemindedAt` from the participants query.

**Copy Link URL:** The intake URL for Big Sky is `${window.location.origin}/trips/${tripId}/intake` (public, no token). No `inviteToken` needed for this trip format.

In the participant tracker section of `dashboard-content.tsx`:

- Non-completed participants get:
  - "Remind" button (sends POST to `/api/trips/[id]/remind`) — shows "Sent!" for 3 seconds on success, disabled if `lastRemindedAt` is within 24h
  - "Copy Link" button (copies intake URL to clipboard) — shows "Copied!" briefly
- Show relative time: "Invited 3 days ago" computed from `createdAt`
- Completed participants unchanged (just name + checkmark)

### Files

- Create: `src/app/api/trips/[id]/remind/route.ts`
- Create: `src/lib/email/survey-reminder.ts`
- Modify: `src/db/schema.ts` (add `lastRemindedAt`)
- Modify: `src/app/trips/[id]/dashboard/dashboard-content.tsx`

## Dashboard Layout (Updated)

Order of sections on `/trips/[id]/dashboard`:

1. **Retro Header** (existing — Big Sky branding)
2. **Participant Tracker** (enhanced — remind buttons, copy link, relative time)
3. **Vote Breakdown: Activities** (enhanced — conflict badges, inline insights)
4. **Vote Breakdown: Restaurants** (same enhancements)
5. **Vote Breakdown: Chefs** (same enhancements)
6. **AI Tools** (new section — groups three AI buttons):
   - "Analyze Votes" → populates inline insights on vote bars above
   - "Preview Schedule" → renders schedule preview below
   - "Generate Summary" → streams narrative summary below (existing behavior relocated)

   **Refactor note:** The existing `AISummarySection` component manages its own streaming state internally. When relocating it into the AI Tools section, keep it as a self-contained component — don't lift its state. The AI Tools section is just a layout wrapper that groups the three buttons visually. Each button's state (loading, result) remains in its own component.
7. **Schedule Preview** (appears after button click, retro card)
8. **AI Summary** (appears after button click, existing behavior)
9. **Suggestions** (existing — open text entries)
10. **Generate Itinerary** button (existing)

## File Summary

### New Files (4)

| File | Type | Purpose |
|------|------|---------|
| `src/app/api/trips/[id]/insights/route.ts` | API Route | Batch per-item AI insights |
| `src/app/api/trips/[id]/schedule-preview/route.ts` | API Route | Day-by-day schedule preview |
| `src/app/api/trips/[id]/remind/route.ts` | API Route | Send reminder email |
| `src/lib/email/survey-reminder.ts` | Email template | Reminder nudge email |

### Modified Files (4)

| File | Change |
|------|--------|
| `src/lib/bigsky-dashboard.ts` | Add `conflicted`, `conflictPairs` to VoteTally, compute in `tallyVotes()` |
| `src/app/trips/[id]/dashboard/page.tsx` | Pass `createdAt` and `lastRemindedAt` in participant data to client component |
| `src/app/trips/[id]/dashboard/dashboard-content.tsx` | Extend Participant interface, conflict badges, AI insights display, AI tools section, schedule preview, reminder buttons, copy link, relative time |
| `src/db/schema.ts` | Add `lastRemindedAt` timestamp to participants table |

### Schema Change

One new nullable column on `participants`:
```sql
ALTER TABLE participants ADD COLUMN last_reminded_at TIMESTAMP;
```

Applied via `npm run db:push` (Drizzle push, no migration file needed).

## Visual Reference

**Existing palette (unchanged):**
- RUST: `#D14F36`
- MUSTARD: `#EBB644`
- CREAM: `#F3EBE0`
- CARD_BG: `#EBE1D3`

**New signal colors for insights:**
- Consensus: `#4ade80` (green-400)
- Split: `#EBB644` (mustard — existing)
- Conflict: `#D14F36` (rust — existing)
- Low interest: `#a8a29e` (stone-400)

## Dependencies

- Resend SDK (already installed — used by invite and itinerary-ready emails)
- Anthropic SDK (already installed — Claude Haiku for insights + schedule)
- No new npm packages needed
