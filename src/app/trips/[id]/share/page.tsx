import { GuestItinerary } from "./guest-itinerary";

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GuestItinerary tripId={id} />;
}
