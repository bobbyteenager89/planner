# Big Sky Ops — Cowork Brief

This doc tells Claude Cowork (or any agent) how to work the Big Sky trip ops list.

## What you have

1. **Source of truth (read):** Download the latest ops doc from
   `https://planner-sooty-theta.vercel.app/api/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/ops/doc`
   (auth-gated — Andrew downloads and hands you the markdown).

2. **Write-back endpoint:** `POST https://planner-sooty-theta.vercel.app/api/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/ops/update`

3. **Bearer token:** stored separately by Andrew in `OPS_TOKEN` env var. Never paste it in chat or commit it.

## Your job

Work each todo in the ops doc. For each one:

1. **Status `todo` → `doing`** when you start.
2. Do the research/booking/lookup.
3. **Status `doing` → `done`** when complete, with confirmation # and notes.
4. **Status `doing` → `blocked`** if you hit a wall (closed, no availability, needs Andrew's input). Put the reason in `notes`.

## Update payload

Set the `Authorization` header to `Bearer $OPS_TOKEN` and POST JSON like:

```json
{
  "updates": [
    {
      "id": "<ops_item_id from the doc>",
      "status": "done",
      "confirmation": "Conf# 12345 — party of 9, 6:30pm",
      "notes": "Called direct, booked via OpenTable. Cancellation window: 24h."
    },
    {
      "id": "<another_id>",
      "status": "blocked",
      "notes": "Solace Spa fully booked for our dates. Alt: Big Sky Resort spa has openings."
    }
  ]
}
```

**Field rules:**
- `id` — required. Comes from the ops doc (each todo has its UUID after the title).
- `status` — `todo | doing | done | blocked`. Optional.
- `confirmation` — string. Optional. Use for booking confirmation #s, OpenTable IDs, etc.
- `notes` — string. Optional. Append context: cancellation policy, fallback options, who you spoke with.

You can batch any number of updates in one request.

### Example curl

```bash
curl -X POST "$BASE/api/trips/$TRIP/ops/update" \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"updates":[{"id":"...","status":"done","confirmation":"..."}]}'
```

## Reporting back to Andrew

After a working session, generate a short report:

- ✅ What you booked (with confirmation #s)
- ⚠️ What's blocked and why
- ❓ Open questions for Andrew
- 📋 What's still in `todo`

## Headcount cheat sheet

- **Full group:** 7 adults + 2 kids = 9 total
- **Adults:** Jeff, Sharon, Clark, Alicia, Andrew, Maddie, Corban
- **Kids:** Andie, Piper (always with Clark & Alicia)

**Per-activity headcounts (from intake survey — these are authoritative):**

| Block | Going | Skipping |
|---|---|---|
| D1 Lone Peak Brewery dinner | 7A + 2K — all | — |
| D2 LMR Horseback | 5A + 2K — Alicia, Andrew, Corban, Jeff, Maddie + kids | Clark, Sharon |
| D2 Moonlight Basin Gondola | 6A + 2K — all but Jeff | Jeff |
| D3 Yellowstone | 7A + 2K — all | — |
| D4 Fly fishing | **5A** — Alicia, Andrew, Clark, Corban, Jeff (adults only) | Maddie |
| D4 Solace Spa | **5A** — Andrew, Alicia, Clark, Maddie, Sharon (adults only) | Corban, Jeff |
| D4 LMR Tuesday Rodeo | 5A + 2K — Alicia, Andrew, Clark, Corban, Maddie + kids | Jeff, Sharon |
| D5 Olive B's lunch | 6A + 2K | — |
| D5 Farmers Market | 6A + 2K — walk-in | — |
| D6 Private Chef "Food For Thought" | 7A + 2K — group YES | — |
| D6 Horn & Cantle dinner | 7A + 2K — group YES | — |
| D7 Big Sky Culinary class | **4A + 2K = 6 — fits stated 3-6 capacity** | Corban, Jeff, Maddie |
| D7 Riverhouse BBQ (walk-in) | 7A + 2K | — |
| D8 Hungry Moose breakfast | 6A + 2K — walk-in | — |

**Corrections from prior briefs:**
- Fly fishing was previously listed as "Corban only (1A)" — it's actually 5 adults.
- Spa was previously listed as "Maddie only (1A)" — it's actually 5 adults.
- Big Sky Culinary capacity issue is **resolved** — only 6 want to attend, fits the stated ceiling. No exception needed.

If a block on the ops doc shows different counts than this table, the ops doc wins. The bookings tracker page (`/share/bookings`) is the human-readable mirror of the same data.

## Trip context

- **Dates:** Big Sky, MT — July 18–25, 2026 (8 days)
- **Lodging:** 20 Moose Ridge Road, Big Sky, MT
- **Group YES picks:** Yellowstone, Ousel Falls hike, horseback, "Food For Thought" private chef
- **Day 4 split:** fly-fishing (Corban) and spa (Maddie) run in parallel
- **Hard NOs across most of the group:** golf, whitewater rafting, mountain biking, cooking class (the chef night is the exception)
