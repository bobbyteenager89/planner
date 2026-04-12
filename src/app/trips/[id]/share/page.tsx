import { notFound } from "next/navigation";
import { GuestItinerary } from "./guest-itinerary";
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

  const ogUrl = `https://planner-sooty-theta.vercel.app/api/trips/${id}/og`;

  if (!trip) {
    return { title: "Trip not found" };
  }

  const dateRange =
    trip.startDate && trip.endDate
      ? `${new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : null;

  const title = trip.destination
    ? `${trip.destination} — ${trip.title}`
    : trip.title;
  const description = dateRange
    ? `${dateRange}${trip.destination ? ` · ${trip.destination}` : ""}. Your trip is planned.`
    : `${trip.title}. Your trip is planned.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      images: [ogUrl],
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) notFound();
  return <GuestItinerary tripId={id} />;
}
