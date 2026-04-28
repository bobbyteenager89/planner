// Updates the three lunch blocks (Days 2, 4, 5) with varied restaurant suggestions
// and a casual, non-prescriptive tone — "here are a few spots nearby, or eat at home."
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const updates = [
  {
    id: '7a9a6568-0000-0000-0000-000000000000', // Day 2 lunch — will match by day+sortOrder too
    // Actually let's query by block ID prefix
    blockId: '7a9a6568',
    dayNumber: 2,
    title: 'Lunch Break',
    description: 'No agenda here — a few options nearby if you want to get out: **Lone Peak Brewery** has burgers and a nice patio, or **Hungry Moose Market & Deli** is great for sandwiches and grab-and-go items (perfect for a porch lunch back at the house). Totally fine to just eat at home too.',
    location: 'Big Sky, MT',
  },
  {
    blockId: '9893142a',
    dayNumber: 4,
    title: 'Lunch Break',
    description: 'Keep it relaxed — afternoon has Ousel Falls and then the rodeo. **Hungry Moose** is a reliable quick stop for sandwiches and deli items. **Black Bear Bar & Grill** (at the Mountain Village) has pub food if you want to sit down. Or just eat at the house.',
    location: 'Big Sky, MT',
  },
  {
    blockId: '1c8d5ec7',
    dayNumber: 5,
    title: 'Lunch Break',
    description: 'A few options for lunch: **Lone Peak Brewery** for burgers and beers, **Olive B\'s Big Sky Bistro** if they\'re doing a lunch service (worth a quick check), or keep it casual and eat at home before the Farmers Market tonight.',
    location: 'Big Sky, MT',
  },
];

for (const u of updates) {
  // Match on the UUID prefix since IDs may have dashes
  const rows = await sql`
    SELECT id, title FROM itinerary_blocks
    WHERE id::text LIKE ${u.blockId + '%'}
    LIMIT 1
  `;

  if (rows.length === 0) {
    console.error(`❌ Block not found for prefix: ${u.blockId}`);
    continue;
  }

  const { id, title: oldTitle } = rows[0];
  await sql`
    UPDATE itinerary_blocks
    SET
      title = ${u.title},
      description = ${u.description},
      location = ${u.location}
    WHERE id = ${id}
  `;
  console.log(`✅ Day ${u.dayNumber}: "${oldTitle}" → "${u.title}"`);
}

console.log('\nDone.');
