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

In `tallyVotes()`, after building the tally for each item:
- Check if `yes > 0 && pass > 0`
- If so, set `conflicted: true`
- Build `conflictPairs` by pairing each "yes" voter with each "pass" voter from the `voters` array

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

**Prompt strategy:** Send the vote tallies per item and instruct Haiku to return a JSON array:
```
For each item, return: { "itemId": "fly-fishing", "category": "activity", "insight": "Strong consensus — book early", "signal": "consensus" }

Signal must be one of: "consensus" (most people agree), "split" (polarized votes), "low_interest" (mostly pass/fine), "conflict" (yes vs pass tension)
```

**Response:** Single JSON blob (not streaming — small payload). Parsed client-side.

### Response Shape

```ts
interface ItemInsight {
  itemId: string;
  category: "activity" | "restaurant" | "chef";
  insight: string;
  signal: "consensus" | "split" | "low_interest" | "conflict";
}
```

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
1. Load votes + trip dates (startDate, endDate)
2. Calculate number of available days
3. Claude Haiku generates rough day-by-day framework

**Prompt strategy:** Provide:
- Vote data sorted by enthusiasm
- Number of days available
- Fixed-date events (Rodeo = Tuesday July 21, Farmers Market = Wednesday July 22 — from activity metadata)
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
1. Load participant, verify they belong to this trip
2. Check `lastRemindedAt` — if within 24 hours, return 429
3. Send nudge email via Resend with survey link
4. Update `lastRemindedAt` to now
5. Return 200

### Email Template

`src/lib/email/survey-reminder.ts`

Simple nudge email:
- Subject: "Reminder: Share your preferences for [trip title]"
- Body: "Hey [name], [owner name] is planning a trip to [destination] and would love your input. Click below to fill out a quick survey." + survey link button

Uses same Resend pattern as `src/lib/email/itinerary-ready.ts`.

### Display Changes

In the participant tracker section of `dashboard-content.tsx`:

- Non-completed participants get:
  - "Remind" button (sends email) — shows "Sent!" for 3 seconds on success, disabled if reminded within 24h
  - "Copy Link" button (copies intake URL to clipboard) — shows "Copied!" briefly
- Show relative time: "Invited 3 days ago" for non-responders
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

### Modified Files (3)

| File | Change |
|------|--------|
| `src/lib/bigsky-dashboard.ts` | Add `conflicted`, `conflictPairs` to VoteTally, compute in `tallyVotes()` |
| `src/app/trips/[id]/dashboard/dashboard-content.tsx` | Conflict badges, AI insights display, AI tools section, schedule preview, reminder buttons, copy link, relative time |
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
