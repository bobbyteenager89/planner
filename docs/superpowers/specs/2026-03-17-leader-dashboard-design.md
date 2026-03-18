# Leader Dashboard — Design Spec

## Overview

A standalone dashboard at `/trips/[id]/dashboard` where the trip owner can view aggregated participant responses, see who's completed the survey, read an AI-generated preference summary, and trigger itinerary generation — all in one place.

**Scope:** Big Sky trip format only. Generalization deferred to a future session.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Location | `/trips/[id]/dashboard` (standalone page) | Keeps trip detail page clean, gives dashboard room |
| Primary view | Activity vote breakdown (horizontal bars) | Scannable at a glance, shows consensus clearly |
| Scope | Big Sky format only | Ship fast, generalize later |
| Secondary features | Participant tracker, AI summary, generate button | Full leader toolkit in one view |
| Access | Owner-only (auth required) | Participants don't see aggregate votes |
| Visual style | Retro Big Sky theme (cream/rust/mustard) | Matches the intake experience |
| Vote display | Horizontal stacked bars, sorted by enthusiasm | Easy to scan, clear ranking |
| Architecture | Server Component + Server Action for AI | Simple, fast, fits existing patterns |

## Data Flow

```
1. Server Component (page.tsx)
   ├── Auth check: session user === trip.ownerId → 404 if not
   ├── Query: trip + participants + preferences (single join)
   └── Pass data to client component

2. aggregateBigSkyVotes(preferences[])
   ├── Parse each preference.rawData (BigSkyAnswers shape)
   ├── Tally yes/fine/pass per activity, restaurant, chef
   ├── Sort by enthusiasm score: yes + (fine * 0.5)
   └── Return grouped results with voter details

3. Dashboard renders:
   ├── Participant tracker (completion status)
   ├── Vote breakdown (3 sections: activities, restaurants, chefs)
   └── AI summary + Generate Itinerary (actions)

4. AI Summary (on-demand Server Action)
   ├── Load all completed preferences
   ├── Build prompt with aggregated votes + open-text responses
   ├── Stream Claude Haiku response
   └── Display in retro-styled card (not persisted)
```

## Page Layout

### Header
Same Big Sky retro header as the intake page:
- Rust (#D14F36) background
- "BIG SKY" title with mustard text shadow
- Trip dates and destination
- Subtitle: "TRIP LEADER DASHBOARD" in mustard

### Section 1: Participant Tracker
- Compact row of participant pills/badges
- Each shows: name + status icon (completed/in-progress/invited)
- Status comes from `participants.status` field (not rawData)
- Summary count: "7 of 10 completed"
- Cream card with rust border, matching intake card style

### Section 2: Vote Breakdown (main content)
Three subsections, each with a retro `SectionHeader` divider:

**Activities:**
- One horizontal bar row per activity (all activity IDs found in rawData.activityVotes, labels from ACTIVITIES in bigsky-config)
- Bar segments: rust = "Yes!", mustard = "Fine with it", muted cream = "Pass"
- Vote counts shown inline to the right of each bar
- Sorted by enthusiasm score (yes + fine*0.5) descending
- Activity name as label on the left

**Restaurants:**
- Same bar format
- All restaurant IDs found in rawData.dinnerVotes, labels from DINNER_SPOTS in bigsky-config

**Chefs:**
- Same bar format
- From CHEF_OPTIONS in bigsky-config

### Section 3: AI Summary + Actions
- "Generate Summary" button → streams Claude Haiku narrative
- Summary rendered in cream card with rust border when generated
- "Suggestions from the Group" — raw open-text quotes with participant names
- "Generate Itinerary" button — calls existing `POST /api/trips/[id]/generate` endpoint

### Mobile
- Single column, sections stack naturally
- Bar labels move above bars on narrow screens
- Touch-friendly button sizing

## Vote Aggregation

### Function: `aggregateBigSkyVotes()`

**Location:** `src/lib/bigsky-dashboard.ts`

**Input:** Array of preferences records with rawData.

**Output per item:**
```ts
interface VoteTally {
  id: string;          // e.g. "fly-fishing"
  label: string;       // display name from bigsky-config
  yes: number;
  fine: number;
  pass: number;
  total: number;       // participants who voted on this item
  enthusiasm: number;  // yes + (fine * 0.5), for sorting
  voters: { name: string; vote: "yes" | "fine" | "pass" }[];
}

interface AggregatedVotes {
  activities: VoteTally[];
  restaurants: VoteTally[];
  chefs: VoteTally[];
  participantCount: number;
  completedCount: number;
}
```

**Rules:**
- Items sorted by enthusiasm score descending
- Participants who didn't vote on an item are not counted (not treated as "pass")
- If `dinnerVotes` is absent from a rawData record, skip that participant's restaurant contribution entirely
- Activity votes include main activities + honorable mentions (merged in rawData.activityVotes at save time)
- Dinner votes include main restaurants + honorable mentions (merged in rawData.dinnerVotes at save time)
- Labels resolved by matching IDs against bigsky-config constants (ACTIVITIES, DINNER_SPOTS, CHEF_OPTIONS). For IDs not found in config (e.g. honorable mention activities defined only in the intake component), use a humanized fallback: replace hyphens with spaces, title-case

## AI Summary

**Trigger:** Manual — leader clicks "Generate Summary" button.

**Implementation:** Server Action in `src/app/trips/[id]/dashboard/actions.ts`.

**Steps:**
1. Load all completed preferences for the trip
2. Run aggregateBigSkyVotes to get structured vote data
3. Collect all open-text responses with participant names
4. Build prompt: "Summarize this group's preferences in 3-4 paragraphs. Highlight consensus, conflicts, and recommendations."
5. Call Claude Haiku (streaming)
6. Stream response to client

**Display:** Retro-styled cream card. Not persisted to DB — cheap to regenerate, and the underlying vote data is the source of truth.

**Open text:** Each participant's free-form suggestions displayed as a separate "Suggestions from the Group" list — raw quotes with names attributed.

## File Structure

### New Files
| File | Type | Purpose |
|------|------|---------|
| `src/app/trips/[id]/dashboard/page.tsx` | Server Component | Auth check, data fetch, renders dashboard |
| `src/app/trips/[id]/dashboard/dashboard-content.tsx` | Client Component | Interactive UI (AI streaming, hover states) |
| `src/app/trips/[id]/dashboard/actions.ts` | Server Action | AI summary generation |
| `src/lib/bigsky-dashboard.ts` | Pure utility | `aggregateBigSkyVotes()` function |

### Modified Files
| File | Change |
|------|--------|
| `src/app/trips/[id]/trip-content.tsx` | Add "View Responses" link, owner-only, visible during intake+ status |

### No Changes
- No new DB tables or schema changes
- No new API routes
- No new dependencies

## Visual Reference

**Color constants (from intake):**
- RUST: `#D14F36`
- MUSTARD: `#EBB644`
- CREAM: `#F3EBE0`
- CARD_BG: `#EBE1D3`

**Typography:** Arial Black for headings (uppercase, tight tracking), system-ui for body text.

**Components reused from intake pattern:**
- SectionHeader (rust divider + heading)
- Card styling (cream bg, rust border, 2px radius)
- Button styling (mustard bg, rust border, box-shadow)

## rawData Shape Reference

From `BigSkyAnswers` interface (in bigsky-actions.ts):
```ts
{
  name: string;
  email?: string;
  partySize: number;
  activityVotes: Record<string, "yes" | "fine" | "pass">;  // main + honorable mention activities
  chefVotes: Record<string, "yes" | "fine" | "pass">;
  dinnerVotes?: Record<string, "yes" | "fine" | "pass">;   // OPTIONAL — main + honorable mention restaurants
  openText?: string;
}
```

**Note:** `completedAt` (ISO timestamp) and `surveyType: "bigsky"` are injected at save time in `saveBigSkyAnswers()` — they are NOT part of the `BigSkyAnswers` interface but will be present in stored rawData. `partySize` is available in rawData and can be included in the AI summary prompt for group composition context.
```
