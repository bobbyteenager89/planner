# Host/Guest Itinerary Split

## Summary

Split the single share page into two distinct experiences:
- **Guest view** (`/trips/[id]/share`) — clean, beautiful, day-by-day itinerary for family
- **Host view** (`/trips/[id]/review`) — full reasoning, analytics, and curation workspace

## Guest View (`/trips/[id]/share`)

**Public, no auth required.**

### Header
- Keep: Big Sky rust/mustard/cream header with title, dates, house address (Maps link)
- Replace "How We Built This" with one warm line: *"Andrew planned this trip around what everyone said they wanted to do. Here's your week."*
- Remove: stats bar (Activities/Meals/Split Options/Free Time)

### Day Picker
- Sticky horizontal scroll bar below the header
- Tabs: "Day 1 Fri", "Day 2 Sat", etc. through "Day 8 Fri"
- Active tab highlighted in rust with cream text
- Inactive tabs in card-bg with ink text
- Tapping a tab scrolls to that day (or shows only that day)
- On mobile: horizontally scrollable, active tab stays visible

### Activity Cards (per day)
- Keep: time, type badge, title (bold uppercase), location (Maps link), cost
- Keep: tap to expand description
- Keep: travel cards between stops with drive time + directions link
- Keep: day driving total + "Open full route" link
- Remove: "Why this made the cut" reasoning box from expanded view
- Remove: "Show Map" embed button (keep the "Open full route" link)
- Alt blocks: keep indented dashed style

### Footer
- Keep: Trip Total with cost estimate

### What's Removed from Guest View
- "How We Built This" section
- Stats bar
- View mode toggle (Schedule / Why Each Choice)
- AI reasoning boxes inside expanded cards
- Embedded map iframes

## Host View (`/trips/[id]/review`)

**Auth-gated (requires login).**

### Content
- Everything currently on the share page, unchanged
- "How We Built This" explainer
- Stats bar
- Schedule + Reasoning toggle
- AI reasoning in expanded cards
- Travel cards, maps, all of it
- Add: "Preview as Guest" button/link that opens `/trips/[id]/share` in new tab

### Future (not this session)
- Drag-to-reorder blocks
- Swap/replace individual activities
- Pin/lock blocks
- Version history navigation

## Route Structure

```
/trips/[id]/share        → Guest view (public)
/trips/[id]/share/page.tsx
/trips/[id]/share/guest-itinerary.tsx   (new, stripped-down component)
/trips/[id]/share/day-picker.tsx        (new component)

/trips/[id]/review       → Host view (auth-gated)
/trips/[id]/review/page.tsx
/trips/[id]/review/review-content.tsx   (rename of current share-content.tsx)

/api/trips/[id]/share    → Public API (unchanged)
```

## Middleware Update

Add `/trips/[id]/review` to auth-required paths (it already falls through to auth by default since it's not in the public allowlist).

## Implementation Approach

1. Create `/trips/[id]/review/` route — move current share-content.tsx there as review-content.tsx
2. Create new guest-itinerary.tsx for the stripped-down guest view
3. Create day-picker.tsx component
4. Wire up the guest share page with day picker + simplified cards
5. Add "Preview as Guest" link to review page
6. Build check + deploy

## Not In Scope (This Session)
- Host editing (drag-reorder, swap, pin)
- Activity photos
- Split-track RSVP
- Custom OG images
- Offline/PWA support
- Post-trip photo journal
