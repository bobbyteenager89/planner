# Planner: Editor + Guest Feedback System

**Date:** 2026-04-10
**Status:** Approved
**Approach:** Evolve existing pages (Approach A)

## Overview

Transform the planner from a one-way "admin builds, guests view" tool into a collaborative feedback loop. Three views serve different purposes in a linear flow:

1. **Presentation** (admin) — one-time AI walkthrough after surveys complete
2. **Editor** (admin) — tabbed workbench for ongoing refinement
3. **Guest View** (everyone) — see the plan, react, propose changes

Guest feedback flows into the Editor. Admin accepts, dismisses, or edits based on feedback. Manual finalize button marks the plan as final.

## Architecture

### Route Structure

| Route | View | Access |
|-------|------|--------|
| `/trips/[id]/review` | Presentation + Editor | Admin only (owner + co_admin) |
| `/trips/[id]/share` | Guest View | Everyone (no auth) |

Presentation and Editor share the same route. First visit after generation shows the walkthrough. Admin dismisses it and lands in Editor. A `presentationDismissed` boolean on `itineraries` tracks this. Admin can re-trigger from a menu.

### Shared Components (extract from existing)

- `<BlockCard>` — renders a single activity block (both editor and guest)
- `<DaySection>` — groups blocks by day with header
- `<FeedbackBadge>` — shows feedback count per block
- `<ThreeDotMenu>` — context menu (different options for admin vs guest)

These are extracted from the existing `review-content.tsx` (857 lines) and `guest-itinerary.tsx` (450 lines).

## Guest View (`/share`)

### Entry Flow

1. Guest opens `/trips/[id]/share`
2. First visit: name picker dropdown listing all participants. Selection stored in localStorage + cookie
3. Subsequent visits: remembered, shows "Viewing as [Name]" with option to switch

### Top Banner — Sign-off

Prominent banner: "How's this look?" with two buttons:
- **"Looks great! I'm in"** — marks guest as reviewed/approved in `sign_offs` table
- **"I have some feedback"** — scrolls to first item, hints at 3-dot menus

Admin sees review status in Editor: "5/7 reviewed — Clark, Alicia, Mom approved. Corban, Maddie haven't looked yet."

### Per-Item 3-Dot Menu

Structured feedback categories, each with optional freeform text:

| Option | Type enum | Text required? |
|--------|-----------|----------------|
| Love this | `love` | No |
| Propose alternative | `propose_alternative` | Yes — freeform idea |
| Different time | `different_time` | Yes — freeform suggestion |
| I'll skip this one | `skip` | Optional — reason |
| Add a note | `note` | Yes — freeform |

Each creates a `feedback_items` row linked to the block and participant.

### DRAFT / FINAL Badge

- When itinerary status is `reviewing`: subtle "DRAFT — your feedback helps shape the final plan" badge
- After admin finalizes: badge changes to "FINAL" with finalization date

### Design Updates (Evolutionary)

- Body text: 16px minimum, line-height 1.6
- More whitespace between blocks (increased padding/margins)
- Same cream/rust/mustard palette
- Same Arial Black headings
- Photos remain edge-to-edge banners

## Editor (`/review`)

### Tab Bar: Agenda | Map | Ops

#### Agenda Tab (default)

All existing features preserved:
- Inline block editing (title, description, times, location)
- Drag-to-reorder via @dnd-kit
- Pin/unpin blocks
- Per-day regeneration
- Version selector
- AI reasoning toggle (schedule vs reasoning view)

New features:
- **Feedback inbox** — collapsible panel at top showing unread feedback items grouped by block. Badge count: "3 new items."
- **Per-block feedback indicators** — small badges on each block. Click to expand inline feedback with admin actions: Accept | Dismiss | Note (reply visible to guest)
- **Finalize button** — header action. Changes itinerary status from `reviewing` to `finalized`. Confirmation dialog.

#### Map Tab

List of all locations by day with Google Maps links. Same approach as current — external links, no embedded maps.

#### Ops Tab

- **Todos** — existing `opsItems` checklist. Status badges, due dates, booking windows.
- **RSVPs** — auto-generated matrix from feedback. Activities as rows, participants as columns. Shows: in (love/approve), out (skip), alternative proposed. Quick headcount view.
- **Households** — configurable groups for display and headcount defaults. Big Sky: Clark+Alicia+kids, Corban+Maddie, Mom+Dad, Andrew solo.
- **Change feed** — chronological list of new feedback, mind-changes, sign-offs. Unread badge. Example: "Corban changed from 'Love it' to 'I'll skip' on Whitewater Rafting — 2 hours ago."

## Data Model

### New Tables

#### `feedback_items`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| tripId | uuid | FK trips |
| blockId | uuid | FK itinerary_blocks |
| participantId | uuid | FK participants |
| type | enum | `love`, `propose_alternative`, `different_time`, `skip`, `note` |
| text | text | Nullable (not required for `love`) |
| status | enum | `pending`, `accepted`, `dismissed` |
| adminNote | text | Nullable — admin reply |
| createdAt | timestamp | |

#### `sign_offs`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| tripId | uuid | FK trips |
| participantId | uuid | FK participants |
| status | enum | `approved`, `has_feedback` |
| createdAt | timestamp | |

#### `households`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| tripId | uuid | FK trips |
| name | text | Display name: "The Clarks" |
| sortOrder | int | Display ordering |

#### `household_members`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| householdId | uuid | FK households |
| participantId | uuid | FK participants (unique per trip) |

### Existing Table Changes

- `participants.role`: add `co_admin` enum value
- `itineraries`: add `presentationDismissed` boolean (default false)

### Unchanged Tables

`itinerary_blocks`, `reactions`, `trips`, `opsItems`, `opsTokens`, `researchItems`, `preferences`, `users`

The existing `reactions` table stays for survey-phase voting. `feedback_items` handles post-generation social feedback — different lifecycle, different UI.

## API Endpoints

### New

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/trips/[id]/feedback` | List feedback items (admin: all, guest: own) |
| POST | `/api/trips/[id]/feedback` | Create feedback item (guest) |
| PATCH | `/api/trips/[id]/feedback/[feedbackId]` | Update status/adminNote (admin) |
| POST | `/api/trips/[id]/sign-off` | Create/update sign-off (guest) |
| GET | `/api/trips/[id]/sign-offs` | List all sign-offs (admin) |
| GET | `/api/trips/[id]/households` | List households + members |
| POST | `/api/trips/[id]/households` | Create/update household config (admin) |
| PATCH | `/api/trips/[id]/finalize` | Set itinerary status to finalized (admin) |

### Existing (unchanged)

All current block editing, pin, reorder, generate, ops endpoints remain as-is.

## Guest Identity

- No auth required. Guest selects name from dropdown of trip participants on first visit.
- Stored in localStorage (`planner_guest_${tripId}`) and a cookie for API calls.
- API endpoints accept `participantId` from cookie/header — honor system, not secure auth.
- Admin co-admin access continues to use existing NextAuth/Clerk auth.

## Bug Fix: Loading Issue

Both deployed (503) and local dev show "Loading your trip..." with the API returning 200/37 blocks. Root cause TBD — likely Clerk middleware interception or client-side fetch failure. Fix as prerequisite before feature work.

## Scope Boundaries

**In scope:**
- Guest View with feedback + sign-off
- Editor tabs (Agenda + feedback inbox, Map, Ops)
- Data model (feedback_items, sign_offs, households)
- Finalize workflow
- Typography/readability improvements
- Loading bug fix

**Out of scope (future):**
- Twilio SMS notifications
- Embedded interactive maps
- Email digests
- Per-person custom itineraries
- Secondary/parallel plan creation (mentioned but deferred)
