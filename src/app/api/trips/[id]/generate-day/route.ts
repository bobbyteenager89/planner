import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  trips,
  participants,
  preferences,
  itineraries,
  itineraryBlocks,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ai } from "@/lib/ai/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { dayNumber } = body as { dayNumber: number };

  if (typeof dayNumber !== "number" || dayNumber < 1) {
    return new Response("Invalid dayNumber", { status: 400 });
  }

  const database = db();

  // Load trip + verify ownership
  const [trip] = await database
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) return new Response("Trip not found", { status: 404 });
  if (trip.ownerId !== session.user.id)
    return new Response("Forbidden", { status: 403 });

  // Get latest itinerary
  const [latestItinerary] = await db()
    .select()
    .from(itineraries)
    .where(eq(itineraries.tripId, id))
    .orderBy(desc(itineraries.version))
    .limit(1);

  if (!latestItinerary) {
    return new Response("No itinerary found — generate the full trip first", {
      status: 400,
    });
  }

  // Load all blocks for this itinerary
  const allBlocks = await db()
    .select()
    .from(itineraryBlocks)
    .where(eq(itineraryBlocks.itineraryId, latestItinerary.id));

  // Split this day's blocks into pinned (keep) and unpinned (replace)
  const thisDayBlocks = allBlocks.filter((b) => b.dayNumber === dayNumber);
  const pinnedBlocks = thisDayBlocks.filter((b) => b.pinned);
  const unpinnedBlocks = thisDayBlocks.filter((b) => !b.pinned);
  const unpinnedIds = unpinnedBlocks.map((b) => b.id);

  // Other days' blocks for context
  const otherDayBlocks = allBlocks.filter((b) => b.dayNumber !== dayNumber);

  // Load participant preferences
  const allParticipants = await db()
    .select()
    .from(participants)
    .where(eq(participants.tripId, id));

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

  // Compute the date for this day
  const tripStart = trip.startDate ? new Date(trip.startDate) : null;
  let dayDateStr = "";
  if (tripStart) {
    const dayDate = new Date(tripStart);
    dayDate.setDate(dayDate.getDate() + (dayNumber - 1));
    dayDateStr = dayDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  // Build participant preferences summary
  const prefSummary = participantsWithPrefs
    .map((p) => {
      const name = p.name || p.email;
      const pref = p.preferences;
      if (!pref) return `- ${name}: no preferences recorded`;
      const parts: string[] = [];
      if (pref.activityPreferences?.length)
        parts.push(`likes: ${pref.activityPreferences.join(", ")}`);
      if (pref.hardNos?.length)
        parts.push(`hard nos: ${pref.hardNos.join(", ")}`);
      if (pref.mustHaves?.length)
        parts.push(`must haves: ${pref.mustHaves.join(", ")}`);
      if (pref.dietaryRestrictions?.length)
        parts.push(`dietary: ${pref.dietaryRestrictions.join(", ")}`);
      if (pref.pacePreference)
        parts.push(`pace: ${pref.pacePreference}`);
      if (pref.budgetMin || pref.budgetMax)
        parts.push(`budget: $${pref.budgetMin ?? "?"}-$${pref.budgetMax ?? "?"}/day`);
      return `- ${name}: ${parts.join("; ") || "no specific preferences"}`;
    })
    .join("\n");

  // Build other days summary (grouped by day)
  const otherDayNumbers = [...new Set(otherDayBlocks.map((b) => b.dayNumber))].sort(
    (a, b) => a - b
  );
  const otherDaysSummary = otherDayNumbers
    .map((dn) => {
      const blocks = otherDayBlocks
        .filter((b) => b.dayNumber === dn)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const titles = blocks.map((b) => b.title).join(", ");
      return `  Day ${dn}: ${titles}`;
    })
    .join("\n");

  // Build pinned blocks context
  const pinnedContext =
    pinnedBlocks.length > 0
      ? `\nPinned blocks for Day ${dayNumber} (keep these, work around them):\n${pinnedBlocks
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(
            (b) =>
              `  - [sortOrder ${b.sortOrder}] ${b.title}${b.startTime ? ` at ${b.startTime}` : ""}${b.location ? ` @ ${b.location}` : ""}`
          )
          .join("\n")}`
      : "";

  const blockSchema = `{"sortOrder": N, "type": "activity|meal|transport|lodging|free_time|note", "title": "...", "description": "...", "startTime": "HH:MM or null", "endTime": "HH:MM or null", "location": "string or null", "estimatedCost": number or null, "aiReasoning": "..."}`;

  const systemPrompt = `You are regenerating ONLY Day ${dayNumber}${dayDateStr ? ` (${dayDateStr})` : ""} of a ${trip.title} trip to ${trip.destination}.

Group: ${allParticipants.length} people
${prefSummary}

Other days (for context — do NOT duplicate activities or meals from these days):
${otherDaysSummary || "  (no other days yet)"}
${pinnedContext}

Generate 4-7 blocks as NDJSON. Each line must be exactly this format:
${blockSchema}

Rules:
- sortOrder starts at 1 and increments per block
- Output ONLY valid JSON lines — no markdown, no commentary, no blank lines
- Do NOT include dayNumber in the JSON (it is fixed as Day ${dayNumber})
- Cover a full day: morning activity, meals, afternoon/evening — vary from other days
- Be specific to ${trip.destination} — real places, accurate timing`;

  // Stream from Claude
  const response = await ai().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    stream: true,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Generate Day ${dayNumber} blocks now.`,
      },
    ],
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
          sortOrder: number;
          type: string;
          title: string;
          description: string;
          startTime: string | null;
          endTime: string | null;
          location: string | null;
          estimatedCost: number | null;
          aiReasoning: string;
        }> = [];

        for (const line of lines) {
          try {
            parsedBlocks.push(JSON.parse(line));
          } catch {
            // Skip malformed lines
          }
        }

        // Delete unpinned blocks for this day one at a time (no transactions)
        for (const blockId of unpinnedIds) {
          await db()
            .delete(itineraryBlocks)
            .where(eq(itineraryBlocks.id, blockId));
        }

        // Insert new generated blocks with the known dayNumber
        if (parsedBlocks.length > 0) {
          await db()
            .insert(itineraryBlocks)
            .values(
              parsedBlocks.map((b) => ({
                itineraryId: latestItinerary.id,
                dayNumber,
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
                estimatedCost: b.estimatedCost != null ? String(b.estimatedCost) : null,
                aiReasoning: b.aiReasoning,
                pinned: false,
              }))
            );
        }
      } catch (error) {
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
