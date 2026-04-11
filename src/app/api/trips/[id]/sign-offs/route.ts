import { db } from "@/db";
import { signOffs } from "@/db/schema-feedback";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;

  const results = await db()
    .select({
      id: signOffs.id,
      participantId: signOffs.participantId,
      participantName: participants.name,
      status: signOffs.status,
      createdAt: signOffs.createdAt,
    })
    .from(signOffs)
    .leftJoin(participants, eq(signOffs.participantId, participants.id))
    .where(eq(signOffs.tripId, tripId))
    .orderBy(signOffs.createdAt);

  return Response.json(results);
}
