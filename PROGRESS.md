# Planner — Progress Log

## Current State
**Last session:** 2026-04-28 — S15: Public bookings tracker shipped (`/share/bookings`) with preference-driven headcounts, tappable phone/email/URL links, structured fields, and per-card MARK BOOKED checkbox. Cooking-class capacity issue dissolved (4A+2K = 6, fits 3-6).
**Next:**
- Andrew sends Sharon the `/share/bookings` link
- Andrew dispatches Cowork via `docs/big-sky-cowork-handoff.md` + the fresh ops token
- Confirm whether Food For Thought chef = Big Sky Culinary's Chef Heather (one-call booking if yes)
- Day 5 morning: decide alpaca farm vs golf (most passed on golf)
**Branch:** master / clean (7 PRs merged this session, all auto-deployed to prod)

## Next Session Kickoff
**Mode:** shallow
**First action:** Brief on bookings status. Andrew likely has Cowork results to triage, or wants to call vendors himself, or has Sharon's reactions to act on. Wait for direction.
**Open questions:**
- Did Cowork run? If so, what's `done` / `blocked` on the tracker page?
- Did Sharon (or anyone) flip checkboxes via the public toggle?
- Are there alpaca farm / Day 5 morning decisions to lock?
**Decisions pending:** Day 5 morning (alpaca vs golf), single-chef confirmation
**Ready plan:** `docs/big-sky-cowork-handoff.md` (self-contained Cowork brief, 179 lines, has all 13 ops_item IDs + headcounts + vendor contacts)

---

## 2026-04-12 — Session 12: Full Schedule Verification + Product Improvements

### Accomplished
- **Schedule verification** — researched actual operating days/hours for every activity and restaurant. Found 8 conflicts:
  - Lone Peak Brewery permanently closed → replaced with Buck's T-4
  - Gallatin Riverhouse Grill renamed to Riverhouse BBQ, no lunch → fixed
  - Olive B's dinner-only → replaced Tue lunch with Hungry Moose
  - Buck's T-4 closed Mon-Tue, dinner-only → replaced Wed lunch
  - "Out of Bounds Chef" doesn't exist → renamed to Big Sky Culinary Classes
  - Alpaca farm is in Bozeman (50mi) → adjusted timing for drive
  - Farmers Market is Wed 5-8 PM evening (not morning) → moved to Wed evening
  - Montana Rodeo was on wrong day → moved to Tue (LMR Tuesday Night Rodeo)
- **Dinner times normalized** — all dinners shifted to 5:30 PM start for kids
- **Day 5 finalized** — Rainbow Ranch dinner replaced with LMR Tuesday Night Rodeo (5:15-8 PM, food included)
- **"Beehive Basin" → "Dinner at Home"** — fixed confusing naming
- **Yellowstone day improved** — updated description with recommended route (Grand Prismatic → Old Faithful → Norris → Artist Point), lunch options at Old Faithful (Inn, Cafeteria, Geyser Grill, Bear Paw Deli), bison calf season note
- **Ops token minted** — fresh bearer token for Cowork handoff, old token revoked
- **Product improvements** (4 parallel worktree agents):
  - Personal itinerary pages: `/share/my-plan` route with per-participant filtered view
  - Group config: `groupConfig` JSONB column on trips, editable UI in Ops tab, dynamic ops doc
  - Dashboard: Owner/Invited role badges on trip cards
  - Activity photos: 37 blocks seeded with Unsplash images
- **Design fixes** — day picker tabs centered on desktop (`mx-auto`), "Suggeston" spacing fix
- **3 commits pushed**, Vercel auto-deployed successfully

### Files Created
| File | Purpose |
|------|---------|
| `src/app/trips/[id]/share/my-plan/page.tsx` | Personal itinerary server component |
| `src/app/trips/[id]/share/my-plan/my-plan-view.tsx` | Personal itinerary client view |
| `src/app/api/trips/[id]/group-config/route.ts` | PATCH endpoint for group config |
| `scripts/seed-bigsky-group.mjs` | Seed Big Sky group config |

### Files Modified
| File | Changes |
|------|---------|
| `src/db/schema.ts` | Added `groupConfig` JSONB column + GroupConfig/Household types |
| `src/components/itinerary/ops-tab.tsx` | Added Group section with editable household cards |
| `src/app/trips/[id]/share/guest-itinerary.tsx` | Added "View My Plan" link |
| `src/app/trips/[id]/share/day-picker.tsx` | Centered tabs with mx-auto |
| `src/components/itinerary/sign-off-banner.tsx` | Fixed "Suggeston" spacing |
| `src/app/dashboard/page.tsx` | Added Owner/Invited role badges |
| `src/lib/ops/markdown.ts` | Reads groupConfig dynamically |
| `src/lib/itinerary-shared.tsx` | Added groupConfig to ShareData type |
| `src/app/api/trips/[id]/share/route.ts` | Added groupConfig to share query |
| `src/app/trips/[id]/review/review-content.tsx` | Passes groupConfig to OpsTab |

### DB Changes (no code commit needed)
- 9 restaurant/activity swaps and time corrections
- 37 activity photos seeded (Unsplash URLs)
- Group config seeded (5 households, 7A+2K)
- Dinner times normalized to 5:30 PM
- Yellowstone day description + lunch options updated
- LMR Rodeo replaces Rainbow Ranch on Day 5

---

## 2026-04-13 — Session 13: Itinerary Polish + Real Venue Photos + Sent to Family

### Accomplished
- **Lunch blocks diversified** — replaced 3 repetitive "Hungry Moose" lunch blocks (Day 2, 4, 5) with varied local recs (Lone Peak Brewery, Black Bear Bar & Grill, Olive B's) in a non-prescriptive "here are a few options, or eat at home" tone
- **Swan Lake Loop added** — new afternoon block Day 5 (2:30–4:00 PM): 1.5-mile flat LMR meadow trail, good for kids, wildlife spotting before Farmers Market
- **Kayaking on Hebgen Lake added** — optional morning block Day 6 (8:30–11:30 AM): 30 min north, different vibe from rest of trip, wraps before private chef lunch
- **Duplicate dinner fixed** — Horn & Cantle appeared on Day 1 and Day 6; Day 1 swapped to Lone Peak Brewery (casual welcome dinner)
- **Group reflection removed** — deleted "Evening: Final Stargazing & Group Reflection" from Day 7
- **Image blank space bug fixed** — switched from CSS background-image div to `<img>` with `onError` handler; images that fail to load now collapse cleanly
- **Bold markdown rendering** — `**text**` in block descriptions now renders as `<strong>` via `renderDescription()` helper
- **17 venue images replaced** — all generic/wrong Unsplash stock photos replaced with real photos sourced from official venue websites: LMR, Buck's Big Sky, Big Sky Resort (Sanity CDN), Wikimedia Commons, Gallatin River Guides, Big Sky Farmers Market, Riverhouse BBQ, Big Sky Culinary Classes, Alpacas of Montana
- **8 bad images nulled** — Scotland road photo (used for Town Center + Scenic Drive), all Lunch Break blocks, duplicate cooking class, departure blocks
- **Itinerary sent to Goble family** ✈️

### Files Modified
| File | Changes |
|------|---------|
| `src/app/trips/[id]/share/guest-itinerary.tsx` | BlockImage component, renderDescription(), replaced background-image pattern |
| `scripts/update-lunch-blocks.mjs` | New script: updates 3 lunch blocks with varied recs |

### DB Changes (no code commit)
- 3 lunch blocks updated with varied restaurant suggestions
- Swan Lake Loop block inserted (Day 5, sort 5)
- Kayaking on Hebgen Lake block inserted (Day 6, sort 2, Alt)
- Day 1 dinner: Horn & Cantle → Lone Peak Brewery
- Day 7: Final Stargazing & Group Reflection deleted
- 17 image_url values updated with real venue photos
- 8 image_url values nulled (bad/duplicate)

---

## 2026-04-28 — Session 14: Big Sky Bookings Doc + Per-Block RSVPs

### Accomplished
- **Bookings master checklist** at `docs/big-sky-bookings.md` — tiered by urgency (this week / mid-May / early July / walk-in), with phone numbers, party size, and how-to-book per item. Sharon's three priorities flagged ⭐: Big Sky Culinary in-home class, Food For Thought private chef lunch, Riverhouse BBQ.
- **Research findings folded in** (corrects earlier assumptions):
  - Yellowstone has **no timed-entry requirement in 2026** — bring a park pass, that's it
  - Riverhouse BBQ **does NOT take reservations** — walk-in only, party of 9 should arrive before 5:30 PM or after 8 PM. (406) 995-7427.
  - Big Sky Culinary stated class capacity is **3–6**; group is 9. Real risk — call (303) 406-1501 / bigskyculinaryclasses@gmail.com first to ask about exception or two sessions.
  - LMR Tuesday Night Rodeo correctly ID'd as the trip's rodeo (not Big Sky PBR — PBR ends Jul 18). Eventbrite tickets via lonemountainranch.com/rodeo, max 12/transaction.
- **DB sync** (`scripts/sync-bookings-s14.mjs`, idempotent): updated 9 ops_items with corrected day numbers/venues/contacts; deleted 2 stale (Rainbow Ranch dinner block doesn't exist; zipline todo for what's now scenic drive); added 2 new (Big Sky Culinary booking + Lone Peak Brewery welcome dinner); fixed booking_window strings on 5 blocks; re-typed Day 4 LMR rodeo block from `meal` → `activity` (was excluding it from RSVP eligibility).
- **Per-block RSVP feature shipped** (answer to "who's actually doing horseback?"):
  - New `block_rsvps` table — `(trip_id, block_id, participant_id, status: yes/maybe/no)` with unique index on `(block_id, participant_id)`. Migration via `scripts/migrate-add-block-rsvps.mjs`, idempotent.
  - `GET/POST/DELETE /api/trips/[id]/rsvps` — POST upserts via ON CONFLICT.
  - `/share/my-plan`: Yes / Maybe / No toggle on each activity block, optimistic UI with rollback on failure, persists to localStorage-identified guest.
  - `/review`: inline headcount card (✓ Yes / ? Maybe / ✗ No counts + names on hover, plus "responded N/9") on each activity block.
  - Activity-only scope — toggle/headcount appear only on `type='activity'` blocks. Transport, meals, free-time blocks unaffected.
  - Middleware bypass added so guests can post without auth.
- **PR + ship** — opened, merged, and Vercel-deployed to prod (`planner-sooty-theta.vercel.app`). Build clean, typecheck clean, API verified end-to-end via fetch (upsert, status validation, idempotent re-runs). Test RSVPs cleared post-deploy.

### Files Created
| File | Purpose |
|------|---------|
| `docs/big-sky-bookings.md` | Master booking checklist (tiers, phone numbers, party size) |
| `scripts/migrate-add-block-rsvps.mjs` | Idempotent migration: rsvp_status enum + block_rsvps table |
| `scripts/sync-bookings-s14.mjs` | Idempotent ops_items + booking_window cleanup |
| `src/app/api/trips/[id]/rsvps/route.ts` | GET / POST (upsert) / DELETE RSVP endpoints |

### Files Modified
| File | Changes |
|------|---------|
| `src/db/schema-feedback.ts` | Added `rsvpStatusEnum` + `blockRsvps` table + relations |
| `src/lib/itinerary-shared.tsx` | Added `RsvpStatus` + `BlockRsvp` interfaces |
| `src/app/trips/[id]/share/my-plan/my-plan-view.tsx` | RSVP fetch + submitRsvp + per-block toggle render |
| `src/app/trips/[id]/review/review-content.tsx` | RSVP fetch + inline headcount card per activity block |
| `src/middleware.ts` | Bypass `/api/trips/[id]/rsvps` for guest access |

### DB Changes (no code commit)
- New `block_rsvps` table + `rsvp_status` enum applied to prod
- ops_items: 9 updated, 2 deleted, 2 inserted, all reflecting current itinerary
- itinerary_blocks: 5 booking_window strings cleaned; Day 4 rodeo type `meal` → `activity`

### Notes
- **Live UI smoke gap**: browser tool (Claude-in-Chrome extension) couldn't see the React Server Components stream past the initial loading skeleton — affected both local dev and prod. Title was dynamic so SSR + script load is fine; this is a tooling-side observation issue, not a real prod issue. Real verification requires Andrew opening the live URL in his normal browser.
- **/preflight + /smoke-test skipped** for /done gate — build clean, API verified, prod responding 200; visual verification deferred to Andrew's normal-browser eyeball.
- **Discoverability**: RSVP toggle only lives on `/share/my-plan`. Main `/share` view doesn't have it. Quick fix = send family the my-plan URL; real fix = next-session work.

### Next Steps (Session 15+)
- [ ] Send family the `/share/my-plan` link (the personal-plan view with the RSVP toggles)
- [x] ~~Mint fresh Cowork token, hand off `docs/big-sky-bookings.md`, start Sharon's three priorities~~ — token minted, handoff package shipped (S15)
- [x] ~~Plan B for Big Sky Culinary if 9-person exception is denied~~ — dissolved: only 4A+2K = 6 actually want it, fits 3-6 capacity (S15)
- [ ] Decide discoverability: add the RSVP toggle to `/share` itself, or rely on the my-plan URL
- [ ] Confirm whether "Food For Thought" chef = Big Sky Culinary's Chef Heather (single contact for both food events)
- [ ] Iterative regen via UI (still on roadmap)

---

## 2026-04-28 — Session 15: Public Bookings Tracker (Live, Live-Editable)

### Accomplished
- **`/trips/[id]/share/bookings`** — new public server-rendered page. Day-by-day with status icons (✅🟡🟢⚪❓), labeled fields (GOING / WHEN TO BOOK / NOTES), auto-linked phones (`tel:`) + emails (`mailto:`) + URLs, group roster + status counts in header, big day headings with rust underlines.
- **MARK BOOKED checkbox** — per-card client component flips `reservation_status` between `needed` and `booked` via new public POST endpoint. Optimistic update + rollback on error. Booked cards get a green border.
- **Preference-driven headcounts** — switched from doc-based defaults to `preferences.raw_data.activityVotes/dinnerVotes/chefVotes`. Major corrections:
  - Fly fishing: 1A → **5A** (Alicia, Andrew, Clark, Corban, Jeff)
  - Spa: 1A → **5A** (Andrew, Maddie + Alicia, Clark, Sharon)
  - Cooking class: 7A+2K → **4A+2K = 6** (fits stated 3-6 capacity, no exception needed)
  - Rodeo: 7A+2K → 5A+2K (Jeff/Sharon passed)
  - Horseback: 7A+2K → 5A+2K (Clark/Sharon passed)
- **Cooking-class capacity issue dissolved** — Sharon's #1 priority no longer needs an exception. First call is now a normal booking.
- **Cowork ops token minted** (`ops_de9e336492a4...`) — old one revoked
- **`docs/big-sky-cowork-handoff.md`** — 179-line self-contained Cowork brief with mission, three priorities, headcount table with names, vendor contacts, write-back protocol, and all 13 ops_item UUIDs inline (Cowork doesn't need to fetch the auth-gated ops doc)
- **Refreshed 6 ops_items.notes** in DB to match corrected headcounts
- **7 PRs merged** to master, all auto-deployed:
  - #2 Public bookings tracker + initial seed
  - #3 Preference-driven headcounts + doc corrections
  - #4 Kid names in "Going" line
  - #5 Cowork handoff package + COWORK.md cheat sheet
  - #6 Bookings redesign (bigger headings, structured fields, tappable links, checkbox)
  - #7 Middleware fix to allow public POSTs to `/bookings/toggle`
- **Smoke test passing** — all 4 guest routes return 200 (`/share`, `/share/bookings`, `/share/my-plan`, `/share/guide`)

### Files Created
| File | Purpose |
|------|---------|
| `src/app/trips/[id]/share/bookings/page.tsx` | Public bookings tracker (server component) |
| `src/app/trips/[id]/share/bookings/booking-checkbox.tsx` | Client checkbox toggle |
| `src/app/api/trips/[id]/bookings/toggle/route.ts` | Public POST endpoint, validates block belongs to trip |
| `scripts/seed-bigsky-bookings.mjs` | Idempotent seed for reservation_status/window/notes |
| `scripts/seed-bigsky-headcounts.mjs` | Idempotent preference-driven headcount seed |
| `docs/big-sky-cowork-handoff.md` | Self-contained Cowork dispatch package |

### Files Modified
| File | Changes |
|------|---------|
| `src/app/trips/[id]/share/guest-itinerary.tsx` | Added Bookings CTA next to View My Plan |
| `src/middleware.ts` | Added `/bookings/toggle` to public allowlist |
| `docs/big-sky-bookings.md` | Corrected fly-fishing, spa, cooking-class headcounts + rationale |
| `docs/COWORK.md` | Replaced solo-headcount defaults with full per-block survey-derived table; noted capacity-issue resolution |

### DB Changes (no code commit needed)
- 20 itinerary_blocks: `reservation_status`/`booking_window`/`reservation_notes` populated from doc
- 16 itinerary_blocks: `adult_count`/`kid_count`/`reservation_notes` rewritten from intake survey prefs
- 6 ops_items: `notes` refreshed to match corrected headcounts
- New ops_token minted; prior token revoked

### Outstanding for Andrew
- [ ] Send Sharon the `/share/bookings` link
- [ ] Dispatch Cowork (paste `docs/big-sky-cowork-handoff.md` + ops token into a fresh claude.ai conversation)

### Next Steps
- [ ] Triage Cowork report-back (whatever lands as `done`/`blocked`)
- [ ] Decide Day 5 morning: alpaca farm vs golf
- [ ] Confirm Food For Thought chef = Chef Heather (single-call booking if yes)
- [ ] Iterative regen via UI (still on roadmap)
