import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InviteForm } from "./invite-form";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const [trip] = await db().select().from(trips).where(eq(trips.id, id));
  if (!trip) notFound();
  if (trip.ownerId !== session.user.id) notFound();

  const tripParticipants = await db()
    .select()
    .from(participants)
    .where(eq(participants.tripId, id));

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

      {(trip.status === "draft" || trip.status === "onboarding") && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            {trip.status === "draft" ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Ready to start planning your trip?
                </p>
                <Link href={`/trips/${id}/onboard`}>
                  <Button>Start Planning</Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Onboarding in progress
                </p>
                <Link href={`/trips/${id}/onboard`}>
                  <Button>Continue Planning</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {trip.status === "intake" && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Waiting for participants to complete their intake.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Participants</h2>
          </CardHeader>
          <CardContent>
            {tripParticipants.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No participants yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {tripParticipants.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {p.name || p.email}
                      {p.role === "owner" && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {p.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <InviteForm tripId={id} />
      </div>
    </div>
  );
}
