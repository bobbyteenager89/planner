import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { participants, trips } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AcceptInvite } from "./accept-invite";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [participant] = await db()
    .select()
    .from(participants)
    .where(eq(participants.inviteToken, token));

  if (!participant) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              This invite link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [trip] = await db()
    .select()
    .from(trips)
    .where(eq(trips.id, participant.tripId));

  const session = await auth();

  // If already logged in, link and redirect
  if (session?.user?.id) {
    if (!participant.userId) {
      await db()
        .update(participants)
        .set({ userId: session.user.id, inviteToken: null })
        .where(eq(participants.id, participant.id));
    }
    redirect(`/trips/${participant.tripId}/intake`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            You&apos;re invited!
          </h1>
          {trip && (
            <p className="text-muted-foreground">
              Join the planning for <strong>{trip.title}</strong>
              {trip.destination && ` in ${trip.destination}`}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <AcceptInvite
            token={token}
            email={participant.email}
          />
        </CardContent>
      </Card>
    </div>
  );
}
