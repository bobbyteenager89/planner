import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, participants, preferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { aggregateBigSkyVotes } from "@/lib/bigsky-dashboard";
import { DashboardContent } from "./dashboard-content";

export default async function LeaderDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const database = db();

  const [trip] = await database
    .select()
    .from(trips)
    .where(eq(trips.id, id));

  if (!trip) notFound();
  if (trip.ownerId !== session.user.id) notFound();

  const allParticipants = await database
    .select()
    .from(participants)
    .where(eq(participants.tripId, id));

  const participantPrefs = await Promise.all(
    allParticipants.map(async (p) => {
      const [pref] = await database
        .select()
        .from(preferences)
        .where(eq(preferences.participantId, p.id))
        .limit(1);
      return {
        participantId: p.id,
        name: p.name || p.email,
        status: p.status,
        rawData: pref?.rawData ?? null,
        createdAt: p.createdAt.toISOString(),
        lastRemindedAt: p.lastRemindedAt?.toISOString() ?? null,
      };
    })
  );

  const prefsForAggregation = participantPrefs
    .filter((p) => p.rawData !== null)
    .map((p) => ({
      rawData: p.rawData,
      participantName: p.name,
    }));

  const votes = aggregateBigSkyVotes(prefsForAggregation);

  return (
    <DashboardContent
      tripId={id}
      tripDestination={trip.destination}
      tripStartDate={trip.startDate?.toISOString() ?? null}
      tripEndDate={trip.endDate?.toISOString() ?? null}
      tripStatus={trip.status}
      participants={participantPrefs.map((p) => ({
        id: p.participantId,
        name: p.name,
        status: p.status,
        createdAt: p.createdAt,
        lastRemindedAt: p.lastRemindedAt,
      }))}
      votes={votes}
    />
  );
}
