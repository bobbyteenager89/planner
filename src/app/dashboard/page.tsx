import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, participants } from "@/db/schema";
import { eq, desc, inArray, or } from "drizzle-orm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Trips the user owns
  const ownedTrips = await db()
    .select()
    .from(trips)
    .where(eq(trips.ownerId, session.user.id))
    .orderBy(desc(trips.createdAt));

  // Trips the user is a participant on (by userId or email)
  const participantRows = await db()
    .select({ tripId: participants.tripId })
    .from(participants)
    .where(
      or(
        eq(participants.userId, session.user.id),
        eq(participants.email, session.user.email!)
      )
    );

  const participantTripIds = participantRows
    .map((r) => r.tripId)
    .filter((tid) => !ownedTrips.some((t) => t.id === tid));

  const participantTrips =
    participantTripIds.length > 0
      ? await db()
          .select()
          .from(trips)
          .where(inArray(trips.id, participantTripIds))
          .orderBy(desc(trips.createdAt))
      : [];

  // Build a set of owned trip IDs for role indicator
  const ownedTripIds = new Set(ownedTrips.map((t) => t.id));

  // Merge and deduplicate by trip ID (owned trips first)
  const seen = new Set<string>();
  const userTrips = [...ownedTrips, ...participantTrips].filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Trips</h1>
          <p className="text-muted-foreground">
            Plan group trips that make everyone happy.
          </p>
        </div>
        <Link href="/trips/new">
          <Button>New Trip</Button>
        </Link>
      </div>

      {userTrips.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-muted-foreground">
              No trips yet. Create your first one!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {userTrips.map((trip) => (
            <Link key={trip.id} href={`/trips/${trip.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{trip.title}</h2>
                    {trip.destination && (
                      <p className="text-sm text-muted-foreground">
                        {trip.destination}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ownedTripIds.has(trip.id) ? "default" : "outline"}>
                      {ownedTripIds.has(trip.id) ? "Owner" : "Invited"}
                    </Badge>
                    <Badge variant="secondary">{trip.status}</Badge>
                  </div>
                </CardHeader>
                {(trip.startDate || trip.endDate) && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      {trip.startDate &&
                        new Date(trip.startDate).toLocaleDateString()}
                      {trip.startDate && trip.endDate && " — "}
                      {trip.endDate &&
                        new Date(trip.endDate).toLocaleDateString()}
                    </p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
