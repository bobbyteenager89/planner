import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  trips,
  participants,
  preferences,
  itineraries,
  itineraryBlocks,
  reactions as reactionsTable,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ai } from "@/lib/ai/client";
import { buildItineraryPrompt } from "@/lib/ai/itinerary-prompt";
import { sendItineraryReadyEmail } from "@/lib/email/itinerary-ready";


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const database = db();

  // Load trip
  const [trip] = await database
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) return new Response("Trip not found", { status: 404 });
  if (trip.ownerId !== session.user.id)
    return new Response("Forbidden", { status: 403 });

  // Guard: only generate from intake or reviewing status
  if (trip.status !== "intake" && trip.status !== "reviewing") {
    return new Response(`Cannot generate from status: ${trip.status}`, {
      status: 400,
    });
  }

  // Guard: at least one completed participant
  const allParticipants = await database
    .select()
    .from(participants)
    .where(eq(participants.tripId, id));

  const completedCount = allParticipants.filter(
    (p) => p.status === "completed"
  ).length;
  if (completedCount === 0) {
    return new Response("No participants have completed intake", {
      status: 400,
    });
  }

  // Set trip status to generating (prevents double-tap)
  const previousStatus = trip.status;
  await database
    .update(trips)
    .set({ status: "generating", updatedAt: new Date() })
    .where(eq(trips.id, id));

  // Load participant preferences
  const participantsWithPrefs = await Promise.all(
    allParticipants.map(async (p) => {
      const [pref] = await db()
        .select()
        .from(preferences)
        .where(eq(preferences.participantId, p.id))
        .limit(1);
      return { name: p.name, email: p.email, preferences: pref ?? null };
    })
  );

  // Load prior itinerary data for revisions
  let priorBlocks: (typeof itineraryBlocks.$inferSelect)[] = [];
  const priorReactions: Array<{
    blockId: string;
    love: number;
    fine: number;
    rather_not: number;
    hard_no: number;
    notes: Array<{ name: string; text: string }>;
  }> = [];
  let priorComments: Array<{
    participantId: string;
    text: string;
    createdAt: string;
  }> = [];
  let pinnedSlots: Array<{
    dayNumber: number;
    sortOrder: number;
    title: string;
  }> = [];
  let pinnedBlocksToMerge: (typeof itineraryBlocks.$inferSelect)[] = [];

  // Get latest itinerary version number
  const [latestItinerary] = await db()
    .select()
    .from(itineraries)
    .where(eq(itineraries.tripId, id))
    .orderBy(desc(itineraries.version))
    .limit(1);

  if (latestItinerary) {
    // Load prior blocks
    priorBlocks = await db()
      .select()
      .from(itineraryBlocks)
      .where(eq(itineraryBlocks.itineraryId, latestItinerary.id));

    // Separate pinned blocks for post-hoc merge
    pinnedBlocksToMerge = priorBlocks.filter((b) => b.pinned);
    pinnedSlots = pinnedBlocksToMerge.map((b) => ({
      dayNumber: b.dayNumber,
      sortOrder: b.sortOrder,
      title: b.title,
    }));

    // Load reactions with participant names
    for (const block of priorBlocks) {
      const blockReactions = await db()
        .select()
        .from(reactionsTable)
        .where(eq(reactionsTable.blockId, block.id));

      const summary = {
        blockId: block.id,
        love: 0,
        fine: 0,
        rather_not: 0,
        hard_no: 0,
        notes: [] as Array<{ name: string; text: string }>,
      };
      for (const r of blockReactions) {
        summary[r.reaction]++;
        if (r.note) {
          const participant = allParticipants.find(
            (p) => p.id === r.participantId
          );
          summary.notes.push({
            name: participant?.name || participant?.email || "Unknown",
            text: r.note,
          });
        }
      }
      priorReactions.push(summary);
    }

    // Load prior comments
    priorComments =
      (latestItinerary.comments as Array<{
        participantId: string;
        text: string;
        createdAt: string;
      }>) ?? [];
  }

  const newVersion = latestItinerary ? latestItinerary.version + 1 : 1;

  // Build prompt
  const systemPrompt = buildItineraryPrompt({
    trip,
    onboardingConversation: (trip.onboardingConversation ?? []) as Array<{
      role: string;
      content: string;
    }>,
    participantsWithPrefs,
    priorBlocks: priorBlocks.length > 0 ? priorBlocks : undefined,
    priorReactions: priorReactions.length > 0 ? priorReactions : undefined,
    priorComments: priorComments.length > 0 ? priorComments : undefined,
    pinnedSlots: pinnedSlots.length > 0 ? pinnedSlots : undefined,
  });

  // Stream from Claude
  const response = await ai().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    stream: true,
    system: systemPrompt,
    messages: [{ role: "user", content: "Generate the itinerary now." }],
  });

  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullResponse += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();

        // Parse NDJSON blocks
        const lines = fullResponse
          .trim()
          .split("\n")
          .filter((l) => l.trim());
        const parsedBlocks: Array<{
          dayNumber: number;
          sortOrder: number;
          type: string;
          title: string;
          description: string;
          startTime: string | null;
          endTime: string | null;
          location: string | null;
          estimatedCost: string | null;
          aiReasoning: string | null;
        }> = [];

        for (const line of lines) {
          try {
            parsedBlocks.push(JSON.parse(line));
          } catch {
            // Skip malformed lines
          }
        }

        // Persist: create itinerary + blocks
        const persistDb = db();

        const [newItinerary] = await persistDb
          .insert(itineraries)
          .values({
            tripId: id,
            version: newVersion,
            status: "skeleton",
          })
          .returning({ id: itineraries.id });

        // Insert generated blocks
        if (parsedBlocks.length > 0) {
          await persistDb.insert(itineraryBlocks).values(
            parsedBlocks.map((b) => ({
              itineraryId: newItinerary.id,
              dayNumber: b.dayNumber,
              sortOrder: b.sortOrder,
              type: b.type as
                | "activity"
                | "meal"
                | "transport"
                | "lodging"
                | "free_time"
                | "note",
              title: b.title,
              description: b.description,
              startTime: b.startTime,
              endTime: b.endTime,
              location: b.location,
              estimatedCost: b.estimatedCost,
              aiReasoning: b.aiReasoning,
              pinned: false,
            }))
          );
        }

        // Insert pinned blocks from prior version (post-hoc merge)
        if (pinnedBlocksToMerge.length > 0) {
          await persistDb.insert(itineraryBlocks).values(
            pinnedBlocksToMerge.map((b) => ({
              itineraryId: newItinerary.id,
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
              pinned: true,
              metadata: b.metadata,
            }))
          );
        }

        // Update trip status to reviewing
        await persistDb
          .update(trips)
          .set({ status: "reviewing", updatedAt: new Date() })
          .where(eq(trips.id, id));

        // Send notification emails (fire-and-forget)
        const participantEmails = allParticipants
          .filter((p) => p.role !== "owner" && p.email)
          .map((p) => ({ email: p.email, name: p.name }));

        sendItineraryReadyEmail({
          emails: participantEmails,
          tripTitle: trip.title,
          destination: trip.destination,
          tripId: id,
          version: newVersion,
        }).catch(() => {}); // fire-and-forget
      } catch (error) {
        // Rollback trip status on failure
        db()
          .update(trips)
          .set({ status: previousStatus, updatedAt: new Date() })
          .where(eq(trips.id, id))
          .then(() => {});
        controller.error(error);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
