// Seeds headcounts on Big Sky itinerary blocks + initial ops_items.
// Idempotent: safe to re-run. Headcounts are overwritten; ops_items skipped if title already exists for trip.
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const TRIP_ID = '83fdfdb7-eb88-4a81-9712-0c8306854b42';

// Group totals: 9 adults + 2 kids
// Jeff(1) Sharon(1) Andrew(1) Maddie(1) Corban(1) Clark(1) Alicia(1) Andie(0.5kid) Piper(0.5kid)
// = 7 adults if you exclude Clark/Alicia from "adults" — but for reservations we want
//   adults = Jeff,Sharon,Andrew,Maddie,Corban,Clark,Alicia = 7
//   kids = Andie,Piper = 2
// Wait — earlier I said 9A+2K. Recount:
//   Jeff, Sharon, Clark, Alicia, Andrew, Maddie, Corban = 7 adults
//   Andie, Piper = 2 kids
// Correction: 7 adults + 2 kids = 9 total.
const FULL_GROUP = { adults: 7, kids: 2 };

// Per-block overrides keyed by exact title
const OVERRIDES = {
  // Day 4 — fly fishing vs spa split
  'Morning: Fly Fishing on the Gallatin River': { adults: 1, kids: 0, status: 'needed', notes: 'Corban only (default). Open question: anyone joining?', window: 'Book 2-4 weeks ahead via local outfitter (Gallatin River Guides)' },
  'Morning (Alt): Spa Day at Solace Spa': { adults: 1, kids: 0, status: 'needed', notes: 'Maddie only. Book individual treatments.', window: 'Book 30+ days ahead — Solace fills early in summer' },

  // Day 5 alts
  'Morning: Alpaca Farm Visit': { adults: 7, kids: 2, status: 'unknown', notes: 'Confirm farm accepts visitors and party size' },
  'Morning (Alt): Golf at Big Sky Golf Course': { adults: 2, kids: 0, status: 'needed', notes: 'Open question: who is golfing? Default: skip (most of group passed)' },
  'Afternoon: Montana Whitewater Rafting on the Gallatin': { adults: 0, kids: 0, status: 'not_needed', notes: 'Whole group hard-passed — leaving in itinerary as fallback only' },
  'Afternoon (Alt): Mini Golf at Big Sky': { adults: 7, kids: 2, status: 'walk_in', notes: 'Walk-in, no reservation needed' },

  // Day 6
  'Afternoon: Zipline at Big Sky Resort': { adults: 4, kids: 2, status: 'needed', notes: 'Open question: which adults? Maddie passed. Default: Clark+Alicia+girls+Andrew' },
  'Afternoon (Alt): Scenic Drive — Beartooth Highway or Gallatin Canyon': { adults: 7, kids: 2, status: 'not_needed' },
  'Evening: Montana Rodeo': { adults: 7, kids: 2, status: 'needed', notes: 'Corban YES, group OK. Buy kid tickets for Andie & Piper.', window: 'Tickets typically released 30-60 days before each rodeo date' },

  // Day 7
  'Mid-Morning: Cooking Class with Out of Bounds Chef': { adults: 7, kids: 2, status: 'needed', notes: 'In-home class — confirm chef availability and headcount. Note: most respondents passed on cooking class but chef is the group YES pick.' },

  // Stargazing / free time / home meals — no reservation
  'Evening: Stargazing from the House': { adults: 7, kids: 2, status: 'not_needed' },
  'Evening: Final Stargazing & Group Reflection': { adults: 7, kids: 2, status: 'not_needed' },
  'Morning: Free Time & Rest': { adults: null, kids: null, status: 'not_needed' },
  'Morning: Free Time — Last Full Day': { adults: null, kids: null, status: 'not_needed' },
};

// Default reservation status by block type
function defaultStatus(type, title) {
  if (type === 'meal') {
    if (/Pack a Picnic|at Home|Home Night|Hungry Moose or Home|Cooking Class/i.test(title)) return 'not_needed';
    return 'needed';
  }
  if (type === 'free_time' || type === 'note') return 'not_needed';
  if (type === 'transport') return 'not_needed';
  return 'unknown';
}

// Restaurant booking windows (rough — cowork to verify)
const RESTAURANT_WINDOWS = {
  'Corral': 'Most BBQ joints — call 1-2 weeks ahead, may not take reservations',
  'Buck-T-4 Lodge': 'Call ahead, casual lodge dining',
  'Olive B\'s Big Sky Bistro': 'OpenTable / call — book 2 weeks ahead',
  'Horn & Cantle': 'Lone Mountain Ranch — book 30+ days ahead, fills fast in summer',
  'Ousel Falls': 'Call ahead',
  'Beehive Basin': 'Call ahead',
  'Rainbow Ranch Lodge': 'Book 2-4 weeks ahead',
  'Lone Peak Brewery': 'Walk-in usually fine',
  'Gallatin Riverhouse Grill': 'Call 1-2 weeks ahead',
};

function lookupWindow(title) {
  for (const [key, val] of Object.entries(RESTAURANT_WINDOWS)) {
    if (title.includes(key)) return val;
  }
  return null;
}

const [{ id: itineraryId }] = await sql`
  SELECT id FROM itineraries WHERE trip_id = ${TRIP_ID} ORDER BY version DESC LIMIT 1
`;

const blocks = await sql`
  SELECT id, day_number, sort_order, type, title FROM itinerary_blocks WHERE itinerary_id = ${itineraryId}
`;

let updated = 0;
for (const b of blocks) {
  const o = OVERRIDES[b.title];
  let adults, kids, status, notes, window;
  if (o) {
    adults = o.adults !== undefined ? o.adults : FULL_GROUP.adults;
    kids = o.kids !== undefined ? o.kids : FULL_GROUP.kids;
    status = o.status;
    notes = o.notes ?? null;
    window = o.window ?? lookupWindow(b.title);
  } else {
    adults = FULL_GROUP.adults;
    kids = FULL_GROUP.kids;
    status = defaultStatus(b.type, b.title);
    notes = null;
    window = lookupWindow(b.title);
  }
  await sql`
    UPDATE itinerary_blocks
    SET adult_count = ${adults}, kid_count = ${kids},
        reservation_status = ${status}, reservation_notes = ${notes}, booking_window = ${window}
    WHERE id = ${b.id}
  `;
  updated++;
}
console.log(`Updated ${updated} blocks`);

// Seed initial ops items (idempotent by title)
const SEED_TODOS = [
  { category: 'reservation', title: 'Book Horn & Cantle (Day 4 dinner)', owner: 'Andrew', desc: 'Lone Mountain Ranch — fills fast. Party of 9 (7A+2K). Book 30+ days out.' },
  { category: 'reservation', title: 'Book Rainbow Ranch Lodge (Day 5 dinner)', owner: 'Andrew', desc: 'Party of 9 (7A+2K). Book 2-4 weeks ahead.' },
  { category: 'reservation', title: 'Book Gallatin Riverhouse Grill (Day 4 lunch + Day 7 dinner)', owner: 'Andrew', desc: 'Two reservations. Party of 9 each.' },
  { category: 'reservation', title: 'Book Olive B\'s Big Sky Bistro (Day 5 lunch)', owner: 'Andrew', desc: 'Party of 9 (7A+2K).' },
  { category: 'activity', title: 'Book Montana Rodeo tickets (Day 6 evening)', owner: 'Andrew', desc: '7 adult + 2 kid tickets. Pick a date once schedule released.' },
  { category: 'activity', title: 'Book fly-fishing guide for Corban (Day 4 AM)', owner: 'Andrew', desc: 'Solo trip via Gallatin River Guides or similar. Open question: anyone joining?' },
  { category: 'spa', title: 'Book Solace Spa treatments for Maddie (Day 4 AM)', owner: 'Maddie', desc: 'Maddie books her own treatments at Solace Spa, Big Sky Resort.' },
  { category: 'activity', title: 'Confirm chef Food For Thought (Day 6 dinner + Day 7 cooking class)', owner: 'Andrew', desc: 'Group YES pick. Confirm availability for both nights and party size 9.' },
  { category: 'activity', title: 'Confirm Yellowstone day plan (Day 3)', owner: 'Andrew', desc: 'Pack picnic, plan stops. No reservation but plan route and entry times.' },
  { category: 'activity', title: 'Confirm horseback riding outfitter (TBD day)', owner: 'Andrew', desc: 'Group YES on horseback but not scheduled in itinerary. Add a slot or merge into Day 5/6.' },
  { category: 'activity', title: 'Research alpaca farm visit feasibility (Day 5 AM)', owner: 'Andrew', desc: 'Confirm farm accepts visitors and party of 9 (7A+2K).' },
  { category: 'logistics', title: 'Confirm zipline tickets — adults attending (Day 6 PM)', owner: 'Andrew', desc: 'Buy kid tickets for Andie & Piper. Adults: TBD (Maddie passed).' },
  { category: 'logistics', title: 'Decide Day 5 morning: alpaca farm vs golf', owner: 'Andrew', desc: 'Most passed on golf. Likely just alpaca farm — verify and remove golf alt.' },
];

for (const t of SEED_TODOS) {
  const exists = await sql`SELECT id FROM ops_items WHERE trip_id = ${TRIP_ID} AND title = ${t.title} LIMIT 1`;
  if (exists.length) continue;
  await sql`
    INSERT INTO ops_items (trip_id, category, title, description, owner_name)
    VALUES (${TRIP_ID}, ${t.category}, ${t.title}, ${t.desc}, ${t.owner})
  `;
}

const opsCount = await sql`SELECT count(*)::int AS c FROM ops_items WHERE trip_id = ${TRIP_ID}`;
console.log(`ops_items for trip: ${opsCount[0].c}`);
