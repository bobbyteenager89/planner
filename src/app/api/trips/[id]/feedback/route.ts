import { db } from "@/db";
import { feedbackItems } from "@/db/schema-feedback";
import { participants } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;

  const items = await db()
    .select({
      id: feedbackItems.id,
      blockId: feedbackItems.blockId,
      participantId: feedbackItems.participantId,
      participantName: participants.name,
      type: feedbackItems.type,
      text: feedbackItems.text,
      status: feedbackItems.status,
      adminNote: feedbackItems.adminNote,
      createdAt: feedbackItems.createdAt,
    })
    .from(feedbackItems)
    .leftJoin(participants, eq(feedbackItems.participantId, participants.id))
    .where(eq(feedbackItems.tripId, tripId))
    .orderBy(feedbackItems.createdAt);

  return Response.json(items);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const body = await request.json();
  const { blockId, participantId, type, text } = body;

  if (!blockId || !participantId || !type) {
    return Response.json({ error: "blockId, participantId, and type are required" }, { status: 400 });
  }

  // Verify participant belongs to this trip
  const [participant] = await db()
    .select({ id: participants.id })
    .from(participants)
    .where(and(eq(participants.id, participantId), eq(participants.tripId, tripId)));

  if (!participant) {
    return Response.json({ error: "Invalid participant" }, { status: 403 });
  }

  const [item] = await db()
    .insert(feedbackItems)
    .values({ tripId, blockId, participantId, type, text: text || null })
    .returning();

  return Response.json(item, { status: 201 });
}
