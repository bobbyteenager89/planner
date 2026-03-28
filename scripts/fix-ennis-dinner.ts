/**
 * Fix Ennis Dinner: swap The Corral (55 min away) for Horn & Cantle (10 min).
 *
 * Usage: npx tsx scripts/fix-ennis-dinner.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc, or, ilike } from "drizzle-orm";
import * as schema from "../src/db/schema";

const TRIP_ID = "83fdfdb7-eb88-4a81-9712-0c8306854b42";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  // 1. Find the latest itinerary for the trip
  const [itinerary] = await db
    .select()
    .from(schema.itineraries)
    .where(eq(schema.itineraries.tripId, TRIP_ID))
    .orderBy(desc(schema.itineraries.version))
    .limit(1);

  if (!itinerary) {
    console.error("No itinerary found for trip", TRIP_ID);
    process.exit(1);
  }

  console.log(`Found itinerary v${itinerary.version} (${itinerary.id})`);

  // 2. Find the block with "Corral" in title or location
  const blocks = await db
    .select()
    .from(schema.itineraryBlocks)
    .where(eq(schema.itineraryBlocks.itineraryId, itinerary.id));

  const corralBlock = blocks.find(
    (b) =>
      b.title.toLowerCase().includes("corral") ||
      (b.location && b.location.toLowerCase().includes("corral"))
  );

  if (!corralBlock) {
    console.error("No block with 'Corral' found. Blocks:", blocks.map((b) => b.title));
    process.exit(1);
  }

  console.log(`Found block: "${corralBlock.title}" at "${corralBlock.location}"`);

  // 3. Update it
  await db
    .update(schema.itineraryBlocks)
    .set({
      title: "Welcome Dinner at Horn & Cantle",
      location: "Horn & Cantle, Lone Mountain Ranch, Big Sky, MT",
      description:
        "Kick off the week with a welcome dinner at Horn & Cantle, the signature restaurant at Lone Mountain Ranch. Montana-sourced elk, bison, and trout in a stunning lodge setting. Just 10 minutes from the house — no long drives on arrival night. Reservations recommended for groups.",
      estimatedCost: "400.00",
      aiReasoning:
        "Swapped from The Corral in Ennis (55 min each way) to Horn & Cantle at Lone Mountain Ranch (10 min). Much better fit for arrival night — no one wants a 2-hour round trip after traveling all day.",
    })
    .where(eq(schema.itineraryBlocks.id, corralBlock.id));

  console.log("Updated block to Horn & Cantle. Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
