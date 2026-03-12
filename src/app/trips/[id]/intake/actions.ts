"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { participants, preferences } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function saveIntakeAnswers(
  participantId: string,
  answers: Record<string, string>
) {
  // Bug #4 fix: auth + ownership check on server action
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const [participant] = await db()
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(
        eq(participants.id, participantId),
        eq(participants.userId, session.user.id)
      )
    );
  if (!participant) throw new Error("Forbidden");

  const rawData = {
    ...answers,
    completedAt: new Date().toISOString(),
  };

  const activityPreferences = answers.vibe ? [answers.vibe] : [];

  // neon-http driver doesn't support transactions — run sequentially.
  // Upsert preferences first, then update status.
  // If status update fails, re-running is safe (upsert is idempotent).
  await db()
    .insert(preferences)
    .values({
      participantId,
      rawData,
      activityPreferences,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: preferences.participantId,
      set: {
        rawData,
        activityPreferences,
        updatedAt: new Date(),
      },
    });

  await db()
    .update(participants)
    .set({ status: "completed" })
    .where(eq(participants.id, participantId));
}
