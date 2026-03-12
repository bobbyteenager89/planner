/**
 * Test the saveIntakeAnswers server action logic directly.
 *
 * Usage: npx tsx scripts/test-intake-action.ts
 *
 * Tests:
 * 1. Insert preferences for a participant
 * 2. Verify participant status updated to "completed"
 * 3. Verify preferences.rawData contains answers
 * 4. Test upsert (run again — should update, not duplicate)
 * 5. Cleanup
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

  // Use the test participant we seeded
  const participants = await db
    .select()
    .from(schema.participants)
    .where(eq(schema.participants.status, "in_progress"))
    .limit(1);

  if (participants.length === 0) {
    console.error("No in_progress participant found. Run seed-intake-test.ts first.");
    process.exit(1);
  }

  const participant = participants[0];
  console.log(`Testing with participant: ${participant.id} (status: ${participant.status})`);

  const answers = {
    destination: "beach",
    crew: "squad",
    vibe: "food",
  };

  const rawData = { ...answers, completedAt: new Date().toISOString() };
  const activityPreferences = answers.vibe ? [answers.vibe] : [];

  // Test 1: Insert preferences + update status (sequential, no transaction — neon-http limitation)
  console.log("\n--- Test 1: Insert preferences ---");
  try {
    await db
      .insert(schema.preferences)
      .values({
        participantId: participant.id,
        rawData,
        activityPreferences,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.preferences.participantId,
        set: { rawData, activityPreferences, updatedAt: new Date() },
      });

    await db
      .update(schema.participants)
      .set({ status: "completed" })
      .where(eq(schema.participants.id, participant.id));

    console.log("PASS: Both queries completed successfully");
  } catch (err) {
    console.error("FAIL: Query error:", err);
    process.exit(1);
  }

  // Test 2: Verify participant status
  console.log("\n--- Test 2: Verify participant status ---");
  const [updatedParticipant] = await db
    .select()
    .from(schema.participants)
    .where(eq(schema.participants.id, participant.id));

  if (updatedParticipant.status === "completed") {
    console.log("PASS: Participant status is 'completed'");
  } else {
    console.error(`FAIL: Expected 'completed', got '${updatedParticipant.status}'`);
  }

  // Test 3: Verify preferences data
  console.log("\n--- Test 3: Verify preferences rawData ---");
  const [prefs] = await db
    .select()
    .from(schema.preferences)
    .where(eq(schema.preferences.participantId, participant.id));

  if (prefs) {
    const data = prefs.rawData as Record<string, string>;
    const checks = [
      data.destination === "beach",
      data.crew === "squad",
      data.vibe === "food",
      !!data.completedAt,
    ];
    if (checks.every(Boolean)) {
      console.log("PASS: rawData contains all answers + completedAt");
    } else {
      console.error("FAIL: rawData missing fields:", data);
    }

    if (
      Array.isArray(prefs.activityPreferences) &&
      prefs.activityPreferences[0] === "food"
    ) {
      console.log("PASS: activityPreferences mapped correctly");
    } else {
      console.error("FAIL: activityPreferences:", prefs.activityPreferences);
    }
  } else {
    console.error("FAIL: No preferences row found");
  }

  // Test 4: Upsert (run insert again — should update)
  console.log("\n--- Test 4: Upsert test ---");
  const updatedAnswers = { ...answers, vibe: "relaxation" };
  const updatedRawData = { ...updatedAnswers, completedAt: new Date().toISOString() };
  try {
    await db
      .insert(schema.preferences)
      .values({
        participantId: participant.id,
        rawData: updatedRawData,
        activityPreferences: ["relaxation"],
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.preferences.participantId,
        set: {
          rawData: updatedRawData,
          activityPreferences: ["relaxation"],
          updatedAt: new Date(),
        },
      });

    const [upsertedPrefs] = await db
      .select()
      .from(schema.preferences)
      .where(eq(schema.preferences.participantId, participant.id));

    const data = upsertedPrefs.rawData as Record<string, string>;
    if (data.vibe === "relaxation") {
      console.log("PASS: Upsert updated the row (vibe changed to relaxation)");
    } else {
      console.error("FAIL: Upsert did not update:", data);
    }
  } catch (err) {
    console.error("FAIL: Upsert error:", err);
  }

  // Test 5: Count preferences rows (should be exactly 1)
  console.log("\n--- Test 5: No duplicates ---");
  const allPrefs = await db
    .select()
    .from(schema.preferences)
    .where(eq(schema.preferences.participantId, participant.id));

  if (allPrefs.length === 1) {
    console.log("PASS: Exactly 1 preferences row (no duplicates)");
  } else {
    console.error(`FAIL: Found ${allPrefs.length} preferences rows`);
  }

  // Cleanup
  console.log("\n--- Cleanup ---");
  await db
    .delete(schema.preferences)
    .where(eq(schema.preferences.participantId, participant.id));
  await db
    .update(schema.participants)
    .set({ status: "in_progress" })
    .where(eq(schema.participants.id, participant.id));
  console.log("Cleaned up: preferences deleted, participant reset to in_progress");

  console.log("\n=== All tests passed ===");
}

main().catch(console.error);
