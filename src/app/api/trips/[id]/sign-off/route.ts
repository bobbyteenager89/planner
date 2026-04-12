import { db } from "@/db";
import { signOffs } from "@/db/schema-feedback";
import { participants } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const { participantId, status } = await request.json();

  if (!participantId || !status) {
    return Response.json(
      { error: "participantId and status required" },
      { status: 400 }
    );
  }

  // Verify participant belongs to this trip
  const [participant] = await db()
    .select({ id: participants.id })
    .from(participants)
    .where(and(eq(participants.id, participantId), eq(participants.tripId, tripId)));

  if (!participant) {
    return Response.json({ error: "Invalid participant" }, { status: 403 });
  }

  // Upsert — delete existing then insert
  await db()
    .delete(signOffs)
    .where(
      and(eq(signOffs.tripId, tripId), eq(signOffs.participantId, participantId))
    );

  const [signOff] = await db()
    .insert(signOffs)
    .values({ tripId, participantId, status })
    .returning();

  return Response.json(signOff, { status: 201 });
}
