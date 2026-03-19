import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, participants, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendSurveyReminder } from "@/lib/email/survey-reminder";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const database = db();

  const [trip] = await database
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) return new Response("Trip not found", { status: 404 });
  if (trip.ownerId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await request.json();
  const { participantId } = body as { participantId: string };

  if (!participantId) {
    return new Response("participantId is required", { status: 400 });
  }

  const [participant] = await database
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.id, participantId),
        eq(participants.tripId, id)
      )
    )
    .limit(1);

  if (!participant) {
    return new Response("Participant not found", { status: 404 });
  }

  if (participant.lastRemindedAt) {
    const hoursSince =
      (Date.now() - participant.lastRemindedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      return new Response("Reminder already sent recently", { status: 429 });
    }
  }

  const [owner] = await database
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  await sendSurveyReminder({
    email: participant.email,
    name: participant.name,
    ownerName: owner?.name ?? null,
    tripTitle: trip.title,
    destination: trip.destination,
    tripId: id,
  });

  await database
    .update(participants)
    .set({ lastRemindedAt: new Date() })
    .where(eq(participants.id, participantId));

  return new Response("OK", { status: 200 });
}
