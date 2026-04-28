// Session 14 — Sync ops_items + booking_window strings to current itinerary.
// Idempotent: re-running is a no-op past the first apply.
//
// Run: node scripts/sync-bookings-s14.mjs
//
// Source of truth for changes: docs/big-sky-bookings.md (S14, 2026-04-28).

import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const TRIP_ID = "83fdfdb7-eb88-4a81-9712-0c8306854b42";

// ── Block IDs (current itinerary) ────────────────────────
const BLOCK = {
  d1_brewery:        "8e5aee44-6c35-4184-a86b-61a258b0487c", // Welcome Dinner: Lone Peak Brewery
  d2_horseback:      "05560ee8-773f-4af2-8da8-46b334a90fc8",
  d2_gondola:        "897436a3-ae38-4749-9d69-bdbcb99ff37c",
  d3_yellowstone:    "763fea96-f700-4133-83ff-e1b655a764e2",
  d4_flyfish:        "22ef31da-bec2-4f55-bea6-a2e8f1885568",
  d4_spa:            "1d22dcbc-a6f7-4737-a332-2420f00f7936",
  d4_lunch:          "9893142a-3a6e-4170-bec1-de939e38ea6a",
  d4_rodeo:          "bcbb2e88-15d0-49a8-9fc8-deb05b329ac4", // LMR Tuesday Night Rodeo
  d5_alpaca:         "8087577e-2f7e-4d64-9629-e2fc6d5f3abb",
  d5_golf:           "baf1bc25-c8a3-4689-a0eb-d8454cf7ecae",
  d5_lunch:          "1c8d5ec7-f709-4c4c-b51e-411ee4dcb12c",
  d6_chef_lunch:     "70d01521-6587-4f45-ab96-5810dfa99ad0", // Private Chef at Home (Food For Thought)
  d6_horn_cantle:    "2b13481c-a92e-4654-a52b-b703f1a245ab", // Horn & Cantle dinner
  d7_cooking_class:  "cb9d6849-3820-43e6-8428-c48279b19975", // Big Sky Culinary
  d7_riverhouse:     "575928ca-ef60-4fab-b59f-18d88cac100a", // Riverhouse BBQ dinner
};

// ── 1. Fix booking_window strings on blocks ──────────────
const blockUpdates = [
  {
    id: BLOCK.d1_brewery,
    booking_window:
      "OpenTable or call (406) 995-3939. Book 4+ weeks ahead for party of 9.",
  },
  {
    id: BLOCK.d4_rodeo,
    booking_window:
      "Eventbrite via lonemountainranch.com/rodeo (max 12 tickets/transaction). Tuesdays 6-8 PM, Jun 9-Sept 22, 2026. Phone: (406) 995-4644.",
  },
  {
    id: BLOCK.d7_cooking_class,
    booking_window:
      "Chef Heather: (303) 406-1501 / bigskyculinaryclasses@gmail.com. Book NOW. WARNING: stated class size 3-6; group is 9 - ask about exception or 2 sessions.",
  },
  {
    id: BLOCK.d7_riverhouse,
    booking_window:
      "WALK-IN ONLY (no reservations). For party of 9: arrive before 5:30 PM or after 8 PM. Questions: (406) 995-7427.",
  },
  {
    id: BLOCK.d3_yellowstone,
    booking_window:
      "No timed-entry needed in 2026. Bring park pass ($35/vehicle 7-day, or America the Beautiful annual).",
  },
];

console.log("== Updating booking_window on blocks ==");
for (const b of blockUpdates) {
  const r = await sql`
    UPDATE itinerary_blocks SET booking_window = ${b.booking_window}
    WHERE id = ${b.id}
    RETURNING id, title
  `;
  if (r[0]) console.log(`  ✓ ${r[0].title}`);
  else console.log(`  ✗ block ${b.id} not found`);
}

// ── 2. Update existing ops_items where titles/notes are stale ──
const opsUpdates = [
  {
    id: "131c80be-c9fa-4fac-8b07-b2b0358d45e7", // Horn & Cantle
    title: "Book Horn & Cantle at LMR (Day 6 dinner, Thu Jul 23, 5:30 PM)",
    block_id: BLOCK.d6_horn_cantle,
    notes:
      "Party of 9 (7A+2K). LMR books 30+ days out, fills fast in summer. Phone: (406) 995-4644.",
  },
  {
    id: "18495390-4c7e-43d2-a1f9-e3aa26473741", // Rodeo (was Day 6)
    title: "Book LMR Tuesday Night Rodeo (Day 4, Tue Jul 21, 6-8 PM)",
    block_id: BLOCK.d4_rodeo,
    notes:
      "9 tickets via Eventbrite (max 12/txn). NOT Big Sky PBR (that ends Jul 18). LMR Tuesdays Jun 9-Sept 22.",
  },
  {
    id: "acd7bfcb-3ae1-44f9-9e5f-4d033ba3e196", // was "Gallatin Riverhouse Grill (Day 4 lunch + Day 7 dinner)"
    title:
      "Day 7 final dinner: Riverhouse BBQ - WALK-IN, arrive before 5:30 PM",
    block_id: BLOCK.d7_riverhouse,
    notes:
      "Sharon priority. Riverhouse does NOT take reservations - first come first served. Party of 9: arrive before 5:30 PM (or after 8 PM) to avoid wait. Questions: (406) 995-7427.",
  },
  {
    id: "23da53a1-797d-456a-acd8-eb71452a5c56", // Olive B's Day 5 lunch
    title: "Book Olive B's Big Sky Bistro (Day 5 lunch, Wed Jul 22, 1:00 PM)",
    block_id: BLOCK.d5_lunch,
    notes: "Party of 9. OpenTable or call (406) 995-3355. Book ~2 weeks out.",
  },
  {
    id: "d18a1e3f-2d50-4927-ad98-d5ec8904efaf", // Solace Spa - Maddie owner
    title: "Book Solace Spa treatments (Day 4 AM, Tue Jul 21)",
    block_id: BLOCK.d4_spa,
    notes:
      "1 adult (Maddie). Solace Spa direct - book individual treatments 30+ days out, fills early in summer.",
  },
  {
    id: "5fc42a4c-4348-44d1-b5ed-44811f55d91e", // Fly fishing - Corban
    title: "Book Gallatin River Guides fly-fishing (Day 4 AM, Tue Jul 21)",
    block_id: BLOCK.d4_flyfish,
    notes:
      "1 adult (Corban). (406) 995-2290 / montanaflyfishing.com. Half-day guided. Book 2-4 weeks ahead.",
  },
  {
    id: "e3704c08-d545-46fb-9389-6bfce5b21ae5", // Yellowstone confirm
    title: "Day 3 Yellowstone: buy park pass (no timed-entry needed)",
    block_id: BLOCK.d3_yellowstone,
    notes:
      "No timed-entry in 2026. $35/vehicle 7-day pass at the gate, or America the Beautiful annual ($80) if Andrew wants reuse.",
  },
  {
    id: "04c532d7-5c81-4960-85cb-df117db2e2ea", // Confirm chef Food For Thought
    title:
      "Confirm chef Food For Thought (Day 6 LUNCH + possibly Day 7 cooking class)",
    block_id: BLOCK.d6_chef_lunch,
    notes:
      "Sharon priority. Day 6 12:30 PM private chef lunch at the house, 7A+2K. Open Q: is FFT chef = Big Sky Culinary's Chef Heather? If yes, single contact for both food events.",
  },
  {
    id: "d1414c97-ea05-4c9d-b7f5-5701aff41e4f", // Horseback
    title: "Confirm horseback headcount + book LMR ride (Day 2, Sun Jul 19, 11 AM)",
    block_id: BLOCK.d2_horseback,
    notes:
      "Sharon heard some people may want to skip - need definitive headcount before booking. Default 7A+2K but TBC. LMR activities desk: (406) 995-4644. Confirm minimum age for kids.",
  },
];

console.log("\n== Updating ops_items (titles/notes/block_id) ==");
for (const o of opsUpdates) {
  const r = await sql`
    UPDATE ops_items
    SET title = ${o.title}, block_id = ${o.block_id}, notes = ${o.notes}, updated_at = now()
    WHERE id = ${o.id}
    RETURNING id, title
  `;
  if (r[0]) console.log(`  ✓ ${r[0].title}`);
  else console.log(`  ✗ ops_item ${o.id} not found`);
}

// ── 3. Delete obsolete ops_items ─────────────────────────
const opsDeletes = [
  { id: "db9382e4-371f-469c-8f5f-80ce2ff4fa0f", reason: "Rainbow Ranch Lodge - no Day 5 dinner block exists; Farmers Market replaces it" },
  { id: "555ba5ea-befd-410c-9215-ae90640681ab", reason: "Day 6 PM zipline - block is now Scenic Drive, no zipline" },
];

console.log("\n== Deleting obsolete ops_items ==");
for (const d of opsDeletes) {
  const r = await sql`DELETE FROM ops_items WHERE id = ${d.id} RETURNING id, title`;
  if (r[0]) console.log(`  ✓ deleted: ${r[0].title} (${d.reason})`);
  else console.log(`  ⊘ already gone: ${d.id}`);
}

// ── 4. Insert new ops_items (idempotent via natural-key check) ──
const opsInserts = [
  {
    natural_key: "Book Big Sky Culinary in-home class",
    block_id: BLOCK.d7_cooking_class,
    title:
      "Book Big Sky Culinary in-home class (Day 7, Fri Jul 24, 10:30 AM)",
    owner_name: "Andrew",
    notes:
      "Sharon priority. Chef Heather: (303) 406-1501 / bigskyculinaryclasses@gmail.com. WARNING: stated class size 3-6, group is 9. First call: ask if she can do one big session, two parallel, or two back-to-back. If no, need Plan B for Day 7 morning.",
  },
  {
    natural_key: "Book Lone Peak Brewery",
    block_id: BLOCK.d1_brewery,
    title: "Book Lone Peak Brewery welcome dinner (Day 1, Sat Jul 18, 5:30 PM)",
    owner_name: "Andrew",
    notes:
      "Party of 9. OpenTable or call (406) 995-3939. Book 4+ weeks ahead for a Saturday in July.",
  },
];

console.log("\n== Inserting new ops_items (if missing) ==");
for (const ins of opsInserts) {
  const exists = await sql`
    SELECT id FROM ops_items
    WHERE trip_id = ${TRIP_ID} AND title ILIKE ${"%" + ins.natural_key + "%"}
  `;
  if (exists.length > 0) {
    console.log(`  ⊘ exists: ${ins.title}`);
    continue;
  }
  const r = await sql`
    INSERT INTO ops_items (trip_id, block_id, category, title, owner_name, status, notes)
    VALUES (${TRIP_ID}, ${ins.block_id}, 'reservation', ${ins.title}, ${ins.owner_name}, 'todo', ${ins.notes})
    RETURNING id, title
  `;
  console.log(`  ✓ inserted: ${r[0].title}`);
}

// ── 5. Final state ───────────────────────────────────────
console.log("\n== Final ops_items (todo) ==");
const final = await sql`
  SELECT title, owner_name FROM ops_items
  WHERE trip_id = ${TRIP_ID} AND status = 'todo'
  ORDER BY title
`;
for (const f of final) console.log(`  • ${f.title} [${f.owner_name || "-"}]`);
console.log(`\nTotal todo items: ${final.length}`);
