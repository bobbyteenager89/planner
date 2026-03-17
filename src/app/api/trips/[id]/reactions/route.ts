import { auth } from "@/lib/auth";
import { db } from "@/db";
import { participants, reactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { blockId, reaction, note } = body as {
    blockId: string;
    reaction: "love" | "fine" | "rather_not" | "hard_no";
    note?: string;
  };

  if (!blockId || !reaction) {
    return new Response("blockId and reaction required", { status: 400 });
  }

  const validReactions = ["love", "fine", "rather_not", "hard_no"];
  if (!validReactions.includes(reaction)) {
    return new Response("Invalid reaction type", { status: 400 });
  }

  const database = db();

  // Verify caller is a participant of this trip (participantId derived server-side)
  const [viewer] = await database
    .select()
    .from(participants)
    .where(and(eq(participants.tripId, id), eq(participants.userId, session.user.id)))
    .limit(1);

  if (!viewer) return new Response("Forbidden", { status: 403 });

  // Upsert reaction — one reaction per (blockId, participantId)
  await database
    .insert(reactions)
    .values({
      blockId,
      participantId: viewer.id,
      reaction,
      note: note || null,
    })
    .onConflictDoUpdate({
      target: [reactions.blockId, reactions.participantId],
      set: {
        reaction,
        note: note || null,
        createdAt: new Date(),
      },
    });

  return Response.json({ success: true });
}
