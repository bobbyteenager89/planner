import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { participants, trips } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { IntakeQuestionnaire } from "./intake-questionnaire";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  // Bug #10 fix: parallelize DB queries + scope columns
  const [participantResult, tripResult] = await Promise.all([
    db()
      .select({
        id: participants.id,
        status: participants.status,
      })
      .from(participants)
      .where(
        and(
          eq(participants.tripId, id),
          eq(participants.userId, session.user.id)
        )
      ),
    db()
      .select({ title: trips.title })
      .from(trips)
      .where(eq(trips.id, id)),
  ]);

  const participant = participantResult[0];
  const trip = tripResult[0];

  if (!participant) notFound();
  if (!trip) notFound();

  if (participant.status === "completed") {
    redirect(`/trips/${id}`);
  }

  return (
    <IntakeQuestionnaire
      participantId={participant.id}
      tripTitle={trip.title}
      tripId={id}
    />
  );
}
