# Next Session — Planner Roadmap

## This session shipped
- `/share/rationale` mom-friendly review page (Who Is Going, per-household prefs, per-day logic, per-block "why", pre-trip To Do list)
- Killed "20 people / ages 4-69" miscount; actual group = 4 households, 9 people
- Fixed rodeo to evening (7–9:30 PM), shifted Day 6 afternoon accordingly
- Deleted redundant Group Kickoff block
- URL sent to Mom (sharon.r.goble@gmail.com) for notes — awaiting feedback

## Product thesis (keep on the wall)
**Replicate a great travel agent, but wrap it in social psychology so every
participant feels heard and excited by the trip.** Eventually an agent also
handles the buying of tickets, reservations, and logistics end-to-end.

## Next session: start with `/plan-ceo-review`
Review the product with Garry-Tan-mode rigor. Explicit prompts:
- Is the core thesis (travel agent + social psychology) actually showing up in the UX, or are we building generic trip tools?
- Where in the flow does "feeling heard" actually happen? (Intake? Review? RSVP?)
- What's the 10-star version of this trip for Mom's review flow specifically?
- Where does an agent belong in the pipeline — and where should it stay out of the way?
- Are we over-engineering the data model vs under-engineering the emotional beats?

## Ideation backlog (from Andrew, 2026-04-08)

### Infra / quality
- **Logging suite**: structured runtime logs, request tracing, Claude call observability (input/output/cost per call), error capture. Need to see Claude failures and generation latency in one place.
- **Testing pages**: automated e2e on key routes (rationale, review, intake, share) — catch the "only tested headers not content" mistake that bit us today. Probably Playwright or agent-browser.
- **Preflight**: add a live-route rendering check (not just build), and a rationale regen smoke test.

### Features
- **Claude Cowork MD ingestion**: Andrew will drop strategy/context MD files into a cowork folder. Build ingestion so the owner-facing tools (rationale generator, chat) pull these in as context. Think: "brand brief" for a trip.
- **Google Calendar integration**: one-click "Add trip to calendar" per participant. Each day's blocks become events with locations + descriptions. Also push rationale updates.
- **Phone home-screen wallpaper**: generate a per-trip wallpaper image sized for iPhone/Android home screens — trip title, dates, destination, maybe a Big Sky silhouette. Would be a fun "we're really going" artifact for the group.
- **Twilio SMS roadmap**:
  - T-30, T-14, T-7, T-1 day reminders per participant
  - Day-of morning: "Today's plan — here's what's happening"
  - Schedule change alerts when host updates blocks
  - Opt-in per participant; honor quiet hours
- **Color-coded day map**: interactive map where each day's route is a different color, hover a stop to see the block card (title, time, why it's here). Current `/share/map/[day]` is per-day — want a single all-days overview too.

### Post-mom-feedback (Phase 3 tracked)
- **Per-person RSVP**: everyone can mark yes/no/maybe-changed-mind per activity. Drives real reservation headcounts. See existing task #15.
- **Per-person custom itinerary pages**: after RSVPs settle, generate a personalized itinerary per attendee — only what they actually said yes to.

### Agent vision (longer arc)
- Travel-agent-as-agent: given final RSVPs and To Do list, the agent actually makes reservations (restaurant bookings via OpenTable API or form fills, activity tickets, private chef confirmation, etc.). Uses the existing To Do list as its work queue.
- Social-psychology layer: the agent writes warm, personalized confirmations to each participant as things get booked — "Just reserved your spot on the fly fishing trip, stoked for you."
