import { db } from "@/db";
import { blockRsvps } from "@/db/schema-feedback";
import { participants } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;

  const rows = await db()
    .select({
      id: blockRsvps.id,
      blockId: blockRsvps.blockId,
      participantId: blockRsvps.participantId,
      participantName: participants.name,
      status: blockRsvps.status,
      updatedAt: blockRsvps.updatedAt,
    })
    .from(blockRsvps)
    .leftJoin(participants, eq(blockRsvps.participantId, participants.id))
    .where(eq(blockRsvps.tripId, tripId))
    .orderBy(blockRsvps.updatedAt);

  return Response.json(rows);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const body = await request.json();
  const { blockId, participantId, status } = body;

  if (!blockId || !participantId || !status) {
    return Response.json(
      { error: "blockId, participantId, and status are required" },
      { status: 400 }
    );
  }

  if (!["yes", "maybe", "no"].includes(status)) {
    return Response.json(
      { error: "status must be one of: yes, maybe, no" },
      { status: 400 }
    );
  }

  const [participant] = await db()
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(eq(participants.id, participantId), eq(participants.tripId, tripId))
    );

  if (!participant) {
    return Response.json({ error: "Invalid participant" }, { status: 403 });
  }

  // Upsert via ON CONFLICT (block_id, participant_id)
  const [row] = await db()
    .insert(blockRsvps)
    .values({ tripId, blockId, participantId, status })
    .onConflictDoUpdate({
      target: [blockRsvps.blockId, blockRsvps.participantId],
      set: { status, updatedAt: sql`now()` },
    })
    .returning();

  return Response.json(row, { status: 200 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const url = new URL(request.url);
  const blockId = url.searchParams.get("blockId");
  const participantId = url.searchParams.get("participantId");

  if (!blockId || !participantId) {
    return Response.json(
      { error: "blockId and participantId query params required" },
      { status: 400 }
    );
  }

  await db()
    .delete(blockRsvps)
    .where(
      and(
        eq(blockRsvps.tripId, tripId),
        eq(blockRsvps.blockId, blockId),
        eq(blockRsvps.participantId, participantId)
      )
    );

  return Response.json({ ok: true });
}
