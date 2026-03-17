import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  participants,
  itineraries,
  itineraryBlocks,
  reactions,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const database = db();

  // Verify caller is a participant
  const [viewer] = await database
    .select()
    .from(participants)
    .where(and(eq(participants.tripId, id), eq(participants.userId, session.user.id)))
    .limit(1);

  if (!viewer) return new Response("Forbidden", { status: 403 });

  // Get requested version or latest
  const url = new URL(request.url);
  const requestedVersion = url.searchParams.get("version");

  let itinerary;
  if (requestedVersion) {
    [itinerary] = await database
      .select()
      .from(itineraries)
      .where(and(eq(itineraries.tripId, id), eq(itineraries.version, parseInt(requestedVersion))))
      .limit(1);
  } else {
    [itinerary] = await database
      .select()
      .from(itineraries)
      .where(eq(itineraries.tripId, id))
      .orderBy(desc(itineraries.version))
      .limit(1);
  }

  if (!itinerary) {
    return Response.json({
      itinerary: null,
      blocks: [],
      versions: [],
      viewer: { participantId: viewer.id, role: viewer.role },
    });
  }

  // Load blocks sorted by day + order
  const blocks = await database
    .select()
    .from(itineraryBlocks)
    .where(eq(itineraryBlocks.itineraryId, itinerary.id));

  const sortedBlocks = blocks.sort(
    (a, b) => a.dayNumber - b.dayNumber || a.sortOrder - b.sortOrder
  );

  // Load all participants for name lookup
  const allParticipants = await database
    .select({ id: participants.id, name: participants.name, email: participants.email })
    .from(participants)
    .where(eq(participants.tripId, id));

  const nameMap = new Map(allParticipants.map((p) => [p.id, p.name || p.email]));

  // Load reactions per block (neon-http driver; loop instead of inArray)
  const blocksWithReactions = await Promise.all(
    sortedBlocks.map(async (block) => {
      const blockReactions = await database
        .select()
        .from(reactions)
        .where(eq(reactions.blockId, block.id));

      const reactionSummary = { love: 0, fine: 0, rather_not: 0, hard_no: 0 };
      const reactionList = blockReactions.map((r) => {
        reactionSummary[r.reaction]++;
        return {
          participantId: r.participantId,
          name: nameMap.get(r.participantId) || "Unknown",
          reaction: r.reaction,
          note: r.note,
        };
      });

      return {
        ...block,
        reactions: reactionList,
        reactionSummary,
      };
    })
  );

  // Load all versions for version switcher
  const allVersions = await database
    .select({ version: itineraries.version, createdAt: itineraries.createdAt })
    .from(itineraries)
    .where(eq(itineraries.tripId, id))
    .orderBy(itineraries.version);

  // Parse comments with names
  const rawComments =
    (itinerary.comments as Array<{ participantId: string; text: string; createdAt: string }>) ?? [];
  const commentsWithNames = rawComments.map((c) => ({
    ...c,
    name: nameMap.get(c.participantId) || "Unknown",
  }));

  return Response.json({
    itinerary: {
      id: itinerary.id,
      version: itinerary.version,
      status: itinerary.status,
      comments: commentsWithNames,
      createdAt: itinerary.createdAt,
    },
    blocks: blocksWithReactions,
    versions: allVersions,
    viewer: { participantId: viewer.id, role: viewer.role },
  });
}
