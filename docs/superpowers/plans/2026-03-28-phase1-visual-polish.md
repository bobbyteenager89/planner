# Phase 1: Photos + Visual Polish + Interactive Maps

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Big Sky share page visually stunning and information-rich — activity photos, interactive day maps, local spots guide, weather forecasts, countdown, travel info, packing list, OG image. Fix the Ennis dinner.

**Architecture:** Add `imageUrl` column to itinerary blocks. Build a local spots data file and a maps page. Use Google Maps Embed API (free, no key required for simple embeds) for interactive maps. Use Open-Meteo API (free, no key) for weather. Generate OG images with `@vercel/og`. All new pages are public (no auth) under the existing `/trips/[id]/share` route tree.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, Drizzle ORM, @vercel/og, Open-Meteo API, Google Maps Embed API

**Key URLs:**
- Guest share: `/trips/[id]/share`
- Day map: `/trips/[id]/share/map/[day]` (new)
- Local guide: `/trips/[id]/share/guide` (new)
- OG image: `/api/trips/[id]/og` (new)

---

## File Structure

```
src/
├── app/
│   ├── api/trips/[id]/
│   │   ├── og/route.tsx                  ← NEW: OG image generation
│   │   └── blocks/route.ts              ← NEW: update block fields (host)
│   └── trips/[id]/share/
│       ├── guest-itinerary.tsx           ← MODIFY: photos, weather, countdown, travel info
│       ├── day-picker.tsx                ← MODIFY: minor styling
│       ├── page.tsx                      ← MODIFY: add metadata with OG image
│       ├── layout.tsx                    ← MODIFY: add shared data context
│       ├── guide/page.tsx               ← NEW: local spots guide
│       └── map/[day]/page.tsx           ← NEW: interactive day map
├── db/
│   └── schema.ts                        ← MODIFY: add imageUrl to itineraryBlocks
├── lib/
│   └── bigsky-local-spots.ts            ← NEW: curated local spots data
scripts/
├── add-block-images.ts                   ← NEW: seed imageUrl for existing blocks
└── fix-ennis-dinner.ts                   ← NEW: swap Corral to Horn & Cantle
```

---

### Task 1: Fix the Ennis Dinner

**Files:**
- Create: `scripts/fix-ennis-dinner.ts`

The Corral Steakhouse is in Ennis, MT — 55 min each way from Big Sky. Swap Day 1 dinner to Horn & Cantle at Lone Mountain Ranch (10 min drive, upscale Montana dining, perfect arrival night).

- [ ] **Step 1: Write the fix script**

```typescript
// scripts/fix-ennis-dinner.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import * as schema from "../src/db/schema";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  // Find the Corral dinner block on Day 1
  const tripId = "83fdfdb7-eb88-4a81-9712-0c8306854b42";

  // Get latest itinerary
  const [itinerary] = await db
    .select()
    .from(schema.itineraries)
    .where(eq(schema.itineraries.tripId, tripId))
    .orderBy(schema.itineraries.version)
    .limit(1);

  if (!itinerary) {
    console.log("No itinerary found");
    return;
  }

  // Find the Corral block
  const blocks = await db
    .select()
    .from(schema.itineraryBlocks)
    .where(eq(schema.itineraryBlocks.itineraryId, itinerary.id));

  const corralBlock = blocks.find(
    (b) => b.location?.includes("Corral") || b.title.includes("Corral")
  );

  if (!corralBlock) {
    console.log("Corral block not found — may have been fixed already");
    return;
  }

  console.log(`Found: "${corralBlock.title}" at "${corralBlock.location}"`);
  console.log("Swapping to Horn & Cantle at Lone Mountain Ranch...");

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

  console.log("Done! Dinner updated to Horn & Cantle.");
}

main().catch(console.error);
```

- [ ] **Step 2: Run the fix**

Run: `npx tsx scripts/fix-ennis-dinner.ts`
Expected: `Found: "Welcome Dinner at The Corral Steakhouse" ... Done! Dinner updated to Horn & Cantle.`

- [ ] **Step 3: Verify on live site**

Run: `npx vercel --prod --yes`
Then open: `https://planner-sooty-theta.vercel.app/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/share`
Check Day 1: dinner should show Horn & Cantle, ~10 min drive (not 55 min).

- [ ] **Step 4: Commit**

```bash
git add scripts/fix-ennis-dinner.ts
git commit -m "fix: swap Ennis dinner to Horn & Cantle (10 min vs 55 min drive)"
```

---

### Task 2: Add imageUrl Column to Blocks

**Files:**
- Modify: `src/db/schema.ts` (itineraryBlocks table)

- [ ] **Step 1: Add the column**

In `src/db/schema.ts`, add `imageUrl` to the `itineraryBlocks` table definition, after `metadata`:

```typescript
    metadata: jsonb("metadata"),
    imageUrl: text("image_url"),
```

- [ ] **Step 2: Push schema to Neon**

Run: `npm run db:push`
Expected: Drizzle detects the new column and adds it. Confirm with `y`.

- [ ] **Step 3: Update the share API to include imageUrl**

In `src/app/api/trips/[id]/share/route.ts`, add `imageUrl` to the blocks select:

```typescript
    // In the blocks select, add after estimatedCost:
    imageUrl: itineraryBlocks.imageUrl,
```

The full select for blocks becomes:
```typescript
    database
      .select({
        id: itineraryBlocks.id,
        dayNumber: itineraryBlocks.dayNumber,
        sortOrder: itineraryBlocks.sortOrder,
        type: itineraryBlocks.type,
        title: itineraryBlocks.title,
        description: itineraryBlocks.description,
        startTime: itineraryBlocks.startTime,
        endTime: itineraryBlocks.endTime,
        location: itineraryBlocks.location,
        estimatedCost: itineraryBlocks.estimatedCost,
        imageUrl: itineraryBlocks.imageUrl,
      })
      .from(itineraryBlocks)
      .where(eq(itineraryBlocks.itineraryId, itinerary.id)),
```

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts src/app/api/trips/[id]/share/route.ts
git commit -m "feat: add imageUrl column to itinerary blocks"
```

---

### Task 3: Seed Activity Photos for Big Sky Blocks

**Files:**
- Create: `scripts/add-block-images.ts`

Map existing itinerary block titles to photo URLs. Use the images from `bigsky-config.ts` where possible, plus curated Unsplash/venue photos for the rest.

- [ ] **Step 1: Write the image seeding script**

```typescript
// scripts/add-block-images.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

// Map block title keywords → photo URLs
// Sources: bigsky-config.ts images, Unsplash, venue websites
const IMAGE_MAP: Record<string, string> = {
  // Activities (from bigsky-config)
  "fly fishing": "https://lirp.cdn-website.com/aae9903b/dms3rep/multi/opt/gallatin-river-guides-guided-fishing-trips-montana-4-1920w.jpg",
  "horseback": "https://static.wixstatic.com/media/6ac825_acc2599b119b4b32a27eb303dd383311~mv2.jpg/v1/fill/w_600,h_400,al_c,q_80/6ac825_acc2599b119b4b32a27eb303dd383311~mv2.jpg",
  "ousel falls": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop&q=80",
  "yellowstone": "https://www.nps.gov/common/uploads/banner_image/imr/homepage/C0B398B8-B507-4BBC-CA7FF67430274C33.jpg",
  "alpaca": "https://images.unsplash.com/photo-1583337130417-13104dec14c3?w=600&h=400&fit=crop&q=80",
  "llama": "https://images.unsplash.com/photo-1583337130417-13104dec14c3?w=600&h=400&fit=crop&q=80",
  "rodeo": "https://images.unsplash.com/photo-1535870558130-296e3e570e4b?w=600&h=400&fit=crop&q=80",
  "farmers market": "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=400&fit=crop&q=80",
  "golf": "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=600&h=400&fit=crop&q=80",
  "gondola": "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&h=400&fit=crop&q=80",
  "zip line": "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=600&h=400&fit=crop&q=80",
  // Meals
  "horn & cantle": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop&q=80",
  "lone peak brewery": "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=400&fit=crop&q=80",
  "hungry moose": "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=600&h=400&fit=crop&q=80",
  "olive b": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop&q=80",
  "beehive": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop&q=80",
  "rainbow ranch": "https://images.unsplash.com/photo-1508424757105-b6d5ad9329d0?w=600&h=400&fit=crop&q=80",
  // General
  "welcome": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop&q=80",
  "arrival": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop&q=80",
  "departure": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=400&fit=crop&q=80",
  "free time": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&h=400&fit=crop&q=80",
  "kickoff": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop&q=80",
  "rafting": "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=600&h=400&fit=crop&q=80",
  "hiking": "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=400&fit=crop&q=80",
  "scenic drive": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=400&fit=crop&q=80",
};

function findImage(title: string): string | null {
  const lower = title.toLowerCase();
  for (const [keyword, url] of Object.entries(IMAGE_MAP)) {
    if (lower.includes(keyword)) return url;
  }
  return null;
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  const tripId = "83fdfdb7-eb88-4a81-9712-0c8306854b42";

  // Get latest itinerary
  const [itinerary] = await db
    .select()
    .from(schema.itineraries)
    .where(eq(schema.itineraries.tripId, tripId))
    .orderBy(schema.itineraries.version)
    .limit(1);

  if (!itinerary) {
    console.log("No itinerary found");
    return;
  }

  const blocks = await db
    .select()
    .from(schema.itineraryBlocks)
    .where(eq(schema.itineraryBlocks.itineraryId, itinerary.id));

  let updated = 0;
  let skipped = 0;

  for (const block of blocks) {
    const imageUrl = findImage(block.title);
    if (imageUrl) {
      await db
        .update(schema.itineraryBlocks)
        .set({ imageUrl })
        .where(eq(schema.itineraryBlocks.id, block.id));
      console.log(`✅ ${block.title} → image set`);
      updated++;
    } else {
      console.log(`⏭ ${block.title} → no match`);
      skipped++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
}

main().catch(console.error);
```

- [ ] **Step 2: Run the script**

Run: `npx tsx scripts/add-block-images.ts`
Expected: Most blocks get an image URL. Note any skipped ones for manual attention.

- [ ] **Step 3: Commit**

```bash
git add scripts/add-block-images.ts
git commit -m "feat: seed activity photos for Big Sky itinerary blocks"
```

---

### Task 4: Render Photos on Share Page Cards

**Files:**
- Modify: `src/app/trips/[id]/share/guest-itinerary.tsx`

Add the photo as a banner image at the top of each card, above the type badge row.

- [ ] **Step 1: Update the Block interface**

Add `imageUrl` to the `Block` interface at the top of `guest-itinerary.tsx`:

```typescript
interface Block {
  id: string;
  dayNumber: number;
  sortOrder: number;
  type: string;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  estimatedCost: string | null;
  aiReasoning: string | null;
  imageUrl: string | null;
}
```

- [ ] **Step 2: Add image rendering to the card**

Inside the block card `div` (the one with `onClick={() => setExpandedBlock(...)`), add the image banner **before** the top row:

```tsx
                {/* Photo banner */}
                {block.imageUrl && (
                  <div
                    className="w-full h-40 sm:h-48 bg-cover bg-center -mt-6 -mx-7 mb-4"
                    style={{
                      backgroundImage: `url(${block.imageUrl})`,
                      width: "calc(100% + 3.5rem)",
                      borderRadius: "2px 2px 0 0",
                    }}
                  />
                )}
```

Note: The `-mt-6 -mx-7` offsets the card padding (`1.5rem 1.75rem`) so the image goes edge-to-edge inside the card border. The width calc compensates for the horizontal padding.

- [ ] **Step 3: Adjust card padding for image cards**

Update the card style to use `overflow: "hidden"` so the image respects the border:

```typescript
                  style={{
                    backgroundColor: CARD_BG,
                    border: `2px solid ${isAlt ? MUSTARD : RUST}`,
                    borderRadius: "2px",
                    borderStyle: isAlt ? "dashed" : "solid",
                    padding: "1.5rem 1.75rem",
                    marginLeft: isAlt ? "1.5rem" : 0,
                    opacity: isAlt && !isExpanded ? 0.8 : 1,
                    overflow: "hidden",
                  }}
```

- [ ] **Step 4: Build and verify locally**

Run: `npm run build`
Expected: Builds clean, no errors.

- [ ] **Step 5: Deploy and verify**

Run: `npx vercel --prod --yes`
Open the share page, verify photos appear on activity cards.

- [ ] **Step 6: Commit**

```bash
git add src/app/trips/[id]/share/guest-itinerary.tsx
git commit -m "feat: render activity photos on share page cards"
```

---

### Task 5: Also Render Photos on Review Page Cards

**Files:**
- Modify: `src/app/trips/[id]/review/review-content.tsx`

Same pattern as Task 4 but for the host review page.

- [ ] **Step 1: Update Block interface**

Add `imageUrl: string | null;` to the `Block` interface in `review-content.tsx`.

- [ ] **Step 2: Add image banner to review cards**

Same image banner code as Task 4, inserted before the top row in the review block card. Identical markup.

- [ ] **Step 3: Add overflow hidden to review card**

Same `overflow: "hidden"` addition to the card style.

- [ ] **Step 4: Build, deploy, verify**

Run: `npm run build && npx vercel --prod --yes`
Check the review page at `/trips/83fdfdb7-.../review` — photos should appear.

- [ ] **Step 5: Commit**

```bash
git add src/app/trips/[id]/review/review-content.tsx
git commit -m "feat: render activity photos on review page cards"
```

---

### Task 6: OG Image for iMessage/WhatsApp Preview

**Files:**
- Create: `src/app/api/trips/[id]/og/route.tsx`
- Modify: `src/app/trips/[id]/share/page.tsx` (add metadata)

Generate a dynamic OG image using `@vercel/og` that shows "BIG SKY" in the retro style, dates, and "Goble Family" — so when the share link is pasted in iMessage, it looks great.

- [ ] **Step 1: Install @vercel/og**

Run: `npm install @vercel/og`

- [ ] **Step 2: Create the OG image route**

```tsx
// src/app/api/trips/[id]/og/route.tsx
import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "60px 80px",
          backgroundColor: "#D14F36",
          fontFamily: "Arial Black, Impact, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#EBB644",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            marginBottom: 12,
          }}
        >
          Goble Family
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: "#F3EBE0",
            textTransform: "uppercase",
            lineHeight: 1,
            textShadow: "4px 4px 0 #EBB644",
            letterSpacing: "-0.02em",
          }}
        >
          BIG SKY
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: "#F3EBE0",
            marginTop: 16,
          }}
        >
          July 18 — 25, 2026
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: "#F3EBE0",
            opacity: 0.7,
            marginTop: 12,
          }}
        >
          8 days · Big Sky, Montana · Your trip is planned
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
```

- [ ] **Step 3: Add metadata to share page**

Update `src/app/trips/[id]/share/page.tsx`:

```tsx
import { GuestItinerary } from "./guest-itinerary";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ogUrl = `https://planner-sooty-theta.vercel.app/api/trips/${id}/og`;

  return {
    title: "Big Sky — Goble Family Trip",
    description: "July 18–25, 2026 · 8 days in Big Sky, Montana. Your trip is planned.",
    openGraph: {
      title: "Big Sky — Goble Family Trip",
      description: "July 18–25, 2026 · 8 days in Big Sky, Montana",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Big Sky — Goble Family Trip",
      images: [ogUrl],
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GuestItinerary tripId={id} />;
}
```

- [ ] **Step 4: Add OG route to middleware public routes**

In `src/middleware.ts`, the route `/api/trips/[id]/og` needs to be public. It's already covered by the existing pattern:
```
pathname.startsWith("/api/trips/") && pathname.includes("/share")
```
Wait — `/og` doesn't contain "share". Add a new public route pattern:

```typescript
(pathname.startsWith("/api/trips/") && pathname.includes("/og")) ||
```

- [ ] **Step 5: Build, deploy, verify**

Run: `npm run build && npx vercel --prod --yes`
Test: Paste the share URL into iMessage or use https://www.opengraph.xyz/ to preview.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/trips/[id]/og/route.tsx src/app/trips/[id]/share/page.tsx src/middleware.ts
git commit -m "feat: OG image for share link iMessage/WhatsApp preview"
```

---

### Task 7: Countdown + Travel Info Header

**Files:**
- Modify: `src/app/trips/[id]/share/guest-itinerary.tsx`

Add a "countdown + logistics" section between the header and the intro text.

- [ ] **Step 1: Add countdown + travel info section**

After the header `div` (the red banner) and before the warm intro, add:

```tsx
      {/* ═══ COUNTDOWN + TRAVEL INFO ═══ */}
      <div className="max-w-3xl mx-auto px-5 pt-8 sm:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Countdown */}
          <div className="p-4 text-center" style={{ backgroundColor: CARD_BG, border: `2px solid ${RUST}`, borderRadius: "2px" }}>
            <p className="text-4xl font-black" style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}>
              {(() => {
                const tripDate = new Date("2026-07-18");
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const diff = Math.ceil((tripDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return diff > 0 ? diff : 0;
              })()}
            </p>
            <p className="text-lg font-bold uppercase tracking-wider" style={{ color: INK, opacity: 0.55 }}>
              days to go
            </p>
          </div>

          {/* Airport → House */}
          <div className="p-4 text-center" style={{ backgroundColor: CARD_BG, border: `2px solid ${RUST}`, borderRadius: "2px" }}>
            <p className="text-xl font-black" style={{ color: INK }}>
              ✈️ BZN → 🏠
            </p>
            <p className="text-lg font-bold mt-1" style={{ color: INK, opacity: 0.55 }}>
              55 min drive
            </p>
            <a
              href={mapsDirectionsUrl(["Bozeman Yellowstone International Airport", "20 Moose Ridge Road, Big Sky, MT"])}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-bold underline underline-offset-4 mt-1 inline-block"
              style={{ color: RUST }}
            >
              Directions →
            </a>
          </div>

          {/* Nearest Grocery */}
          <div className="p-4 text-center" style={{ backgroundColor: CARD_BG, border: `2px solid ${RUST}`, borderRadius: "2px" }}>
            <p className="text-xl font-black" style={{ color: INK }}>
              🛒 Nearest Grocery
            </p>
            <p className="text-lg font-bold mt-1" style={{ color: INK, opacity: 0.55 }}>
              Hungry Moose Market
            </p>
            <a
              href={mapsUrl("Hungry Moose Market & Deli, Big Sky, MT")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-bold underline underline-offset-4 mt-1 inline-block"
              style={{ color: RUST }}
            >
              5 min drive →
            </a>
          </div>
        </div>
      </div>
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: Builds clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/trips/[id]/share/guest-itinerary.tsx
git commit -m "feat: countdown + travel info cards on share page"
```

---

### Task 8: Weather Forecast Per Day

**Files:**
- Modify: `src/app/trips/[id]/share/guest-itinerary.tsx`

Use Open-Meteo API (free, no key) to fetch 7-day forecast for Big Sky and display inline on each day header.

- [ ] **Step 1: Add weather fetching to the component**

Add a `weather` state and fetch effect. Open-Meteo forecast API for Big Sky coordinates (45.28°N, 111.40°W):

```typescript
  const [weather, setWeather] = useState<Record<number, { high: number; low: number; code: number }>>({});

  useEffect(() => {
    if (!data?.trip.startDate) return;
    // Open-Meteo free API — no key needed
    const start = data.trip.startDate.split("T")[0];
    const end = data.trip.endDate?.split("T")[0] || start;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=45.28&longitude=-111.40&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=fahrenheit&start_date=${start}&end_date=${end}&timezone=America/Denver`
    )
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (!json?.daily) return;
        const map: Record<number, { high: number; low: number; code: number }> = {};
        json.daily.time.forEach((date: string, i: number) => {
          map[i + 1] = {
            high: Math.round(json.daily.temperature_2m_max[i]),
            low: Math.round(json.daily.temperature_2m_min[i]),
            code: json.daily.weather_code[i],
          };
        });
        setWeather(map);
      })
      .catch(() => {}); // Weather is decorative — fail silently
  }, [data]);
```

Add a weather code → emoji helper:

```typescript
function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}
```

- [ ] **Step 2: Display weather on day header**

In the day content section, after the day date, add weather:

```tsx
          {dayDate && (
            <p className="text-xl font-bold uppercase tracking-wider mt-1" style={{ color: INK, opacity: 0.55 }}>
              {formatDayDate(dayDate)}
              {weather[activeDay] && (
                <span className="ml-3 normal-case tracking-normal">
                  {weatherEmoji(weather[activeDay].code)} {weather[activeDay].high}°/{weather[activeDay].low}°F
                </span>
              )}
            </p>
          )}
```

- [ ] **Step 3: Build, deploy, verify**

Run: `npm run build && npx vercel --prod --yes`
Note: Weather data only appears within the API forecast window (~16 days out). For dates further out, it gracefully shows nothing.

- [ ] **Step 4: Commit**

```bash
git add src/app/trips/[id]/share/guest-itinerary.tsx
git commit -m "feat: weather forecast per day on share page"
```

---

### Task 9: Local Spots Guide Page

**Files:**
- Create: `src/lib/bigsky-local-spots.ts`
- Create: `src/app/trips/[id]/share/guide/page.tsx`
- Modify: `src/app/trips/[id]/share/guest-itinerary.tsx` (add link)

A curated guide of local spots — coffee, grocery, gas, ice cream, pizza, pharmacies — organized by category. Like a custom Google My Maps but embedded.

- [ ] **Step 1: Create the local spots data file**

```typescript
// src/lib/bigsky-local-spots.ts

export interface LocalSpot {
  name: string;
  category: string;
  address: string;
  note: string;
  driveMinutes?: number;
}

export const LOCAL_SPOTS: LocalSpot[] = [
  // Coffee
  { name: "Hungry Moose Market & Deli", category: "☕ Coffee & Breakfast", address: "Big Sky Town Center, Big Sky, MT", note: "Best coffee in town. Also has grab-and-go breakfast burritos and pastries.", driveMinutes: 5 },
  { name: "Blue Moon Bakery", category: "☕ Coffee & Breakfast", address: "Big Sky Town Center, Big Sky, MT", note: "Fresh-baked pastries, breakfast sandwiches, good espresso.", driveMinutes: 5 },
  { name: "Caliber Coffee", category: "☕ Coffee & Breakfast", address: "Big Sky Town Center, Big Sky, MT", note: "Specialty coffee, smaller spot, worth the stop.", driveMinutes: 5 },

  // Groceries
  { name: "Hungry Moose Market", category: "🛒 Groceries", address: "Big Sky Town Center, Big Sky, MT", note: "Your main grocery store. Small but stocked. Get snacks, drinks, sunscreen here.", driveMinutes: 5 },
  { name: "Roxy's Market", category: "🛒 Groceries", address: "Meadow Village, Big Sky, MT", note: "Smaller market, good for quick grabs. Closer to the Mountain Village side.", driveMinutes: 8 },
  { name: "Town & Country Foods", category: "🛒 Groceries", address: "Bozeman, MT", note: "Full-size grocery store. Stock up on the drive in from the airport.", driveMinutes: 50 },

  // Gas
  { name: "Conoco Big Sky", category: "⛽ Gas Stations", address: "US-191 & Lone Mountain Trail, Big Sky, MT", note: "Only gas station in Big Sky. Fill up here — next station is 30 min away.", driveMinutes: 5 },

  // Ice Cream & Treats
  { name: "Sweet Peaks", category: "🍦 Ice Cream & Treats", address: "Big Sky Town Center, Big Sky, MT", note: "Montana-made ice cream. Huckleberry is the move. The kids will ask to come back.", driveMinutes: 5 },
  { name: "The Lotus Pad", category: "🍦 Ice Cream & Treats", address: "Big Sky Town Center, Big Sky, MT", note: "Thai food + bubble tea. Great for an afternoon pick-me-up.", driveMinutes: 5 },

  // Quick Eats
  { name: "Beehive Basin Brewery", category: "🍕 Quick Eats", address: "Big Sky Town Center, Big Sky, MT", note: "Wood-fired pizza + local brews. Kid-friendly patio. Great for a casual night.", driveMinutes: 5 },
  { name: "Lone Peak Brewery", category: "🍕 Quick Eats", address: "Meadow Village, Big Sky, MT", note: "Burgers, wings, pasta. Solid pub food. TVs for sports.", driveMinutes: 7 },
  { name: "By Word of Mouth", category: "🍕 Quick Eats", address: "Meadow Village, Big Sky, MT", note: "Sandwiches, wraps, soups. Good lunch spot between activities.", driveMinutes: 7 },

  // Pharmacy & Essentials
  { name: "Big Sky Pharmacy", category: "💊 Pharmacy & Essentials", address: "Meadow Village, Big Sky, MT", note: "Prescriptions, first aid, sunscreen, bug spray. Small but has basics.", driveMinutes: 7 },
  { name: "Bozeman Costco", category: "💊 Pharmacy & Essentials", address: "Bozeman, MT", note: "Hit this on the airport drive if you need bulk snacks, drinks, or supplies.", driveMinutes: 50 },

  // Outdoor Gear
  { name: "Grizzly Outfitters", category: "🎿 Outdoor Gear", address: "Big Sky Town Center, Big Sky, MT", note: "Rent bikes, buy fishing gear, get trail maps. Staff knows every trail.", driveMinutes: 5 },
  { name: "Gallatin Alpine Sports", category: "🎿 Outdoor Gear", address: "Meadow Village, Big Sky, MT", note: "Gear rental, repair, trail advice. Good for last-minute equipment.", driveMinutes: 7 },
];

export const SPOT_CATEGORIES = [...new Set(LOCAL_SPOTS.map((s) => s.category))];
```

- [ ] **Step 2: Create the guide page**

```tsx
// src/app/trips/[id]/share/guide/page.tsx
import { LOCAL_SPOTS, SPOT_CATEGORIES } from "@/lib/bigsky-local-spots";

const INK = "#3B1A0F";
const RUST = "#D14F36";
const CREAM = "#F3EBE0";
const CARD_BG = "#EBE1D3";

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function GuidePage() {
  return (
    <div style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      {/* Header */}
      <div className="px-5 py-8 sm:px-10 sm:py-10" style={{ backgroundColor: RUST }}>
        <a href="javascript:history.back()" className="text-lg font-bold" style={{ color: CREAM, opacity: 0.7 }}>
          ← Back to itinerary
        </a>
        <h1
          className="text-4xl sm:text-5xl font-black uppercase leading-none mt-4"
          style={{ color: CREAM, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
        >
          Local Guide
        </h1>
        <p className="text-xl font-bold mt-2" style={{ color: CREAM, opacity: 0.8 }}>
          Everything you need in Big Sky
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8 sm:px-8">
        {SPOT_CATEGORIES.map((category) => {
          const spots = LOCAL_SPOTS.filter((s) => s.category === category);
          return (
            <div key={category} className="mb-10">
              <h2
                className="text-2xl font-black uppercase mb-4"
                style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
              >
                {category}
              </h2>
              <div className="space-y-3">
                {spots.map((spot) => (
                  <div
                    key={spot.name}
                    className="p-5"
                    style={{ backgroundColor: CARD_BG, border: `2px solid ${RUST}`, borderRadius: "2px" }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xl font-black" style={{ color: INK }}>
                          {spot.name}
                        </p>
                        <p className="text-lg font-medium mt-1 leading-relaxed" style={{ color: INK, opacity: 0.75 }}>
                          {spot.note}
                        </p>
                      </div>
                      {spot.driveMinutes && (
                        <span className="text-lg font-bold shrink-0" style={{ color: INK, opacity: 0.5 }}>
                          ~{spot.driveMinutes} min
                        </span>
                      )}
                    </div>
                    <a
                      href={mapsUrl(spot.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-lg font-bold underline underline-offset-4 mt-2"
                      style={{ color: RUST }}
                    >
                      📍 Directions →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add guide link to share page**

In `guest-itinerary.tsx`, add a link in the countdown/travel info section (or below the intro text):

```tsx
        <a
          href={`/trips/${tripId}/share/guide`}
          className="inline-block text-xl font-bold px-6 py-3 mt-4"
          style={{ backgroundColor: CARD_BG, color: INK, border: `2px solid ${RUST}`, borderRadius: "2px" }}
        >
          🗺 Local Guide — Coffee, Groceries, Ice Cream →
        </a>
```

- [ ] **Step 4: Build, deploy, verify**

Run: `npm run build && npx vercel --prod --yes`
Open `/trips/83fdfdb7-.../share/guide` — should show all local spots organized by category.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bigsky-local-spots.ts src/app/trips/[id]/share/guide/page.tsx src/app/trips/[id]/share/guest-itinerary.tsx
git commit -m "feat: local spots guide page (coffee, grocery, gear, etc.)"
```

---

### Task 10: Interactive Day Map Page

**Files:**
- Create: `src/app/trips/[id]/share/map/[day]/page.tsx`
- Modify: `src/app/trips/[id]/share/guest-itinerary.tsx` (update "Open full route" link)

Each day gets a dedicated map page showing the route and all stops on a Google Maps embed.

- [ ] **Step 1: Create the day map page**

```tsx
// src/app/trips/[id]/share/map/[day]/page.tsx
"use client";

import { useState, useEffect } from "react";

const INK = "#3B1A0F";
const RUST = "#D14F36";
const CREAM = "#F3EBE0";
const CARD_BG = "#EBE1D3";

interface Block {
  id: string;
  dayNumber: number;
  sortOrder: number;
  type: string;
  title: string;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

function mapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function mapsEmbedUrl(locations: string[]): string {
  if (locations.length === 0) return "";
  if (locations.length === 1) {
    return `https://www.google.com/maps/embed/v1/place?key=FREE&q=${encodeURIComponent(locations[0])}`;
  }
  // Use directions embed for multi-stop
  const origin = encodeURIComponent(locations[0]);
  const destination = encodeURIComponent(locations[locations.length - 1]);
  const waypoints = locations.slice(1, -1).map(encodeURIComponent).join("|");
  let url = `https://www.google.com/maps/embed/v1/directions?key=FREE&origin=${origin}&destination=${destination}&mode=driving`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  return url;
}

function mapsDirectionsUrl(locations: string[]) {
  if (locations.length < 2) return mapsUrl(locations[0] || "Big Sky, MT");
  const origin = encodeURIComponent(locations[0]);
  const destination = encodeURIComponent(locations[locations.length - 1]);
  const waypoints = locations.slice(1, -1).map((l) => encodeURIComponent(l)).join("|");
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  return url;
}

export default function DayMapPage({
  params,
}: {
  params: Promise<{ id: string; day: string }>;
}) {
  const [tripId, setTripId] = useState("");
  const [dayNumber, setDayNumber] = useState(0);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ id, day }) => {
      setTripId(id);
      setDayNumber(parseInt(day, 10));
      fetch(`/api/trips/${id}/share`)
        .then((r) => r.json())
        .then((data) => {
          const dayBlocks = data.blocks
            .filter((b: Block) => b.dayNumber === parseInt(day, 10))
            .sort((a: Block, b: Block) => a.sortOrder - b.sortOrder);
          setBlocks(dayBlocks);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <p className="text-xl font-semibold" style={{ color: INK }}>Loading map...</p>
      </div>
    );
  }

  const locations = blocks
    .filter((b) => b.location && !b.title.includes("(Alt)"))
    .map((b) => b.location!);

  const uniqueLocations = [...new Set(locations)];

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      {/* Header */}
      <div className="px-5 py-6 sm:px-10" style={{ backgroundColor: RUST }}>
        <a
          href={`/trips/${tripId}/share`}
          className="text-lg font-bold"
          style={{ color: CREAM, opacity: 0.7 }}
        >
          ← Back to itinerary
        </a>
        <h1
          className="text-3xl sm:text-4xl font-black uppercase mt-3"
          style={{ color: CREAM, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
        >
          Day {dayNumber} Map
        </h1>
        <p className="text-xl font-bold mt-1" style={{ color: CREAM, opacity: 0.8 }}>
          {uniqueLocations.length} stops
        </p>
      </div>

      {/* Map embed — full width */}
      <div className="w-full h-[50vh] sm:h-[60vh]" style={{ backgroundColor: CARD_BG }}>
        {uniqueLocations.length > 0 ? (
          <iframe
            src={mapsEmbedUrl(uniqueLocations)}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xl font-bold" style={{ color: INK, opacity: 0.5 }}>
              No locations for this day
            </p>
          </div>
        )}
      </div>

      {/* Stop list */}
      <div className="max-w-3xl mx-auto px-5 py-8 sm:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black uppercase" style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}>
            Stops
          </h2>
          {uniqueLocations.length >= 2 && (
            <a
              href={mapsDirectionsUrl(uniqueLocations)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl font-bold px-5 py-2"
              style={{ backgroundColor: RUST, color: CREAM, borderRadius: "2px" }}
            >
              Open in Google Maps →
            </a>
          )}
        </div>

        <div className="space-y-3">
          {blocks
            .filter((b) => b.location && !b.title.includes("(Alt)"))
            .map((block, idx) => (
              <div
                key={block.id}
                className="flex items-start gap-4 p-4"
                style={{ backgroundColor: CARD_BG, border: `2px solid ${RUST}`, borderRadius: "2px" }}
              >
                <span
                  className="text-2xl font-black shrink-0 w-8 h-8 flex items-center justify-center"
                  style={{ color: CREAM, backgroundColor: RUST, borderRadius: "50%" }}
                >
                  {idx + 1}
                </span>
                <div>
                  <p className="text-xl font-black" style={{ color: INK }}>
                    {block.title.replace(/^(Morning|Afternoon|Evening|Mid-Morning|Full-Day Trip|Lunch|Dinner|Breakfast):?\s*/i, "")}
                  </p>
                  {block.startTime && (
                    <p className="text-lg font-mono font-bold mt-0.5" style={{ color: INK, opacity: 0.6 }}>
                      {formatTime(block.startTime)}{block.endTime && ` – ${formatTime(block.endTime)}`}
                    </p>
                  )}
                  <a
                    href={mapsUrl(block.location!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-lg font-bold underline underline-offset-4 mt-1"
                    style={{ color: RUST }}
                  >
                    📍 {block.location} →
                  </a>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update "Open full route" link on share page**

In `guest-itinerary.tsx`, change the "Open full route →" link to point to the new map page:

```tsx
            {dayLocs.length >= 2 && (
              <a
                href={`/trips/${tripId}/share/map/${activeDay}`}
                className="text-xl font-bold underline underline-offset-4"
                style={{ color: RUST }}
              >
                Open full route →
              </a>
            )}
```

- [ ] **Step 3: Handle Google Maps Embed API key**

The Google Maps Embed API requires an API key (it's free but keyed). Two options:
- Option A: Use a Google Maps API key (free tier, 28K loads/month)
- Option B: Fall back to a static Google Maps link instead of an embed

For now, use `mapsDirectionsUrl` as an `<a>` link to open Google Maps in a new tab rather than an embed. Replace the iframe with a prominent "Open in Google Maps" button and show the stop list below it. This avoids the API key requirement entirely while still being useful.

Update the map embed section:

```tsx
      {/* Map link — opens Google Maps */}
      <div className="w-full py-12 text-center" style={{ backgroundColor: CARD_BG }}>
        {uniqueLocations.length >= 2 ? (
          <a
            href={mapsDirectionsUrl(uniqueLocations)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-2xl font-black uppercase px-8 py-4"
            style={{ backgroundColor: RUST, color: CREAM, borderRadius: "2px" }}
          >
            🗺 Open Route in Google Maps →
          </a>
        ) : (
          <p className="text-xl font-bold" style={{ color: INK, opacity: 0.5 }}>
            No multi-stop route for this day
          </p>
        )}
        <p className="text-lg font-bold mt-3" style={{ color: INK, opacity: 0.5 }}>
          {uniqueLocations.length} stops · Day {dayNumber}
        </p>
      </div>
```

- [ ] **Step 4: Add map routes to middleware**

In `src/middleware.ts`, the map route `/trips/[id]/share/map/[day]` is already covered by:
```
pathname.includes("/share") && pathname.includes("/trips/")
```
No changes needed.

- [ ] **Step 5: Build, deploy, verify**

Run: `npm run build && npx vercel --prod --yes`
Click "Open full route" on any day → should go to `/trips/.../share/map/2` with stop list + Google Maps link.

- [ ] **Step 6: Commit**

```bash
git add src/app/trips/[id]/share/map/[day]/page.tsx src/app/trips/[id]/share/guest-itinerary.tsx
git commit -m "feat: interactive day map page with stop list"
```

---

### Task 11: AI-Generated Packing List

**Files:**
- Create: `src/app/api/trips/[id]/packing-list/route.ts`
- Modify: `src/app/trips/[id]/share/guest-itinerary.tsx` (add link/section)

Generate a packing list from the itinerary activities using Claude Haiku (fast + cheap).

- [ ] **Step 1: Create the packing list API route**

```typescript
// src/app/api/trips/[id]/packing-list/route.ts
import { db } from "@/db";
import { trips, itineraries, itineraryBlocks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const database = db();

  const [trip] = await database
    .select({ title: trips.title, destination: trips.destination, startDate: trips.startDate, endDate: trips.endDate })
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) return Response.json({ error: "Not found" }, { status: 404 });

  const [itinerary] = await database
    .select({ id: itineraries.id })
    .from(itineraries)
    .where(eq(itineraries.tripId, id))
    .orderBy(desc(itineraries.version))
    .limit(1);

  if (!itinerary) return Response.json({ packingList: null });

  const blocks = await database
    .select({ title: itineraryBlocks.title, type: itineraryBlocks.type, description: itineraryBlocks.description })
    .from(itineraryBlocks)
    .where(eq(itineraryBlocks.itineraryId, itinerary.id));

  const activities = blocks.map((b) => `${b.title}: ${b.description || ""}`).join("\n");

  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Generate a packing list for a family trip to ${trip.destination} (${trip.startDate ? new Date(trip.startDate).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "summer"}).

Activities planned:
${activities}

Output a JSON object with categories as keys and arrays of items as values. Be specific to the activities (e.g., "wading boots" for fly fishing, "closed-toe shoes" for horseback riding). Include essentials like sunscreen and bug spray for Montana in July. Keep it practical — no over-packing.

Format: {"Category": ["item1", "item2"]}
Only output the JSON, nothing else.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const packingList = JSON.parse(text);
    return Response.json(
      { packingList },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
    );
  } catch {
    return Response.json({ packingList: null });
  }
}
```

- [ ] **Step 2: Add packing list route to middleware public routes**

In `src/middleware.ts`, add:
```typescript
(pathname.startsWith("/api/trips/") && pathname.includes("/packing-list")) ||
```

- [ ] **Step 3: Add packing list section to share page footer area**

In `guest-itinerary.tsx`, add a "Packing List" button that fetches and displays the list:

```tsx
      {/* ═══ PACKING LIST ═══ */}
      <PackingListSection tripId={tripId} />
```

Create a sub-component within the same file (or extract to a separate file):

```tsx
function PackingListSection({ tripId }: { tripId: string }) {
  const [list, setList] = useState<Record<string, string[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchList = () => {
    if (list) { setOpen(!open); return; }
    setLoading(true);
    fetch(`/api/trips/${tripId}/packing-list`)
      .then((r) => r.json())
      .then((data) => {
        setList(data.packingList);
        setOpen(true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  return (
    <div className="max-w-3xl mx-auto px-5 pb-8 sm:px-8">
      <button
        onClick={fetchList}
        className="w-full text-xl font-bold py-4 text-center"
        style={{ backgroundColor: CARD_BG, color: INK, border: `2px solid ${RUST}`, borderRadius: "2px" }}
      >
        {loading ? "Generating packing list..." : open ? "🧳 Hide Packing List" : "🧳 What to Pack"}
      </button>

      {open && list && (
        <div className="mt-4 p-6" style={{ backgroundColor: CARD_BG, border: `2px solid ${RUST}`, borderRadius: "2px" }}>
          {Object.entries(list).map(([category, items]) => (
            <div key={category} className="mb-5 last:mb-0">
              <h3 className="text-xl font-black uppercase mb-2" style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}>
                {category}
              </h3>
              <ul className="space-y-1">
                {items.map((item, i) => (
                  <li key={i} className="text-lg font-medium flex items-start gap-2" style={{ color: INK }}>
                    <span className="shrink-0">☐</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Build, deploy, verify**

Run: `npm run build && npx vercel --prod --yes`
Open share page, scroll to bottom, click "What to Pack" — should generate and display a categorized packing list.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/trips/[id]/packing-list/route.ts src/middleware.ts src/app/trips/[id]/share/guest-itinerary.tsx
git commit -m "feat: AI-generated packing list on share page"
```

---

## Summary

| Task | What | Effort |
|------|------|--------|
| 1 | Fix Ennis dinner → Horn & Cantle | 10 min |
| 2 | Add imageUrl column to blocks | 15 min |
| 3 | Seed photos for Big Sky blocks | 15 min |
| 4 | Render photos on share page cards | 30 min |
| 5 | Render photos on review page cards | 15 min |
| 6 | OG image for iMessage preview | 30 min |
| 7 | Countdown + travel info header | 20 min |
| 8 | Weather forecast per day | 20 min |
| 9 | Local spots guide page | 45 min |
| 10 | Interactive day map page | 45 min |
| 11 | AI-generated packing list | 30 min |

**Total: ~4.5 hours across 11 tasks, 3-4 sessions**

## Deferred to Phase 2 (Host Curation)
- Inline block editing on review page
- Drag-to-reorder within a day
- Per-day regeneration
- Pin/unpin UI
- Add/remove blocks manually
- Swap restaurant quick-action

## Deferred to Phase 3 (Guest RSVP)
- Name picker + "I'm in" / "Skip" buttons
- Headcount badges per card
- Party size awareness
- Host breakdown view
