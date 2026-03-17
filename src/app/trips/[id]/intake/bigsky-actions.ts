"use server";

import { db } from "@/db";
import { participants, preferences } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { BIGSKY_TRIP_ID } from "./bigsky-config";

export interface BigSkyAnswers {
  name: string;
  email: string;
  partySize: number;
  activityVotes: Record<string, "yes" | "fine" | "pass">;
  chefNights: 1 | 2;
  chefVotes: Record<string, "yes" | "fine" | "pass">;
  arrivalDate?: string;
  arrivalTime?: string;
  departureDate?: string;
  departureTime?: string;
  openText?: string;
}

export async function saveBigSkyAnswers(
  tripId: string,
  answers: BigSkyAnswers
) {
  // Only allow for the Big Sky trip
  if (tripId !== BIGSKY_TRIP_ID) throw new Error("Invalid trip");

  if (!answers.name?.trim()) throw new Error("Name is required");
  if (!answers.email?.trim()) throw new Error("Email is required");

  const database = db();
  const email = answers.email.trim().toLowerCase();
  const name = answers.name.trim();

  // Find or create participant by email
  let [participant] = await database
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.tripId, tripId),
        eq(participants.email, email)
      )
    )
    .limit(1);

  if (!participant) {
    // Create new participant (no userId — anonymous)
    [participant] = await database
      .insert(participants)
      .values({
        tripId,
        email,
        name,
        role: "participant",
        status: "in_progress",
      })
      .returning();
  }

  // Build activity preferences from votes
  const activityPrefs = Object.entries(answers.activityVotes)
    .filter(([, vote]) => vote === "yes")
    .map(([id]) => id);

  const hardNos = Object.entries(answers.activityVotes)
    .filter(([, vote]) => vote === "pass")
    .map(([id]) => id);

  // Upsert preferences
  await database
    .insert(preferences)
    .values({
      participantId: participant.id,
      activityPreferences: activityPrefs,
      hardNos,
      additionalNotes: answers.openText || null,
      rawData: {
        ...answers,
        completedAt: new Date().toISOString(),
        surveyType: "bigsky",
      },
    })
    .onConflictDoUpdate({
      target: preferences.participantId,
      set: {
        activityPreferences: activityPrefs,
        hardNos,
        additionalNotes: answers.openText || null,
        rawData: {
          ...answers,
          completedAt: new Date().toISOString(),
          surveyType: "bigsky",
        },
        updatedAt: new Date(),
      },
    });

  // Update participant status + name
  await database
    .update(participants)
    .set({
      status: "completed",
      name,
    })
    .where(eq(participants.id, participant.id));

  redirect(`/trips/${tripId}/intake/thanks`);
}
