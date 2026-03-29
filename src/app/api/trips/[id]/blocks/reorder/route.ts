import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, itineraries, itineraryBlocks } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
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

  const body = await request.json();
  const { blockIds } = body as { blockIds: string[] };

  if (!Array.isArray(blockIds) || blockIds.length === 0) {
    return Response.json({ error: "blockIds array required" }, { status: 400 });
  }

  // Verify all blocks belong to latest itinerary (sequential — no transactions)
  for (const blockId of blockIds) {
    const [block] = await database
      .select({ id: itineraryBlocks.id })
      .from(itineraryBlocks)
      .where(
        and(
          eq(itineraryBlocks.id, blockId),
          eq(itineraryBlocks.itineraryId, latestItinerary.id)
        )
      )
      .limit(1);

    if (!block) {
      return Response.json(
        { error: `Block ${blockId} not found in latest itinerary` },
        { status: 400 }
      );
    }
  }

  // Update sortOrder sequentially (neon-http has no transaction support)
  for (let i = 0; i < blockIds.length; i++) {
    await database
      .update(itineraryBlocks)
      .set({ sortOrder: i + 1 })
      .where(eq(itineraryBlocks.id, blockIds[i]));
  }

  return Response.json({ success: true, count: blockIds.length });
}
