import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, itineraries, itineraryBlocks } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, blockId } = await params;
  const database = db();

  // Verify trip ownership
  const [trip] = await database
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) return Response.json({ error: "Not found" }, { status: 404 });
  if (trip.ownerId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get latest itinerary version
  const [latestItinerary] = await database
    .select()
    .from(itineraries)
    .where(eq(itineraries.tripId, id))
    .orderBy(desc(itineraries.version))
    .limit(1);

  if (!latestItinerary) {
    return Response.json({ error: "No itinerary found" }, { status: 404 });
  }

  // Verify block belongs to latest itinerary
  const [block] = await database
    .select()
    .from(itineraryBlocks)
    .where(
      and(
        eq(itineraryBlocks.id, blockId),
        eq(itineraryBlocks.itineraryId, latestItinerary.id)
      )
    )
    .limit(1);

  if (!block) {
    return Response.json({ error: "Block not found" }, { status: 404 });
  }

  // Toggle pinned state
  const newPinned = !block.pinned;

  await database
    .update(itineraryBlocks)
    .set({ pinned: newPinned })
    .where(eq(itineraryBlocks.id, blockId));

  return Response.json({ pinned: newPinned });
}
