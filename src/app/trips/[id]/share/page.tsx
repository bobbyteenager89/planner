import { GuestItinerary } from "./guest-itinerary";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ogUrl = `https://planner-sooty-theta.vercel.app/api/trips/${id}/og`;

  return {
    title: "Big Sky — Goble Family Trip",
    description: "July 18–25, 2026 · 8 days in Big Sky, Montana. Your trip is planned.",
    openGraph: {
      title: "Big Sky — Goble Family Trip",
      description: "July 18–25, 2026 · 8 days in Big Sky, Montana",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Big Sky — Goble Family Trip",
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
  return <GuestItinerary tripId={id} />;
}
