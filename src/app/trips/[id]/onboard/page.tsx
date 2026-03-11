import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { eq } from "drizzle-orm";
import { OnboardClient } from "./onboard-client";

export default async function OnboardPage({
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

  const existingConversation = (trip.onboardingConversation ?? []) as {
    role: "user" | "assistant";
    content: string;
  }[];

  return (
    <OnboardClient
      tripId={trip.id}
      tripTitle={trip.title}
      existingPath={trip.onboardingPath ?? null}
      existingConversation={existingConversation}
    />
  );
}
