import { ShareItinerary } from "./share-content";

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShareItinerary tripId={id} />;
}
