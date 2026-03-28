/**
 * Seed activity photos: match block titles to image URLs.
 *
 * Usage: npx tsx scripts/add-block-images.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc } from "drizzle-orm";
import * as schema from "../src/db/schema";

const TRIP_ID = "83fdfdb7-eb88-4a81-9712-0c8306854b42";

const IMAGE_MAP: Record<string, string> = {
  "fly fishing":
    "https://lirp.cdn-website.com/aae9903b/dms3rep/multi/opt/gallatin-river-guides-guided-fishing-trips-montana-4-1920w.jpg",
  horseback:
    "https://static.wixstatic.com/media/6ac825_acc2599b119b4b32a27eb303dd383311~mv2.jpg/v1/fill/w_600,h_400,al_c,q_80/6ac825_acc2599b119b4b32a27eb303dd383311~mv2.jpg",
  "ousel falls":
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop&q=80",
  yellowstone:
    "https://www.nps.gov/common/uploads/banner_image/imr/homepage/C0B398B8-B507-4BBC-CA7FF67430274C33.jpg",
  alpaca:
    "https://images.unsplash.com/photo-1583337130417-13104dec14c3?w=600&h=400&fit=crop&q=80",
  llama:
    "https://images.unsplash.com/photo-1583337130417-13104dec14c3?w=600&h=400&fit=crop&q=80",
  rodeo:
    "https://images.unsplash.com/photo-1535870558130-296e3e570e4b?w=600&h=400&fit=crop&q=80",
  "farmers market":
    "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=400&fit=crop&q=80",
  golf: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=600&h=400&fit=crop&q=80",
  gondola:
    "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&h=400&fit=crop&q=80",
  "zip line":
    "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=600&h=400&fit=crop&q=80",
  "horn & cantle":
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop&q=80",
  "lone peak brewery":
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=400&fit=crop&q=80",
  "hungry moose":
    "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=600&h=400&fit=crop&q=80",
  "olive b":
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop&q=80",
  beehive:
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop&q=80",
  "rainbow ranch":
    "https://images.unsplash.com/photo-1508424757105-b6d5ad9329d0?w=600&h=400&fit=crop&q=80",
  welcome:
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop&q=80",
  arrival:
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop&q=80",
  departure:
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=400&fit=crop&q=80",
  "free time":
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&h=400&fit=crop&q=80",
  kickoff:
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop&q=80",
  rafting:
    "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=600&h=400&fit=crop&q=80",
  hiking:
    "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=400&fit=crop&q=80",
  "scenic drive":
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=400&fit=crop&q=80",
};

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  // 1. Find the latest itinerary
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

  // 2. Get all blocks
  const blocks = await db
    .select()
    .from(schema.itineraryBlocks)
    .where(eq(schema.itineraryBlocks.itineraryId, itinerary.id));

  console.log(`Found ${blocks.length} blocks`);

  // 3. Match and update
  let updated = 0;
  for (const block of blocks) {
    const titleLower = block.title.toLowerCase();

    // Find the first matching keyword
    const matchedKey = Object.keys(IMAGE_MAP).find((keyword) =>
      titleLower.includes(keyword)
    );

    if (matchedKey) {
      await db
        .update(schema.itineraryBlocks)
        .set({ imageUrl: IMAGE_MAP[matchedKey] })
        .where(eq(schema.itineraryBlocks.id, block.id));

      console.log(`  ✓ "${block.title}" → matched "${matchedKey}"`);
      updated++;
    } else {
      console.log(`  - "${block.title}" → no match`);
    }
  }

  console.log(`\nDone! Updated ${updated}/${blocks.length} blocks with images.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
