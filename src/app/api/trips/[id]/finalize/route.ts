import { db } from "@/db";
import { itineraries, trips } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;

  const [itinerary] = await db()
    .select()
    .from(itineraries)
    .where(eq(itineraries.tripId, tripId))
    .orderBy(desc(itineraries.version))
    .limit(1);

  if (!itinerary) {
    return Response.json({ error: "No itinerary found" }, { status: 404 });
  }

  await db()
    .update(itineraries)
    .set({ status: "finalized" })
    .where(eq(itineraries.id, itinerary.id));

  await db()
    .update(trips)
    .set({ status: "finalized" })
    .where(eq(trips.id, tripId));

  return Response.json({ success: true, itineraryId: itinerary.id });
}
