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

  if (!trip) return new Response("Trip not found", { status: 404 });

  // Only allow sharing if trip has an itinerary
  if (trip.status !== "reviewing" && trip.status !== "finalized") {
    return Response.json({ trip, itinerary: null, blocks: [], participants: [] });
  }

  // Get latest itinerary
  const [itinerary] = await database
    .select()
    .from(itineraries)
    .where(eq(itineraries.tripId, id))
    .orderBy(desc(itineraries.version))
    .limit(1);

  if (!itinerary) {
    return Response.json({ trip, itinerary: null, blocks: [], participants: [] });
  }

  // Load blocks
  const blocks = await database
    .select()
    .from(itineraryBlocks)
    .where(eq(itineraryBlocks.itineraryId, itinerary.id));

  const sortedBlocks = blocks.sort(
    (a, b) => a.dayNumber - b.dayNumber || a.sortOrder - b.sortOrder
  );

  // Load participant names (first names only for privacy)
  const allParticipants = await database
    .select({ name: participants.name, role: participants.role })
    .from(participants)
    .where(eq(participants.tripId, id));

  return Response.json({
    trip,
    itinerary: {
      id: itinerary.id,
      version: itinerary.version,
      status: itinerary.status,
      createdAt: itinerary.createdAt,
    },
    blocks: sortedBlocks.map((b) => ({
      id: b.id,
      dayNumber: b.dayNumber,
      sortOrder: b.sortOrder,
      type: b.type,
      title: b.title,
      description: b.description,
      startTime: b.startTime,
      endTime: b.endTime,
      location: b.location,
      estimatedCost: b.estimatedCost,
      aiReasoning: b.aiReasoning,
    })),
    participants: allParticipants.map((p) => ({
      name: p.name,
      role: p.role,
    })),
  });
}
