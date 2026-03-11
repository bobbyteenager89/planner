import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userTrips = await db()
    .select()
    .from(trips)
    .where(eq(trips.ownerId, session.user.id))
    .orderBy(desc(trips.createdAt));

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
                  <Badge variant="secondary">{trip.status}</Badge>
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
