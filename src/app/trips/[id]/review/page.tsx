import { ReviewItinerary } from "./review-content";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReviewItinerary tripId={id} />;
}
