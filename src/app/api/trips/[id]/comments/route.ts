import { auth } from "@/lib/auth";
import { db } from "@/db";
import { participants, itineraries } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { text } = body as { text: string };

  if (!text?.trim()) {
    return new Response("Comment text required", { status: 400 });
  }

  const database = db();

  // Verify caller is a participant (participantId derived server-side)
  const [viewer] = await database
    .select()
    .from(participants)
    .where(and(eq(participants.tripId, id), eq(participants.userId, session.user.id)))
    .limit(1);

  if (!viewer) return new Response("Forbidden", { status: 403 });

  // Get latest itinerary
  const [latestItinerary] = await database
    .select()
    .from(itineraries)
    .where(eq(itineraries.tripId, id))
    .orderBy(desc(itineraries.version))
    .limit(1);

  if (!latestItinerary) {
    return new Response("No itinerary exists", { status: 400 });
  }

  // Atomic JSONB append — avoids read-modify-write race condition
  const newComment = [{ participantId: viewer.id, text: text.trim(), createdAt: new Date().toISOString() }];
  await database
    .update(itineraries)
    .set({
      comments: sql`COALESCE(${itineraries.comments}, '[]'::jsonb) || ${JSON.stringify(newComment)}::jsonb`,
    })
    .where(eq(itineraries.id, latestItinerary.id));

  return Response.json({ success: true });
}
