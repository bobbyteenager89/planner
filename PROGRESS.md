# Planner — Progress Log

## Session 1 — Phase 1 Foundation — 2026-03-11

### Completed
- Scaffolded Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui
- Full Drizzle schema: users, accounts, sessions, verification_tokens, trips, participants, preferences, research_items, itineraries, itinerary_blocks, reactions
- NextAuth v5 with Resend magic link provider + Drizzle adapter
- Auth middleware protecting app routes
- Landing page, login flow, dashboard
- Trip creation (title, dates, destination)
- Participant invite flow (email entry, Resend email, token-based acceptance)
- Invite acceptance with auto-linking to user account
- GitHub repo + Vercel deployment
- Build passing, deployed to production

### Pending
- ~~Phase 2: Owner Onboarding AI~~ Done (S2)
- ~~Phase 3: Participant Intake~~ Done (S3)
- Phase 4: Itinerary Generation + Reactions
- Phase 5: Research Feed + Polish

### URLs
- GitHub: https://github.com/bobbyteenager89/planner
- Vercel: https://planner-sooty-theta.vercel.app

---

## Session 2 — Phase 2: Owner Onboarding AI — 2026-03-11

### Completed
- AI-powered onboarding chat with streaming responses
- Three onboarding paths: brainstorm, draft, research
- Conversation persisted as JSONB on trip record
- Middleware migrated from middleware.ts to proxy.ts for Next.js 16

---

## Session 3 — Phase 3: Participant Intake Questionnaire — 2026-03-12

### Accomplished
- Built full-screen mobile-first 3-step intake questionnaire (destination, crew, vibe)
- Liquid glass header panel with backdrop-blur over drifting cloud background
- Outfit font scoping via route layout, custom CSS keyframes for cloud drift + step transitions
- Press-down option cards with magenta selected state + radio dot indicators
- Server action with auth + ownership verification (prevents cross-participant writes)
- Preferences upsert to rawData JSONB + activityPreferences mapping + status update
- Parallelized DB queries in page.tsx with scoped column selection
- Comprehensive accessibility: radiogroup semantics, progressbar ARIA, sr-only live region
- prefers-reduced-motion media query, safe-area-inset handling, focus-visible rings
- Created seed script (scripts/seed-intake-test.ts) + 5-point integration test suite (scripts/test-intake-action.ts)
- Dev-only demo page at /trips/intake-demo (404s in production)
- Ran 4 review agents in parallel (code, security, frontend design, performance) — found and fixed 11 bugs

### Files Modified
| File | Changes |
|------|---------|
| `src/app/trips/[id]/intake/layout.tsx` | Created — Outfit font loading |
| `src/app/trips/[id]/intake/intake.css` | Created — Cloud drift, liquid glass, step transitions, reduced motion |
| `src/app/trips/[id]/intake/steps.ts` | Created — Type-safe 3-step config with subtitles |
| `src/app/trips/[id]/intake/arc-text.tsx` | Created — SVG curved text component (unused but available) |
| `src/app/trips/[id]/intake/sparkles.tsx` | Created — Cloud shapes + ambient glow background |
| `src/app/trips/[id]/intake/actions.ts` | Created — Server action with auth check + preferences upsert |
| `src/app/trips/[id]/intake/intake-questionnaire.tsx` | Created — Main client component (step state, animations, submit) |
| `src/app/trips/[id]/intake/page.tsx` | Replaced stub — Server component with parallel queries |
| `src/app/trips/intake-demo/page.tsx` | Created — Dev-only demo page |
| `scripts/seed-intake-test.ts` | Created — Test data seeder |
| `scripts/test-intake-action.ts` | Created — Integration test suite |

### Bugs Found & Fixed
1. neon-http doesn't support `db().transaction()` → runtime crash
2. `isSubmitting` never reset on success → stuck spinner
3. Rapid "Next" clicks advance step out of bounds → crash
4. Server action had no auth/ownership check → any user could write to any participant
5. `overflow-hidden` breaks `backdrop-filter` on mobile Safari
6. `fixed inset-0` overflows parent on 430-639px viewports
7. `aria-live` on `<main>` floods screen readers with all option text
8. Demo page shipped to production without guard
9. Cloud opacities too low — effectively invisible
10. Sequential DB queries in page.tsx (parallelized with Promise.all)
11. Over-fetching all columns in DB queries (scoped to needed fields)

### Known Issue (not fixed — broader project scope)
- `src/proxy.ts` middleware is a dead file (wrong filename for Next.js) — no middleware auth enforcement runs

### Next Steps
- [x] Fix proxy.ts → middleware.ts (rename + proper session validation) — Done (S4)
- [x] Phase 4: Itinerary Generation + Reactions — Done (S4)
- [ ] Phase 5: Research Feed + Polish

---

## 2026-03-17 — Session 4: Phase 4 + Big Sky Survey + Retro Design

### Accomplished
- **Middleware fix:** Renamed `proxy.ts` → `middleware.ts`, added `/api/invite` to public routes
- **Phase 4 — Itinerary Generation:** Full spec, plan, and implementation
  - Streaming NDJSON generation via Claude Sonnet 4.6 (`POST /generate`)
  - Per-block reactions (love/fine/rather not/hard no) + general comments
  - `GET /itinerary` with reaction aggregates, version switcher
  - `POST /reactions` with upsert, `POST /comments`
  - Owner pinning, regeneration with post-hoc merge of pinned blocks
  - Email notifications via Resend (itinerary ready + new version)
  - GenerateView (streaming UI with progress bar) + ItineraryView (review with reactions)
  - Trip detail page rewrite handling all status states (owner + participant views)
  - Schema: added `comments` JSONB to itineraries table
- **Big Sky Family Trip:** First real trip created and survey built
  - Seeded trip (July 18-25, 20 Moose Ridge Road)
  - Custom intake survey with 13 activities, 6 restaurants, 4 chef options, 7 honorable mention activities, 4 honorable mention dinners
  - Real images from activity provider websites (montanaflyfishing.com, jakeshorses.com, lonemountainranch.com, bigskyresort.com, alpacasofmontana.com, yellowstonellamas.com, nps.gov)
  - Public access — no auth required, name + optional email
  - Retro travel agency design (cream/rust/mustard palette, Arial Black headers, pill buttons, box-shadow submit)
  - All votes save to preferences.rawData as structured JSON
  - Thank you page with matching retro style
- **App renamed** to "Big Sky Trip Planner"
- **20+ commits** across middleware, Phase 4 APIs, UI components, Big Sky survey, design iterations

### Files Created
| File | Purpose |
|------|---------|
| `src/app/api/trips/[id]/generate/route.ts` | Streaming itinerary generation |
| `src/app/api/trips/[id]/itinerary/route.ts` | GET itinerary + blocks + reactions |
| `src/app/api/trips/[id]/reactions/route.ts` | POST reaction with upsert |
| `src/app/api/trips/[id]/comments/route.ts` | POST general comment |
| `src/lib/ai/itinerary-prompt.ts` | buildItineraryPrompt function |
| `src/lib/email/itinerary-ready.ts` | Resend email notifications |
| `src/app/trips/[id]/generate-view.tsx` | Streaming generation UI |
| `src/app/trips/[id]/itinerary-view.tsx` | Review view with reactions |
| `src/app/trips/[id]/trip-content.tsx` | Client component for all trip states |
| `src/app/trips/[id]/intake/bigsky-config.ts` | Big Sky activities, restaurants, chef data |
| `src/app/trips/[id]/intake/bigsky-intake.tsx` | Retro-styled survey component |
| `src/app/trips/[id]/intake/bigsky-actions.ts` | Server action for public survey |
| `src/app/trips/[id]/intake/thanks/page.tsx` | Thank you page |
| `scripts/seed-bigsky-trip.ts` | Seed script for Big Sky trip |
| `docs/superpowers/specs/2026-03-17-phase4-itinerary-generation-design.md` | Phase 4 spec |
| `docs/superpowers/plans/2026-03-17-phase4-itinerary-generation.md` | Phase 4 implementation plan |

### Next Steps
- [x] Build leader dashboard — Done (S5)
- [x] AI-processed preferences, tiebreak tools — Done (S5)
- [x] Leader can start draft itinerary from early answers (iterative refinement) — Done (S5)
- [ ] Phase 5: Research Feed + Polish
- [ ] Social Layer — comments, reactions, group discussion
- [ ] Agentic Trip Agent — collaborative travel agent assistant

---

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
- [ ] DRY refactor — extract ~300 lines of shared code (palette, types, drive estimates, travel card)
- [ ] Accessibility on expandable cards (role="button", tabIndex, keyboard handler)
- [ ] Activity photos on cards (imageUrl field + host upload during curation)
- [ ] Guest RSVP on split tracks ("I'll do this one" with host headcount)
- [ ] Custom OG image for share link previews in iMessage/WhatsApp
- [ ] Host drag-to-reorder + swap activities
- [ ] Research Feed (Phase 5)
- [ ] Social Layer — comments, reactions, group discussion
