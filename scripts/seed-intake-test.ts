/**
 * Seed script: creates a test user, session, trip + participant for intake testing.
 *
 * Usage: npx tsx scripts/seed-intake-test.ts
 *
 * Requires .env.local with DATABASE_URL.
 * Prints the trip ID, intake URL, and session token when done.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import * as schema from "../src/db/schema";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  // Find existing user or create one
  let user: typeof schema.users.$inferSelect;
  const existingUsers = await db.select().from(schema.users).limit(1);

  if (existingUsers.length > 0) {
    user = existingUsers[0];
    console.log(`Found existing user: ${user.email} (${user.id})`);
  } else {
    const [newUser] = await db
      .insert(schema.users)
      .values({
        email: "test@example.com",
        name: "Test User",
        emailVerified: new Date(),
      })
      .returning();
    user = newUser;
    console.log(`Created user: ${user.email} (${user.id})`);
  }

  // Create a session token (NextAuth database sessions)
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(schema.sessions).values({
    sessionToken,
    userId: user.id,
    expires,
  });
  console.log(`Created session token: ${sessionToken}`);

  // Create a test trip
  const [trip] = await db
    .insert(schema.trips)
    .values({
      ownerId: user.id,
      title: "Intake Test Trip",
      destination: "Test Destination",
      status: "intake",
    })
    .returning();
  console.log(`Created trip: ${trip.id} — "${trip.title}"`);

  // Create a participant record linked to this user
  const [participant] = await db
    .insert(schema.participants)
    .values({
      tripId: trip.id,
      userId: user.id,
      email: user.email,
      name: user.name ?? "Test User",
      role: "participant",
      status: "in_progress",
    })
    .returning();
  console.log(`Created participant: ${participant.id} (status: ${participant.status})`);

  console.log("\n--- Ready to test ---");
  console.log(`Intake URL: http://localhost:3000/trips/${trip.id}/intake`);
  console.log(`\nSession cookie (set in browser console):`);
  console.log(
    `document.cookie = "authjs.session-token=${sessionToken}; path=/; max-age=${30 * 24 * 3600}";`
  );
  console.log(
    `\nCleanup SQL:\nDELETE FROM preferences WHERE participant_id = '${participant.id}';\nDELETE FROM participants WHERE id = '${participant.id}';\nDELETE FROM trips WHERE id = '${trip.id}';\nDELETE FROM sessions WHERE session_token = '${sessionToken}';`
  );
}

main().catch(console.error);
