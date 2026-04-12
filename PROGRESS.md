# Planner — Progress Log


## 2026-04-08 — Session 9: Mom-Friendly Rationale Review Page

### Accomplished
- **New public route** `/trips/[id]/share/rationale` — auth-free, read-only review page for sharing the itinerary logic with trusted reviewers (Andrew's mom Sharon)
- **Rationale generator** (`src/lib/ai/rationale.ts`) — server module that calls Claude Sonnet once to synthesize and cache as JSON on `itineraries.ai_reasoning`:
  - `intro`: 4-6 bullet planning priorities
  - `participants`: per-household cards with members, "excited for", "passing on", notes (derived from real per-voter mentions in block reasonings)
  - `days`: 2-3 sentence per-day logic
  - `todos`: pre-trip To Do list grouped into Restaurants / Activities & Tickets / Bookings / Logistics / Supplies
  - Owner can `?regen=1` to force regenerate
- **Fixed wrong group data** — scrubbed every "20 people", "ages 4-69", "4-year-old", "69-year-old", "7 participants" phrase from 5 block reasonings. Actual group = 4 households, 9 people.
- **Deleted redundant Group Kickoff block** — Andrew will handle it at welcome dinner
- **Fixed rodeo timing** — was wrongly mid-morning, moved to Evening 7-9:30 PM (Big Sky PBR runs Thursday nights). Rejiggered Day 6: lunch 12-1 → zipline/scenic drive 1:30-4:30 → early dinner 4:45-6:15 → rodeo 7-9:30
- **Typography pass** — body text bumped to `text-xl` (day logic, descriptions, intro) and `text-lg` (reasonings, todos) for Mom-readable sizes
- **DB ownership fix** — reassigned Big Sky trip from an orphan owner to andrewgoble1@gmail.com
- **Session bug caught and fixed** — imported date helpers from `itinerary-shared.tsx` (`"use client"`) into a server component → prod runtime crash. Fix: inlined helpers in the page.
- **Shipped and sent to Sharon for notes** — awaiting feedback before next build

### Files Created
| File | Purpose |
|------|---------|
| `src/lib/ai/rationale.ts` | Rationale generator: households model + Claude prompt + cache (~220 lines) |
| `src/app/trips/[id]/share/rationale/page.tsx` | Server-component review page (~440 lines) |
| `src/app/trips/[id]/share/rationale/regenerate-button.tsx` | Client component for owner regen |
| `scripts/gen-rationale.ts` | CLI to pre-generate rationale from local env |
| `NEXT_SESSION.md` | Full roadmap: product thesis, CEO review prompts, infra + feature backlog |

### Files Modified
| File | Changes |
|------|---------|
| DB: `itinerary_blocks` (Big Sky) | Scrubbed stale age/count phrases from 5 blocks; deleted Group Kickoff; retimed Day 6 (rodeo → evening) |
| DB: `itineraries.ai_reasoning` (Big Sky) | Now holds full Rationale JSON (intro/participants/days/todos) |
| DB: `trips` (Big Sky) | `owner_id` reassigned to andrewgoble1 |

### Next Steps (Session 10+)
- [ ] **Wait for Sharon's notes** and iterate based on feedback
- [ ] `/plan-ceo-review` of the product — is the "travel agent + social psychology" thesis showing up in the UX?
- [ ] Logging suite — Claude call observability (latency/cost/errors), structured runtime logs
- [ ] Testing pages — e2e on rationale/review/intake/share; add live-route render check to preflight
- [ ] Claude Cowork MD ingestion — ingest strategy/brief MD files as rationale context
- [ ] Google Calendar integration — "Add trip to calendar" per participant
- [ ] Phone home-screen wallpaper generator
- [ ] Twilio SMS roadmap — T-30/14/7/1 + day-of briefings + change alerts
- [ ] Color-coded overview map with all days + hover cards
- [ ] Per-person RSVP + custom itinerary pages (post-Sharon feedback)
- See `NEXT_SESSION.md` for full roadmap

---

## 2026-04-08 — Session 10: Ops Doc + Cowork Report-Back

### Accomplished
- **Caught a real miss:** Corban filled out the survey on 2026-03-28 but `src/lib/ai/rationale.ts` had him bundled as "Maddie speaks for both." Split them into separate voting units — Corban is YES on fly-fishing/rodeo, Maddie is YES on spa-day. Regenerated the rationale.
- **Validated the itinerary already handled it** — Day 4 fly-fishing/spa alternates exactly match the Maddie↔Corban split. No itinerary moves needed.
- **Built the Ops Doc feature** — downloadable markdown brief for Claude Cowork to drive bookings:
  - Schema: added `adult_count`, `kid_count`, `reservation_status`, `reservation_notes`, `booking_window` to `itinerary_blocks`; new `ops_items` and `ops_tokens` tables
  - Seeded 37 Big Sky blocks with headcounts (default 7A+2K; Day 4 fly/spa split to 1A each; other overrides for booked/walk-in/not-needed)
  - Seeded 13 initial todos: 12 owned by Andrew, 1 owned by Maddie (spa booking)
  - `src/lib/ops/markdown.ts` — pure doc generator
  - `GET /api/trips/[id]/ops/doc` — auth-gated markdown download, attachment filename
  - "Download Ops Doc" button on host review page
- **Cowork report-back loop** — `POST /api/trips/[id]/ops/update` with bearer token auth (sha256-hashed in `ops_tokens`). Mint via `scripts/mint-ops-token.mjs`. Verified end-to-end: real update → `{"ok":true,"updated":1}`, revoked token → 401.
- **Middleware carve-out** — added `ops/update` to middleware bypass list since it uses bearer not cookie.
- **Docs** — `docs/COWORK.md` brief for the cowork agent (job, update payload shape, curl example, headcount cheat sheet, trip context).
- **Token rotation** — old token revoked, new one issued.
- **Preflight + smoke-test** — build clean, typecheck clean, all public routes 200, auth-gated routes 307, ops/update endpoint live with valid bearer.

### Files Created
| File | Purpose |
|------|---------|
| `src/lib/ops/markdown.ts` | Ops doc generator (headcounts, reservation status, todos by owner, cowork instructions) |
| `src/lib/ops/auth.ts` | Token hash/generate helpers |
| `src/app/api/trips/[id]/ops/doc/route.ts` | GET markdown download endpoint |
| `src/app/api/trips/[id]/ops/update/route.ts` | POST bearer-auth report-back endpoint |
| `scripts/seed-bigsky-ops.mjs` | Idempotent seed for Big Sky headcounts + todos |
| `scripts/mint-ops-token.mjs` | Ops token mint script (prints raw once, stores hash) |
| `docs/COWORK.md` | Brief for Claude Cowork agent |

### Files Modified
| File | Changes |
|------|---------|
| `src/db/schema.ts` | Added 2 enums, 5 columns on `itinerary_blocks`, new `ops_items` + `ops_tokens` tables |
| `src/lib/ai/rationale.ts` | Split "Maddie & Corban" into separate voters |
| `src/app/trips/[id]/review/review-content.tsx` | Added "Download Ops Doc" button |
| `src/middleware.ts` | Bypass `ops/update` for bearer-auth endpoint |
| `.gitignore` | Added `.claude/` and `.superpowers/` sweep guards |

### Next Steps (Session 11+)
- [x] Guest feedback system (done in S11)
- [x] Guest view redesign (done in S11)
- [ ] Hand ops doc + token to Claude Cowork, let it start booking
- [ ] In-app editor for headcounts and todos (currently SQL-only)
- [ ] Token revoke endpoint (currently manual SQL)
- [ ] Wait for Sharon's notes

---

## 2026-04-11 — Session 11: Guest Feedback System + Editorial Redesign

### Accomplished
- **Full feedback system** — guests can now react to and propose changes on the shared itinerary
  - 4 new DB tables: `feedback_items`, `sign_offs`, `households`, `household_members`
  - `co_admin` role + `presentationDismissed` column on itineraries
  - 7 new API endpoints: feedback CRUD, sign-off, sign-offs list, finalize, households
  - Guest identity via first-name dropdown (localStorage + cookie, no auth required)
  - Sign-off banner: "Looks great! I'm in" / "I have some feedback" with DRAFT/FINAL badges
  - Per-block Love + Suggest buttons (replaced single "React" dropdown)
  - Suggest panel: alternative activity, different time, skip, or note
  - Middleware updated for all new public API routes
- **Editor enhancements** — admin review page now has:
  - Agenda | Map | Ops tab bar with pending feedback badge
  - Feedback inbox with accept/dismiss/reply actions
  - Map tab (day-grouped Google Maps links)
  - Ops tab: Todos, RSVPs (sign-off status per participant), Changes feed
  - Finalize button
- **Guest view redesign** — editorial travel-poster aesthetic:
  - HeroSection component: Lone Mountain sunset photo, duotone rust gradient, noise overlay, "GOBLE FAMILY" pill, 97-day countdown, editorial italic kicker, layered "BIG SKY" headline
  - TripStats component: 3-column inline strip (basecamp, airport, grocery) replacing oversized card grid
  - Fraunces serif (Google Font) added alongside Arial Black display
  - "THE PLAN" section label with drop-cap intro paragraph at 19px
  - Day picker redesigned: wider tabs (7.5rem), wrapping vibe text, weekday/number/vibe hierarchy
  - Descriptions shown by default (no expand/collapse)
  - Intro hidden after Day 1
  - Day switching scrolls to content with URL hash (#day-N) for deep linking
- **Editor redesign** — brought in line with guest view:
  - Same HeroSection, admin action pills (Preview as Guest, Ops Doc)
  - Pin/Edit/Regen/Map buttons restyled as rounded pills
  - Fraunces italic for dates and meta text
- **Bug fixes:**
  - Guide page "Back to itinerary" — replaced `javascript:history.back()` with Next.js Link
  - Drizzle config — added `schema-feedback.ts` to schema array (tables weren't being created)
  - Removed packing list section and "Open full route" link
- **CEO product review** — Quick/EXPANSION mode, identified Big Sky event day-of-week conflicts:
  - Farmers Market is Wednesdays only (currently scheduled Sunday — needs manual fix)
  - PBR Rodeo ends July 18 (arrival day — possible but tight)
  - LMR Tuesday Night Ranch Rodeo is a viable alternative
- **15 commits**, 21 files created, 10 files modified, 1,242 lines added

### Files Created
| File | Purpose |
|------|---------|
| `src/db/schema-feedback.ts` | Feedback, sign-off, household tables + enums + relations |
| `src/app/api/trips/[id]/feedback/route.ts` | GET/POST feedback items |
| `src/app/api/trips/[id]/feedback/[feedbackId]/route.ts` | PATCH feedback status/adminNote |
| `src/app/api/trips/[id]/sign-off/route.ts` | POST sign-off (upsert) |
| `src/app/api/trips/[id]/sign-offs/route.ts` | GET all sign-offs with names |
| `src/app/api/trips/[id]/finalize/route.ts` | PATCH finalize trip + itinerary |
| `src/app/api/trips/[id]/households/route.ts` | GET/POST households with members |
| `src/components/itinerary/hero-section.tsx` | Full-bleed hero with photo + editorial overlay |
| `src/components/itinerary/trip-stats.tsx` | Inline 3-column stats strip |
| `src/components/itinerary/name-picker.tsx` | Guest identity dropdown |
| `src/components/itinerary/three-dot-menu.tsx` | Love + Suggest feedback buttons |
| `src/components/itinerary/sign-off-banner.tsx` | Top banner with DRAFT/FINAL badges |
| `src/components/itinerary/feedback-inbox.tsx` | Admin inbox: accept/dismiss/reply |
| `src/components/itinerary/map-tab.tsx` | Day-grouped locations with Maps links |
| `src/components/itinerary/ops-tab.tsx` | Todos, RSVPs, change feed |
| `src/lib/guest-identity.ts` | localStorage/cookie guest identity helpers |
| `docs/superpowers/specs/2026-04-10-editor-guest-feedback-design.md` | Feature spec |
| `docs/superpowers/plans/2026-04-10-editor-guest-feedback.md` | Implementation plan |

### Files Modified
| File | Changes |
|------|---------|
| `src/db/schema.ts` | Added `co_admin` role, `presentationDismissed` column |
| `src/app/trips/[id]/share/guest-itinerary.tsx` | Redesigned with HeroSection, TripStats, feedback UI, hash scrolling |
| `src/app/trips/[id]/review/review-content.tsx` | Added tabs, feedback inbox, HeroSection, restyled buttons |
| `src/app/trips/[id]/share/day-picker.tsx` | Wider buttons, wrapping vibe text, Fraunces styling |
| `src/app/trips/[id]/share/guide/page.tsx` | Fixed back button with Next.js Link |
| `src/app/layout.tsx` | Added Fraunces font |
| `src/middleware.ts` | Added feedback/sign-off/households/finalize public routes |
| `drizzle.config.ts` | Added schema-feedback.ts to schema array |

### Next Steps (Session 12+)
- [ ] Fix itinerary day-of-week conflicts (Farmers Market → Wednesday, Rodeo → arrival night PBR or LMR Tuesday)
- [ ] Hand ops doc + token to Claude Cowork for booking
- [ ] Household configuration UI in Ops tab (currently API-only)
- [ ] Seed Big Sky activity photos (imageUrl on blocks)
- [ ] Personal itinerary pages (per-person RSVP views)
- [ ] Wait for family feedback after sharing the link
