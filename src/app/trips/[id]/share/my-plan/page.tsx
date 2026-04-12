import { notFound } from "next/navigation";
import { MyPlanView } from "./my-plan-view";
import type { Metadata } from "next";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getTrip(id: string) {
  const [trip] = await db()
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);
  return trip ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) return { title: "Trip not found" };

  return {
    title: `My Plan — ${trip.title}`,
    description: `Your personalized schedule for ${trip.title}`,
  };
}

export default async function MyPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) notFound();
  return <MyPlanView tripId={id} />;
}
