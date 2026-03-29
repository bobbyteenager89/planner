# Planner — Progress Log

## 2026-03-19 — Session 5: Leader Dashboard + Intelligence + Iterative Generation + Polish

### Accomplished
- **Leader Dashboard** — new standalone page at `/trips/[id]/dashboard`
  - Retro Big Sky theme (cream/rust/mustard palette, Arial Black headings)
  - Horizontal vote bars for all 13 activities, 10 restaurants, 4 chefs
  - Participant completion tracker with status pills
  - Streaming AI narrative summary via Claude Haiku
  - Open-text suggestions display
  - "View Responses" link added to trip detail page (intake + reviewing states)
- **Leader Intelligence** — 4 new features on the dashboard
  - Conflict detection: "Split" badges on items with yes+pass votes, expandable to show who
  - Per-item AI insights: "Analyze Votes" button generates one-liner per item with signal colors
  - Schedule preview: "Preview Schedule" generates day-by-day framework respecting fixed-date events
  - Participant engagement: "Remind" button sends nudge emails (24h rate limit), "Copy Link" for survey URL
  - AI Tools section grouping all three AI buttons
- **Iterative Generation** — generate from partial responses, regenerate as votes arrive
  - Version indicator shows current itinerary version + generation timestamp
  - "New responses" badge shows count of responses since last generation
  - Button label changes to "Regenerate Itinerary" when version exists
- **Product Polish**
  - Global error boundary (`error.tsx`)
  - Custom 404 page (`not-found.tsx`)
  - Loading skeletons for trip detail + dashboard pages
  - Dynamic metadata (generateMetadata) for trip + dashboard pages with OpenGraph
- **Schema change**: Added `lastRemindedAt` timestamp to participants table
- **22 commits**, 12 new files, 6 modified files

### Files Created
| File | Purpose |
|------|---------|
| `src/lib/bigsky-dashboard.ts` | Vote aggregation utility with conflict detection |
| `src/app/trips/[id]/dashboard/page.tsx` | Dashboard server component (auth + data) |
| `src/app/trips/[id]/dashboard/dashboard-content.tsx` | Dashboard client component (retro theme, all features) |
| `src/app/trips/[id]/dashboard/loading.tsx` | Dashboard skeleton loader |
| `src/app/api/trips/[id]/summary/route.ts` | Streaming AI narrative summary |
| `src/app/api/trips/[id]/insights/route.ts` | Batch per-item AI insights |
| `src/app/api/trips/[id]/schedule-preview/route.ts` | Day-by-day schedule preview |
| `src/app/api/trips/[id]/remind/route.ts` | Reminder email with 24h rate limiting |
| `src/lib/email/survey-reminder.ts` | Reminder email template |
| `src/app/error.tsx` | Global error boundary |
| `src/app/not-found.tsx` | Custom 404 page |
| `src/app/trips/[id]/loading.tsx` | Trip detail skeleton loader |

### Files Modified
| File | Changes |
|------|---------|
| `src/db/schema.ts` | Added `lastRemindedAt` to participants |
| `src/app/trips/[id]/trip-content.tsx` | Added "View Responses" link for owner |
| `src/app/trips/[id]/page.tsx` | Added generateMetadata |
| `src/lib/bigsky-dashboard.ts` | Added conflict detection (conflicted, conflictPairs) |

### Next Steps
- [x] Generate itinerary from real survey data — Done (S6)
- [x] Public share page for family — Done (S6)
- [ ] Research Feed — curated items with group voting and AI scoring (Phase 5)
- [ ] Social Layer — comments on activities, reactions, group discussion
- [ ] Agentic Trip Agent — collaborative travel agent (reorder days, ask questions, delegate)

---

## 2026-03-27 — Session 6: Itinerary Generation + Host/Guest Split

### Accomplished
- **Generated real itinerary** from 6 family members' survey data
  - 38 blocks across 8 days, ~$7,775 estimated total
  - Ran via direct script (bypassing auth) against live Neon DB
  - Yellowstone anchor day, split tracks for polarizing activities (horseback, rafting, golf)
  - Mountain biking excluded (universal hard no), rest days built in
  - Trip status moved from `intake` → `reviewing`
- **Public share page** (`/trips/[id]/share`) — no auth required
  - Big Sky retro design (rust/mustard/cream palette matching intake board)
  - "How We Built This" methodology section explaining preference logic
  - Google Maps links on every location, travel cards with drive time estimates
  - Estimated drive times for Big Sky area (Yellowstone ~90min, in-town ~10min, etc.)
  - Interactive map route links per day with total driving time
- **CEO product review** — identified core problem: single page serving two audiences
  - Host needs a workbench, guests need a gift
  - Recommended split into host review + guest itinerary (items 1-3 from priority list)
- **Host/guest split** — two distinct experiences
  - Guest view (`/share`): clean day-by-day with sticky horizontal day picker, warm intro, no AI reasoning
  - Host view (`/review`): full reasoning, stats, schedule/reasoning toggle, "Preview as Guest" button
  - Day picker auto-scrolls to active tab, shows vibe subtitle per day
  - Prev/Next day navigation with scroll-to-top
- **4 parallel review agents** (code, security, performance, CEO) — found and fixed:
  - Security: stripped aiReasoning from public API (was leaking to guests via DevTools)
  - Security: fixed middleware operator precedence (fragile `&&`/`||` chain)
  - Performance: parallelized blocks + participants DB queries (Promise.all)
  - Performance: added Cache-Control s-maxage=60 on public API
  - Code: fixed .json() crash on 404 (API returned plain text, client called .json())
  - Code: added error states instead of silent "no itinerary" on failures
  - Code: removed broken Google Maps embed iframe (no API key)
  - Code: fixed sort() array mutation, reset expandedBlock on day switch

### Files Created
| File | Purpose |
|------|---------|
| `src/app/trips/[id]/share/guest-itinerary.tsx` | Guest-facing clean itinerary with day picker |
| `src/app/trips/[id]/share/day-picker.tsx` | Sticky horizontal day tab navigation |
| `src/app/trips/[id]/review/page.tsx` | Host review page (auth-gated) |
| `src/app/trips/[id]/review/review-content.tsx` | Host view with full reasoning + analytics |
| `src/app/trips/[id]/review/layout.tsx` | Outfit font loading for review |
| `src/app/api/trips/[id]/share/route.ts` | Public API for itinerary data |
| `docs/superpowers/specs/2026-03-27-host-guest-split-design.md` | Host/guest split spec |

### Files Modified
| File | Changes |
|------|---------|
| `src/app/trips/[id]/share/page.tsx` | Switched from ShareItinerary to GuestItinerary |
| `src/app/trips/[id]/share/layout.tsx` | Added Outfit font loading |
| `src/middleware.ts` | Added /share and /api/*/share to public allowlist, fixed parens |

### Next Steps
- [x] Activity photos on cards — Done (S7)
- [x] Custom OG image for share link previews — Done (S7)
- [ ] DRY refactor — extract ~300 lines of shared code (palette, types, drive estimates, travel card)
- [ ] Accessibility on expandable cards (role="button", tabIndex, keyboard handler)
- [ ] Guest RSVP on split tracks ("I'll do this one" with host headcount) — Phase 3
- [ ] Host drag-to-reorder + swap activities — Phase 2
- [ ] Research Feed (Phase 5)
- [ ] Social Layer — comments, reactions, group discussion

---

## 2026-03-28 — Session 7: Visual Polish + Interactive Maps + CEO Review

### Accomplished
- **CEO product review** — full system audit, 3-phase roadmap created
  - Phase 1: Photos + Visual Polish + Maps (this session)
  - Phase 2: Host Curation Tools (drag-to-reorder, inline edit, per-day regen)
  - Phase 3: Guest RSVP + Feedback Loop (name picker, headcount, reactions)
- **Typography overhaul** — bumped all text sizes across share + review pages
  - Time codes: text-lg → text-xl, badges: text-base → text-lg, costs/locations: +1 step
  - Opacity bumped +0.1-0.15 everywhere for better contrast on cream background
  - Day picker: text-xs vibe → text-sm, weekday text-base → text-lg
- **AM/PM time format** — replaced 24h (18:30) with 12h (6:30 PM) on both pages
- **Removed costs from guest view** — no per-card costs, no trip total footer
- **Fixed Ennis dinner** — swapped Corral Steakhouse (55 min each way) to Horn & Cantle at Lone Mountain Ranch (10 min)
- **Activity photos** — added imageUrl column, seeded all 38/38 blocks with photos
  - Photo banners render edge-to-edge inside card borders on both share + review pages
- **OG image** — @vercel/og edge route generates branded 1200x630 card (BIG SKY retro style)
  - Full OpenGraph + Twitter Card metadata on share page
  - Immutable cache header for CDN
- **Countdown + travel info** — 3-card grid: days-to-go counter, BZN→house directions, nearest grocery
- **Weather forecast** — Open-Meteo API fetched in parallel with share data, shows per-day high/low + emoji
- **Local Guide page** (`/share/guide`) — 16 curated spots across 6 categories (coffee, grocery, gas, ice cream, gear, pharmacy)
- **Day Map page** (`/share/map/[day]`) — numbered stop list with Google Maps route link
- **AI Packing List** — on-demand Haiku-generated packing list based on actual itinerary activities, cached 24h
- **Performance fixes** — parallelized weather+data fetch (eliminated waterfall), added cache headers to OG and packing-list error paths
- **3 parallel review agents** (code quality, security, performance) — findings addressed

### Files Created
| File | Purpose |
|------|---------|
| `src/app/api/trips/[id]/og/route.tsx` | OG image generation (edge, @vercel/og) |
| `src/app/api/trips/[id]/packing-list/route.ts` | AI packing list via Claude Haiku |
| `src/app/trips/[id]/share/guide/page.tsx` | Local spots guide (coffee, grocery, gear) |
| `src/app/trips/[id]/share/map/[day]/page.tsx` | Interactive day map with stop list |
| `src/lib/bigsky-local-spots.ts` | Curated local spots data (16 spots, 6 categories) |
| `scripts/fix-ennis-dinner.ts` | DB script: swap Corral → Horn & Cantle |
| `scripts/add-block-images.ts` | DB script: seed imageUrl for all blocks |
| `docs/superpowers/plans/2026-03-28-phase1-visual-polish.md` | Phase 1 implementation plan |

### Files Modified
| File | Changes |
|------|---------|
| `src/db/schema.ts` | Added imageUrl column to itineraryBlocks |
| `src/app/api/trips/[id]/share/route.ts` | Added imageUrl to blocks select |
| `src/app/trips/[id]/share/guest-itinerary.tsx` | Typography, AM/PM, photos, countdown, weather, guide link, map link, packing list, removed costs |
| `src/app/trips/[id]/share/day-picker.tsx` | Typography bump (text sizes + opacity) |
| `src/app/trips/[id]/review/review-content.tsx` | Typography, AM/PM, photos, formatTime |
| `src/app/trips/[id]/share/page.tsx` | Added generateMetadata with OG image |
| `src/middleware.ts` | Added /og and /packing-list to public routes |
| `package.json` | Added @vercel/og dependency |

### Next Steps
- [x] Phase 2: Host Curation — inline block editing, drag-to-reorder, pin/unpin, per-day regeneration — Done (S8)
- [ ] Phase 3: Guest RSVP — name picker, "I'm in"/"Skip" buttons, headcount badges, party size awareness
- [x] DRY refactor — extract palette, types, drive estimates, travel card into shared module — Done (S8)
- [ ] Accessibility — expandable cards need role="button", tabIndex, keyboard handler
- [ ] Convert background-image photos to next/image for lazy loading + optimization
- [ ] Add Google Maps Embed API key for embedded maps on day map page

---

## 2026-03-28 — Session 8: Phase 2 — Host Curation Tools

### Accomplished
- **DRY refactor** — extracted ~300 lines of shared code into `src/lib/itinerary-shared.tsx`
  - Block/ShareData types, palette constants, TYPE_CONFIG, 10 utility functions, TravelCard component
  - Both guest + review pages now import from shared module (net ~130 line reduction)
  - Added `pinned?: boolean` to Block interface for Phase 2
- **Block mutation APIs** — 3 new auth-gated routes
  - `PATCH /api/trips/[id]/blocks/[blockId]` — update title, description, times, location
  - `PATCH /api/trips/[id]/blocks/[blockId]/pin` — toggle pinned boolean
  - `PATCH /api/trips/[id]/blocks/reorder` — batch sortOrder update
- **Per-day regeneration API** — `POST /api/trips/[id]/generate-day`
  - Regenerates a single day's blocks via Claude Sonnet, preserves pinned blocks
  - Streams NDJSON, deletes unpinned blocks, inserts new ones
  - Includes other-day context to avoid activity duplication
- **Host curation UI** — review page transformed into interactive workbench
  - Inline block editing: ✏️ Edit button → input fields → Save/Cancel
  - Drag-to-reorder: @dnd-kit with grip handles, optimistic local reorder + API persist
  - Pin/unpin: 📌 toggle with mustard border accent for pinned blocks
  - Per-day regen: 🔄 Regen Day button in day headers, streams + refetches
- **Share API updated** — `pinned` field now included in block response
- **6 commits**, 10 files changed (1,258 insertions, 486 deletions)

### Files Created
| File | Purpose |
|------|---------|
| `src/lib/itinerary-shared.tsx` | Shared types, palette, utilities, TravelCard (197 lines) |
| `src/app/api/trips/[id]/blocks/[blockId]/route.ts` | Block field update API |
| `src/app/api/trips/[id]/blocks/[blockId]/pin/route.ts` | Pin/unpin toggle API |
| `src/app/api/trips/[id]/blocks/reorder/route.ts` | Batch reorder API |
| `src/app/api/trips/[id]/generate-day/route.ts` | Per-day regeneration API (275 lines) |
| `docs/superpowers/plans/2026-03-28-phase2-host-curation.md` | Phase 2 implementation plan |

### Files Modified
| File | Changes |
|------|---------|
| `src/app/trips/[id]/review/review-content.tsx` | Added edit mode, DnD, pin/unpin, regen UI (+764/-486) |
| `src/app/trips/[id]/share/guest-itinerary.tsx` | Replaced duplicated code with shared imports (-212) |
| `src/app/api/trips/[id]/share/route.ts` | Added pinned field to blocks select |
| `package.json` | Added @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities |

### Next Steps
- [ ] Phase 3: Guest RSVP — name picker, "I'm in"/"Skip" buttons, headcount badges, party size awareness
- [ ] Accessibility — expandable cards need role="button", tabIndex, keyboard handler
- [ ] Convert background-image photos to next/image for lazy loading + optimization
- [ ] Add Google Maps Embed API key for embedded maps on day map page
- [ ] Log in and test all 4 curation features interactively (edit, drag, pin, regen)
