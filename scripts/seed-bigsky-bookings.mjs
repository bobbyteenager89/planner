// Seeds reservation_status, booking_window, reservation_notes, adult/kid counts
// on Big Sky itinerary_blocks based on docs/big-sky-bookings.md.
// Idempotent: re-run anytime to resync.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);
const TRIP_ID = "83fdfdb7-eb88-4a81-9712-0c8306854b42";

// Per-block updates keyed by (day_number, title contains).
// adult_count/kid_count default to group totals (7/2) where 7A+2K applies.
const updates = [
  {
    day: 1,
    titleMatch: "Welcome Dinner",
    status: "needed",
    window: "OpenTable or call (406) 995-3939. Book 4+ weeks ahead.",
    notes: "Phone: (406) 995-3939 (Lone Peak Brewery). Party of 9 — call to confirm large-group seating.",
    adults: 7,
    kids: 2,
  },
  {
    day: 2,
    titleMatch: "Horseback",
    status: "needed",
    window: "Book 1-2 weeks out. Confirm minimum age for kids.",
    notes: "Lone Mountain Ranch activities desk: (406) 995-4644. ⚠️ Headcount pending — some adults may skip; need group RSVP first.",
    adults: 7,
    kids: 2,
  },
  {
    day: 2,
    titleMatch: "Moonlight Basin Gondola",
    status: "needed",
    window: "Buy online a few days ahead.",
    notes: "Big Sky Resort website — buy 7A + 2K gondola tickets for 3:00 PM.",
    adults: 7,
    kids: 2,
  },
  {
    day: 2,
    titleMatch: "Buck's Roadhouse",
    status: "walk_in",
    window: "Walk-in usually fine. Optional: call (406) 993-2333 to give heads-up.",
    notes: "Walk-in. Party of 9 — arrive ~5:30 PM.",
    adults: 7,
    kids: 2,
  },
  {
    day: 3,
    titleMatch: "Yellowstone",
    status: "not_needed",
    window: "No timed-entry in 2026. Bring park pass ($35/vehicle, 7 days; or America the Beautiful annual).",
    notes: "Just need a park pass — no reservation. America the Beautiful annual covers everyone in the vehicle.",
    adults: 7,
    kids: 2,
  },
  {
    day: 3,
    titleMatch: "Lunch at Old Faithful",
    status: "walk_in",
    window: "Walk-in. Options: Old Faithful Inn dining room, Bear Paw Deli, Geyser Grill, or Old Faithful Cafeteria.",
    notes: "No reservation. Bear Paw Deli + Geyser Grill = quickest with kids.",
    adults: 7,
    kids: 2,
  },
  {
    day: 4,
    titleMatch: "Fly Fishing",
    status: "needed",
    window: "Book 2-4 weeks ahead.",
    notes: "Gallatin River Guides: (406) 995-2290 / montanaflyfishing.com. Half-day guided trip for Corban (1 adult).",
    adults: 1,
    kids: 0,
  },
  {
    day: 4,
    titleMatch: "Solace Spa",
    status: "needed",
    window: "Book 30+ days ahead — Solace fills early in summer.",
    notes: "Solace Spa at Big Sky direct. Maddie books her own treatments (1 adult).",
    adults: 1,
    kids: 0,
  },
  {
    day: 4,
    titleMatch: "Lunch Break",
    status: "needed",
    window: "OpenTable / call — venue TBD near Ousel Falls / spa area. Pick when Day 4 details settle.",
    notes: "Day 4 lunch venue still TBD. Will revisit T-2 weeks.",
    adults: 7,
    kids: 2,
  },
  {
    day: 4,
    titleMatch: "Tuesday Night Rodeo",
    status: "needed",
    window: "Eventbrite via lonemountainranch.com/rodeo (max 12 tickets per transaction).",
    notes: "LMR Tuesday Night Rodeo — show is 6-8 PM (block start 5:15 = head-out time). Buy 9 tickets via Eventbrite. Backup: (406) 995-4644.",
    adults: 7,
    kids: 2,
  },
  {
    day: 5,
    titleMatch: "Alpaca Farm",
    status: "unknown",
    window: "Confirm farm accepts group visits + party of 9. 50mi drive to Bozeman.",
    notes: "Not yet contacted. Decision pending: alpaca farm OR Day 5 golf? Most of group passed on golf.",
    adults: 7,
    kids: 2,
  },
  {
    day: 5,
    titleMatch: "Golf at Big Sky",
    status: "unknown",
    window: "Tee times bookable 7-14 days out via Big Sky Golf Course pro shop.",
    notes: "Likely skipped — most of group passed. Hold off until Day 5 morning decision (alpaca vs golf).",
    adults: 7,
    kids: 0,
  },
  {
    day: 5,
    titleMatch: "Lunch Break",
    status: "needed",
    window: "OpenTable or call (406) 995-3355 — Olive B's Big Sky Bistro. Book 2 weeks ahead.",
    notes: "Olive B's: (406) 995-3355. Party of 9 for ~1:00 PM.",
    adults: 7,
    kids: 2,
  },
  {
    day: 5,
    titleMatch: "Farmers Market",
    status: "walk_in",
    window: "Public event — no booking. Wed 5-8 PM in Town Center.",
    notes: "Walk-in. Casual evening — let people drift in.",
    adults: 7,
    kids: 2,
  },
  {
    day: 6,
    titleMatch: "Private Chef",
    status: "needed",
    window: "Direct booking with chef. Confirm if same chef as Day 7 Big Sky Culinary class.",
    notes: "⭐ Sharon priority. \"Food For Thought\" — confirm contact (likely Chef Heather, same as Day 7 cooking class). One-stop booking if same chef.",
    adults: 7,
    kids: 2,
  },
  {
    day: 6,
    titleMatch: "Horn & Cantle",
    status: "needed",
    window: "Book 30+ days ahead — fills fast for July.",
    notes: "Lone Mountain Ranch reservations: (406) 995-4644. Party of 9 for 5:30 PM.",
    adults: 7,
    kids: 2,
  },
  {
    day: 7,
    titleMatch: "Cooking Class",
    status: "needed",
    window: "Book ASAP — class size stated 3-6 and group is 9. Need exception or two parallel sessions.",
    notes: "⭐ Sharon priority. Chef Heather: (303) 406-1501 / bigskyculinaryclasses@gmail.com / contact form on bigskyculinaryclasses.com. ⚠️ Capacity issue — must clear before booking.",
    adults: 7,
    kids: 2,
  },
  {
    day: 7,
    titleMatch: "Riverhouse",
    status: "walk_in",
    window: "WALK-IN ONLY — no reservations accepted.",
    notes: "⭐ Sharon priority. For party of 9: arrive before 5:30 PM or after 8 PM. Questions only: (406) 995-7427.",
    adults: 7,
    kids: 2,
  },
  {
    day: 8,
    titleMatch: "Hungry Moose",
    status: "walk_in",
    window: "Walk-in. Casual breakfast.",
    notes: "Walk-in. Last morning — let people grab on their own schedule.",
    adults: 7,
    kids: 2,
  },
];

let updated = 0;
let skipped = 0;
for (const u of updates) {
  const result = await sql`
    UPDATE itinerary_blocks
    SET reservation_status = ${u.status}::reservation_status,
        booking_window = ${u.window},
        reservation_notes = ${u.notes},
        adult_count = ${u.adults},
        kid_count = ${u.kids}
    WHERE itinerary_id IN (
      SELECT id FROM itineraries WHERE trip_id = ${TRIP_ID}
    )
    AND day_number = ${u.day}
    AND title ILIKE ${"%" + u.titleMatch + "%"}
    RETURNING id, day_number, title
  `;
  if (result.length === 0) {
    console.log(`⚠️  No match: D${u.day} "${u.titleMatch}"`);
    skipped++;
  } else {
    for (const row of result) {
      console.log(`✓ D${row.day_number} ${row.title} → ${u.status}`);
      updated++;
    }
  }
}

console.log(`\n${updated} blocks updated, ${skipped} unmatched.`);
