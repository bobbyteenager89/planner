import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, participants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InviteForm } from "./invite-form";
import { TripContent } from "./trip-content";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const database = db();

  const [trip] = await database.select().from(trips).where(eq(trips.id, id));
  if (!trip) notFound();

  // Check if viewer is a participant (owner or invited)
  const [viewer] = await database
    .select()
    .from(participants)
    .where(and(eq(participants.tripId, id), eq(participants.userId, session.user.id)))
    .limit(1);

  if (!viewer) notFound();

  const isOwner = trip.ownerId === session.user.id;

  const tripParticipants = await database
    .select()
    .from(participants)
    .where(eq(participants.tripId, id));

  const completedCount = tripParticipants.filter(p => p.status === "completed").length;

  // Calculate trip duration for streaming view
  let tripDays = 3;
  if (trip.startDate && trip.endDate) {
    tripDays = Math.max(1, Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{trip.title}</h1>
          <Badge variant="secondary">{trip.status}</Badge>
        </div>
        {trip.destination && (
          <p className="mt-1 text-muted-foreground">{trip.destination}</p>
        )}
        {(trip.startDate || trip.endDate) && (
          <p className="text-sm text-muted-foreground">
            {trip.startDate && new Date(trip.startDate).toLocaleDateString()}
            {trip.startDate && trip.endDate && " — "}
            {trip.endDate && new Date(trip.endDate).toLocaleDateString()}
          </p>
        )}
      </div>

      <TripContent
        tripId={id}
        tripStatus={trip.status}
        isOwner={isOwner}
        completedCount={completedCount}
        tripDays={tripDays}
        viewerStatus={viewer.status}
      />

      {/* Participants + Invite (always visible for owner) */}
      {isOwner && (
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Participants</h2>
            </CardHeader>
            <CardContent>
              {tripParticipants.length === 0 ? (
                <p className="text-sm text-muted-foreground">No participants yet.</p>
              ) : (
                <ul className="space-y-2">
                  {tripParticipants.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span>
                        {p.name || p.email}
                        {p.role === "owner" && (
                          <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                        )}
                      </span>
                      <Badge variant="outline" className="text-xs">{p.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <InviteForm tripId={id} />
        </div>
      )}
    </div>
  );
}
