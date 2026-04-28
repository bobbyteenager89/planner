# Big Sky Bookings — Cowork Handoff Package

**To use:** Open a fresh Claude.ai conversation and paste this entire file as the first message. Then add: *"Your bearer token is: ops_de9e336492a4897b64410db950965adbdf3a26e383c9a9734f9c10702a31a4b1"* (do NOT paste the token in this file — keep it separate).

---

## Mission

Book the activities and restaurants for the Big Sky family trip (July 18–25, 2026, 7 adults + 2 kids). Work the priority list in order. Update status via the write-back endpoint after each call.

**Three priorities (Sharon's request):**
1. ⭐ **Big Sky Culinary in-home class** — Day 7 (Fri Jul 24) 10:30 AM, **4A + 2K = 6 attendees** (fits stated 3-6 capacity, no exception needed)
2. ⭐ **Private Chef "Food For Thought"** — Day 6 (Thu Jul 23) lunch at the house, 7A + 2K
3. ⭐ **Riverhouse BBQ** — Day 7 (Fri Jul 24) final dinner — WALK-IN ONLY, no booking

After priorities, work the rest of the ops list in date order.

---

## Trip facts

- **Dates:** July 18–25, 2026 (Sat → Sat, 8 days)
- **Lodging:** 20 Moose Ridge Road, Big Sky, MT
- **Trip ID:** `83fdfdb7-eb88-4a81-9712-0c8306854b42`
- **Group:**
  - Adults (7): Jeff, Sharon, Clark, Alicia, Andrew, Maddie, Corban
  - Kids (2): Andie + Piper (always with Clark & Alicia)

## Per-activity headcounts (from intake survey)

| Day | Block | Going | Skipping |
|---|---|---|---|
| 1 | Lone Peak Brewery dinner | 7A + 2K | — |
| 2 | LMR Horseback | 5A + 2K (Alicia, Andrew, Corban, Jeff, Maddie + kids) | Clark, Sharon |
| 2 | Moonlight Basin Gondola | 6A + 2K | Jeff |
| 3 | Yellowstone | 7A + 2K | — |
| 4 | **Fly fishing** | **5A** (Alicia, Andrew, Clark, Corban, Jeff) — adults only | Maddie |
| 4 | **Solace Spa** | **5A** (Andrew, Alicia, Clark, Maddie, Sharon) — adults only | Corban, Jeff |
| 4 | LMR Tuesday Rodeo | 5A + 2K | Jeff, Sharon |
| 5 | Olive B's lunch | 6A + 2K | — |
| 5 | Farmers Market | 6A + 2K (walk-in) | — |
| 6 | ⭐ Private Chef Food For Thought | 7A + 2K (group YES) | — |
| 6 | Horn & Cantle dinner | 7A + 2K (group YES) | — |
| 7 | ⭐ Big Sky Culinary class | **4A + 2K** (Andrew, Sharon yes; Alicia, Clark fine) | Corban, Jeff, Maddie |
| 7 | ⭐ Riverhouse BBQ (walk-in) | 7A + 2K | — |
| 8 | Hungry Moose breakfast | 6A + 2K (walk-in) | — |

---

## Vendor contacts

| Vendor | Phone | Email / Web |
|---|---|---|
| Lone Peak Brewery | (406) 995-3939 | OpenTable |
| Lone Mountain Ranch (horseback, rodeo, Horn & Cantle) | (406) 995-4644 | lonemountainranch.com |
| LMR Tuesday Rodeo tickets | — | lonemountainranch.com/rodeo (Eventbrite, max 12/transaction) |
| Moonlight Basin Gondola | — | Big Sky Resort website |
| Gallatin River Guides (fly fishing) | (406) 995-2290 | montanaflyfishing.com |
| Solace Spa at Big Sky | direct booking | Solace Spa site |
| Olive B's Big Sky Bistro | (406) 995-3355 | OpenTable |
| Big Sky Culinary Classes (Chef Heather) | (303) 406-1501 | bigskyculinaryclasses.com / bigskyculinaryclasses@gmail.com |
| Riverhouse BBQ | (406) 995-7427 (questions only — walk-in) | — |
| Buck's Roadhouse | (406) 993-2333 | Walk-in |

---

## Write-back protocol

**Endpoint:** `POST https://planner-sooty-theta.vercel.app/api/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/ops/update`

**Auth:** `Authorization: Bearer <token Andrew gives you separately>`

**Body:**
```json
{
  "updates": [
    {
      "id": "<ops_item id from below>",
      "status": "doing | done | blocked",
      "confirmation": "Conf# 12345 — party of 9, 6:30pm",
      "notes": "Called direct, booked via OpenTable. Cancellation 24h."
    }
  ]
}
```

Mark `doing` when you start an item, `done` with confirmation # when booked, `blocked` with reason if you hit a wall.

---

## Ops items (work these in priority order)

(13 items, all currently `todo`. IDs included for the write-back protocol.)

### D1 — Book Lone Peak Brewery welcome dinner (Day 1, Sat Jul 18, 5:30 PM)
- **id:** `1e2f3157-b9d5-4d94-98db-6f839800c6d4`
- **owner:** Andrew · **status:** todo
- **notes:** Party of 9. OpenTable or call (406) 995-3939. Book 4+ weeks ahead for a Saturday in July.

### D2 — Confirm horseback headcount + book LMR ride (Day 2, Sun Jul 19, 11 AM)
- **id:** `d1414c97-ea05-4c9d-b7f5-5701aff41e4f`
- **owner:** Andrew · **status:** todo
- **description:** Group YES on horseback but not scheduled in itinerary. Add a slot or merge into Day 5/6.
- **notes:** 5 adults + 2 kids: Alicia, Andrew, Corban, Jeff, Maddie + Andie, Piper (Clark, Sharon passed). Headcount confirmed via intake survey. LMR activities desk: (406) 995-4644. Confirm minimum age for kids.

### D3 — Day 3 Yellowstone: buy park pass (no timed-entry needed)
- **id:** `e3704c08-d545-46fb-9389-6bfce5b21ae5`
- **owner:** Andrew · **status:** todo
- **description:** Pack picnic, plan stops. No reservation but plan route and entry times.
- **notes:** No timed-entry in 2026. $35/vehicle 7-day pass at the gate, or America the Beautiful annual ($80) if Andrew wants reuse.

### D4 — Book LMR Tuesday Night Rodeo (Day 4, Tue Jul 21, 6-8 PM)
- **id:** `18495390-4c7e-43d2-a1f9-e3aa26473741`
- **owner:** Andrew · **status:** todo
- **description:** 7 adult + 2 kid tickets. Pick a date once schedule released.
- **notes:** 5 adults + 2 kids: Alicia, Andrew, Clark, Corban, Maddie + Andie, Piper (Jeff, Sharon passed). 7 tickets via Eventbrite (max 12/txn). lonemountainranch.com/rodeo. NOT Big Sky PBR (that ends Jul 18). LMR Tuesdays Jun 9-Sept 22.

### D4 — Book Gallatin River Guides fly-fishing (Day 4 AM, Tue Jul 21)
- **id:** `5fc42a4c-4348-44d1-b5ed-44811f55d91e`
- **owner:** Andrew · **status:** todo
- **description:** Solo trip via Gallatin River Guides or similar. Open question: anyone joining?
- **notes:** 5 adults: Alicia, Andrew, Clark, Corban, Jeff (Maddie passed). (406) 995-2290 / montanaflyfishing.com. Half-day guided trip. Book 2-4 weeks ahead.

### D4 — Book Solace Spa treatments (Day 4 AM, Tue Jul 21)
- **id:** `d18a1e3f-2d50-4927-ad98-d5ec8904efaf`
- **owner:** Andrew · **status:** todo
- **description:** Maddie books her own treatments at Solace Spa, Big Sky Resort.
- **notes:** 5 adults: Andrew, Maddie + Alicia, Clark, Sharon (Corban, Jeff passed). Each books their own treatment at Solace Spa, Big Sky Resort. Book 30+ days out — fills early in summer.

### D5 — Book Olive B's Big Sky Bistro (Day 5 lunch, Wed Jul 22, 1:00 PM)
- **id:** `23da53a1-797d-456a-acd8-eb71452a5c56`
- **owner:** Andrew · **status:** todo
- **description:** Party of 9 (7A+2K).
- **notes:** Party of 9. OpenTable or call (406) 995-3355. Book ~2 weeks out.

### D6 — Book Horn & Cantle at LMR (Day 6 dinner, Thu Jul 23, 5:30 PM)
- **id:** `131c80be-c9fa-4fac-8b07-b2b0358d45e7`
- **owner:** Andrew · **status:** todo
- **description:** Lone Mountain Ranch — fills fast. Party of 9 (7A+2K). Book 30+ days out.
- **notes:** Party of 9 (7A+2K). LMR books 30+ days out, fills fast in summer. Phone: (406) 995-4644.

### D6 — Confirm chef Food For Thought (Day 6 LUNCH + possibly Day 7 cooking class)
- **id:** `04c532d7-5c81-4960-85cb-df117db2e2ea`
- **owner:** Andrew · **status:** todo
- **description:** Group YES pick. Confirm availability for both nights and party size 9.
- **notes:** ⭐ Sharon priority. Group YES: 7A + 2K (4 yes, 3 fine, 0 pass on chef vote). Day 6 12:30 PM lunch at the house. Confirm if Food For Thought chef = Big Sky Culinary Chef Heather (one-stop booking if yes).

### D7 — Day 7 final dinner: Riverhouse BBQ - WALK-IN, arrive before 5:30 PM
- **id:** `acd7bfcb-3ae1-44f9-9e5f-4d033ba3e196`
- **owner:** Andrew · **status:** todo
- **description:** Two reservations. Party of 9 each.
- **notes:** Sharon priority. Riverhouse does NOT take reservations - first come first served. Party of 9: arrive before 5:30 PM (or after 8 PM) to avoid wait. Questions: (406) 995-7427.

### D7 — Book Big Sky Culinary in-home class (Day 7, Fri Jul 24, 10:30 AM)
- **id:** `daa9a8bd-2c1b-42d1-a298-0a0e00c3efa5`
- **owner:** Andrew · **status:** todo
- **notes:** ⭐ Sharon priority. 4 adults + 2 kids = 6 attendees (Andrew, Sharon yes; Alicia, Clark fine + Andie, Piper). Corban, Jeff, Maddie passed. CAPACITY OK — fits stated 3-6 ceiling, no exception needed. Chef Heather: (303) 406-1501 / bigskyculinaryclasses@gmail.com.

### D? — Research alpaca farm visit feasibility (Day 5 AM)
- **id:** `887c4b83-5464-4b70-874b-968568afdee1`
- **owner:** Andrew · **status:** todo
- **description:** Confirm farm accepts visitors and party of 9 (7A+2K).

### D? — Decide Day 5 morning: alpaca farm vs golf
- **id:** `7b26c5e0-8c6e-423f-ac70-a638fe90de0d`
- **owner:** Andrew · **status:** todo
- **description:** Most passed on golf. Likely just alpaca farm — verify and remove golf alt.



---

## Reporting back

After a working session, generate a short report for Andrew:
- ✅ What you booked (with confirmation #s)
- ⚠️ What's blocked and why
- ❓ Open questions for Andrew
- 📋 What's still in `todo`
