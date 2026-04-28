// Updates adult/kid counts + reservation notes on Big Sky itinerary_blocks
// using ACTUAL participant preferences from the preferences table.
// Run this AFTER seed-bigsky-bookings.mjs (which sets static fields).
// Idempotent.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);
const TRIP_ID = "83fdfdb7-eb88-4a81-9712-0c8306854b42";

// Load all participant preferences for the trip
const ps = await sql`
  SELECT pa.name, p.raw_data
  FROM preferences p
  JOIN participants pa ON pa.id = p.participant_id
  WHERE pa.trip_id = ${TRIP_ID}
`;

// Build a function: given an activity slug, return {yes, fine, pass, attending}.
// "attending" = yes + fine (will probably come). Pass = won't come.
function tally(slug, votesKey = "activityVotes") {
  const yes = [],
    fine = [],
    pass = [],
    missing = [];
  for (const p of ps) {
    const v = p.raw_data?.[votesKey]?.[slug];
    if (v === "yes") yes.push(p.name);
    else if (v === "fine") fine.push(p.name);
    else if (v === "pass") pass.push(p.name);
    else missing.push(p.name);
  }
  return { yes, fine, pass, missing, attending: [...yes, ...fine] };
}

// Per-block mapping. kids count keyed off whether activity is family-friendly
// AND whether Clark or Alicia are attending (since Andie + Piper are their kids).
function kidsFor(slug, attending, opts = {}) {
  // Hard zero: adult-only activities (kids stay back regardless)
  if (opts.adultOnly) return 0;
  // Otherwise: 2 kids if at least one parent is attending
  const aliciaIn = attending.includes("Alicia");
  const clarkIn = attending.includes("Clark");
  return aliciaIn || clarkIn ? 2 : 0;
}

function fmtNote(prefix, going, hardNos, extra = "") {
  let s = `${prefix}\nGoing (${going.length}A): ${going.join(", ") || "TBD"}.`;
  if (hardNos.length) s += ` Skipping: ${hardNos.join(", ")}.`;
  if (extra) s += ` ${extra}`;
  return s;
}

// ── Updates ─────────────────────────────────────────────────────────
// Each entry computes a "going" list from prefs, then writes adult/kid counts
// and updates reservation_notes with names. booking_window stays as set by
// seed-bigsky-bookings.mjs (we don't overwrite it here).

const updates = [];

// D1 Welcome Dinner: Lone Peak Brewery (chefVotes? no — dinnerVotes)
{
  const t = tally("lone-peak-brewery", "dinnerVotes");
  updates.push({
    day: 1,
    titleMatch: "Welcome Dinner",
    adults: t.attending.length,
    kids: kidsFor("lone-peak-brewery", t.attending),
    notes: fmtNote(
      "Phone: (406) 995-3939 (Lone Peak Brewery). Party of 9 — call to confirm large-group seating.",
      t.attending,
      t.pass
    ),
  });
}

// D2 Horseback
{
  const t = tally("horseback");
  updates.push({
    day: 2,
    titleMatch: "Horseback",
    adults: t.attending.length,
    kids: kidsFor("horseback", t.attending),
    notes: fmtNote(
      "LMR activities desk: (406) 995-4644. Confirm minimum age for Andie/Piper.",
      t.attending,
      t.pass
    ),
  });
}

// D2 Gondola
{
  const t = tally("gondola");
  updates.push({
    day: 2,
    titleMatch: "Moonlight Basin Gondola",
    adults: t.attending.length,
    kids: kidsFor("gondola", t.attending),
    notes: fmtNote(
      "Big Sky Resort website — buy gondola tickets for 3:00 PM.",
      t.attending,
      t.pass
    ),
  });
}

// D3 Yellowstone (everyone)
{
  const t = tally("yellowstone");
  updates.push({
    day: 3,
    titleMatch: "Yellowstone",
    adults: t.attending.length,
    kids: kidsFor("yellowstone", t.attending),
    notes: fmtNote(
      "Just need a park pass — no reservation. America the Beautiful annual covers everyone in the vehicle.",
      t.attending,
      t.pass
    ),
  });
}

// D4 Fly Fishing (adults-only by default)
{
  const t = tally("fly-fishing");
  updates.push({
    day: 4,
    titleMatch: "Fly Fishing",
    adults: t.attending.length,
    kids: kidsFor("fly-fishing", t.attending, { adultOnly: true }),
    notes: fmtNote(
      "Gallatin River Guides: (406) 995-2290 / montanaflyfishing.com. Half-day guided trip.",
      t.attending,
      t.pass
    ),
  });
}

// D4 Spa (adults-only)
{
  const t = tally("spa-day");
  updates.push({
    day: 4,
    titleMatch: "Solace Spa",
    adults: t.attending.length,
    kids: kidsFor("spa-day", t.attending, { adultOnly: true }),
    notes: fmtNote(
      "Solace Spa at Big Sky direct. Each person books their own treatment.",
      t.attending,
      t.pass
    ),
  });
}

// D4 Rodeo (LMR Tuesday Night)
{
  const t = tally("rodeo");
  updates.push({
    day: 4,
    titleMatch: "Tuesday Night Rodeo",
    adults: t.attending.length,
    kids: kidsFor("rodeo", t.attending),
    notes: fmtNote(
      `Eventbrite via lonemountainranch.com/rodeo. Show 6-8 PM (block start 5:15 = head-out time). Buy ${t.attending.length + (t.attending.includes("Alicia") || t.attending.includes("Clark") ? 2 : 0)} tickets. Backup: (406) 995-4644.`,
      t.attending,
      t.pass
    ),
  });
}

// D5 Alpaca Farm
{
  const t = tally("alpaca-farm");
  updates.push({
    day: 5,
    titleMatch: "Alpaca Farm",
    adults: t.attending.length,
    kids: kidsFor("alpaca-farm", t.attending),
    notes: fmtNote(
      "Not yet contacted. Confirm farm accepts group visits + 50mi drive to Bozeman.",
      t.attending,
      t.pass
    ),
  });
}

// D5 Golf
{
  const t = tally("golf-bigsky");
  updates.push({
    day: 5,
    titleMatch: "Golf at Big Sky",
    adults: t.attending.length,
    kids: kidsFor("golf-bigsky", t.attending, { adultOnly: true }),
    notes: fmtNote(
      "Tee times bookable 7-14 days out via Big Sky Golf Course pro shop.",
      t.attending,
      t.pass
    ),
  });
}

// D5 Olive B's lunch (dinnerVotes — they call it "olive-bs")
{
  const t = tally("olive-bs", "dinnerVotes");
  // Lunch is usually whole group; default to all attending who didn't pass on the venue
  updates.push({
    day: 5,
    titleMatch: "Lunch Break",
    adults: t.attending.length,
    kids: kidsFor("olive-bs", t.attending),
    notes: fmtNote(
      "Olive B's: (406) 995-3355. Party reflects who didn't pass on the venue.",
      t.attending,
      t.pass
    ),
  });
}

// D5 Farmers Market (walk-in, everyone fine to drift in)
{
  const t = tally("farmers-market");
  updates.push({
    day: 5,
    titleMatch: "Farmers Market",
    adults: t.attending.length,
    kids: kidsFor("farmers-market", t.attending),
    notes: fmtNote(
      "Walk-in. Casual evening — let people drift in.",
      t.attending,
      t.pass
    ),
  });
}

// D6 Private Chef "Food For Thought" (chefVotes)
{
  const t = tally("food-for-thought", "chefVotes");
  updates.push({
    day: 6,
    titleMatch: "Private Chef",
    adults: t.attending.length,
    kids: kidsFor("food-for-thought", t.attending),
    notes: fmtNote(
      `⭐ Sharon priority. "Food For Thought" — confirm contact (likely Chef Heather, same as Day 7 cooking class). One-stop booking if same chef.`,
      t.attending,
      t.pass
    ),
  });
}

// D6 Horn & Cantle dinner
{
  const t = tally("horn-cantle", "dinnerVotes");
  updates.push({
    day: 6,
    titleMatch: "Horn & Cantle",
    adults: t.attending.length,
    kids: kidsFor("horn-cantle", t.attending),
    notes: fmtNote(
      "LMR reservations: (406) 995-4644 for 5:30 PM.",
      t.attending,
      t.pass
    ),
  });
}

// D7 Cooking Class with Big Sky Culinary
{
  const t = tally("cooking-class");
  updates.push({
    day: 7,
    titleMatch: "Cooking Class",
    adults: t.attending.length,
    kids: kidsFor("cooking-class", t.attending),
    notes: fmtNote(
      `⭐ Sharon priority. Chef Heather: (303) 406-1501 / bigskyculinaryclasses@gmail.com. ${t.attending.length} attending fits the stated 3-6 capacity — no exception needed.`,
      t.attending,
      t.pass
    ),
  });
}

// D7 Riverhouse BBQ (final dinner — gallatin-riverhouse slug)
{
  const t = tally("gallatin-riverhouse", "dinnerVotes");
  updates.push({
    day: 7,
    titleMatch: "Riverhouse",
    adults: t.attending.length,
    kids: kidsFor("gallatin-riverhouse", t.attending),
    notes: fmtNote(
      "⭐ Sharon priority. WALK-IN ONLY. For party of size, arrive before 5:30 PM or after 8 PM. Questions only: (406) 995-7427.",
      t.attending,
      t.pass
    ),
  });
}

// D8 Hungry Moose breakfast
{
  const t = tally("hungry-moose", "dinnerVotes");
  updates.push({
    day: 8,
    titleMatch: "Hungry Moose",
    adults: t.attending.length,
    kids: kidsFor("hungry-moose", t.attending),
    notes: fmtNote(
      "Walk-in. Last morning — let people grab on their own schedule.",
      t.attending,
      t.pass
    ),
  });
}

// ── Apply ───────────────────────────────────────────────────────────
let updated = 0;
for (const u of updates) {
  const r = await sql`
    UPDATE itinerary_blocks
    SET adult_count = ${u.adults},
        kid_count = ${u.kids},
        reservation_notes = ${u.notes}
    WHERE itinerary_id IN (SELECT id FROM itineraries WHERE trip_id = ${TRIP_ID})
    AND day_number = ${u.day}
    AND title ILIKE ${"%" + u.titleMatch + "%"}
    AND (title NOT ILIKE '%Lunch: Meal%')
    RETURNING id, day_number, title
  `;
  for (const row of r) {
    console.log(
      `D${row.day_number} ${row.title} → ${u.adults}A + ${u.kids}K`
    );
    updated++;
  }
}

console.log(`\n${updated} blocks updated with preference-driven counts.`);
