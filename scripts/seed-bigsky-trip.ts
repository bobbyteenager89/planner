/**
 * Seed script: creates the Big Sky family trip with all details.
 *
 * Usage: npx tsx scripts/seed-bigsky-trip.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  // Find Andrew's user (the owner)
  const existingUsers = await db.select().from(schema.users).limit(5);
  console.log("Existing users:", existingUsers.map(u => `${u.name} <${u.email}> (${u.id})`));

  if (existingUsers.length === 0) {
    console.error("No users found. Log in first to create your account.");
    process.exit(1);
  }

  // Use the first user as owner (Andrew)
  const owner = existingUsers[0];
  console.log(`\nUsing owner: ${owner.name} <${owner.email}>`);

  // Create the Big Sky trip
  const [trip] = await db
    .insert(schema.trips)
    .values({
      ownerId: owner.id,
      title: "Big Sky Family Trip",
      destination: "Big Sky, Montana",
      startDate: new Date("2026-07-18"),
      endDate: new Date("2026-07-25"),
      status: "intake",
      onboardingPath: "draft",
      onboardingConversation: [
        {
          role: "user",
          content:
            "We have a family trip to Big Sky, Montana planned for July 18-25, 2026. Staying at 20 Moose Ridge Road. Group of about 20 people, ages 4-69 across multiple families. We need people to vote on activities and dinner options so we can build the schedule.",
        },
        {
          role: "assistant",
          content:
            "What a trip! Big Sky in July is incredible — mountain views, outdoor adventures, and plenty of family-friendly options. With a group spanning ages 4 to 69, you've got a great mix to plan for. Since you already have the house, dates, and crew locked in, I've got a great picture of what you need. Let's move forward and get everyone's input on activities and dinners. [ONBOARDING_COMPLETE]",
        },
      ],
    })
    .returning();

  console.log(`\nCreated trip: ${trip.id} — "${trip.title}"`);

  // Add owner as participant
  const [ownerParticipant] = await db
    .insert(schema.participants)
    .values({
      tripId: trip.id,
      userId: owner.id,
      email: owner.email,
      name: owner.name ?? "Andrew",
      role: "owner",
      status: "completed",
    })
    .returning();

  console.log(`Added owner as participant: ${ownerParticipant.id}`);

  console.log("\n--- Big Sky Trip Ready ---");
  console.log(`Trip ID: ${trip.id}`);
  console.log(`Trip URL: https://planner-sooty-theta.vercel.app/trips/${trip.id}`);
  console.log(`Local URL: http://localhost:3000/trips/${trip.id}`);
  console.log(`Intake URL: https://planner-sooty-theta.vercel.app/trips/${trip.id}/intake`);
}

main().catch(console.error);
