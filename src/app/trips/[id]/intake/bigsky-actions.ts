"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { participants, preferences } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";

export interface BigSkyAnswers {
  name: string;
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
  participantId: string,
  answers: BigSkyAnswers
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const database = db();

  // Verify participant belongs to this user
  const [participant] = await database
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.id, participantId),
        eq(participants.userId, session.user.id)
      )
    )
    .limit(1);

  if (!participant) throw new Error("Not authorized");

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
      participantId,
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
      name: answers.name,
    })
    .where(eq(participants.id, participantId));

  redirect(`/trips/${participant.tripId}`);
}
