import { db } from "@/db";
import {
  trips,
  participants,
  itineraries,
  itineraryBlocks,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const database = db();

  // Load trip (public fields only)
  const [trip] = await database
    .select({
      id: trips.id,
      title: trips.title,
      destination: trips.destination,
      startDate: trips.startDate,
      endDate: trips.endDate,
      status: trips.status,
    })
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) {
    return Response.json({ error: "Trip not found" }, { status: 404 });
  }

  // Only allow sharing if trip has an itinerary
  if (trip.status !== "reviewing" && trip.status !== "finalized") {
    return Response.json({ trip, itinerary: null, blocks: [], participants: [] });
  }

  // Get latest itinerary
  const [itinerary] = await database
    .select({
      id: itineraries.id,
      version: itineraries.version,
      status: itineraries.status,
      createdAt: itineraries.createdAt,
    })
    .from(itineraries)
    .where(eq(itineraries.tripId, id))
    .orderBy(desc(itineraries.version))
    .limit(1);

  if (!itinerary) {
    return Response.json({ trip, itinerary: null, blocks: [], participants: [] });
  }

  // Load blocks + participants in parallel (independent queries)
  const [blocks, allParticipants] = await Promise.all([
    database
      .select({
        id: itineraryBlocks.id,
        dayNumber: itineraryBlocks.dayNumber,
        sortOrder: itineraryBlocks.sortOrder,
        type: itineraryBlocks.type,
        title: itineraryBlocks.title,
        description: itineraryBlocks.description,
        startTime: itineraryBlocks.startTime,
        endTime: itineraryBlocks.endTime,
        location: itineraryBlocks.location,
        estimatedCost: itineraryBlocks.estimatedCost,
        imageUrl: itineraryBlocks.imageUrl,
        aiReasoning: itineraryBlocks.aiReasoning,
      })
      .from(itineraryBlocks)
      .where(eq(itineraryBlocks.itineraryId, itinerary.id)),
    database
      .select({ name: participants.name, role: participants.role })
      .from(participants)
      .where(eq(participants.tripId, id)),
  ]);

  const sortedBlocks = [...blocks].sort(
    (a, b) => a.dayNumber - b.dayNumber || a.sortOrder - b.sortOrder
  );

  return Response.json(
    {
      trip,
      itinerary: {
        id: itinerary.id,
        version: itinerary.version,
        status: itinerary.status,
        createdAt: itinerary.createdAt,
      },
      blocks: sortedBlocks,
      participants: allParticipants.map((p) => ({
        name: p.name,
        role: p.role,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
