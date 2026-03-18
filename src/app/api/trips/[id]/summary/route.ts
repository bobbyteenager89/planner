import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, participants, preferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ai } from "@/lib/ai/client";
import { aggregateBigSkyVotes } from "@/lib/bigsky-dashboard";

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

  const [trip] = await database
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) return new Response("Trip not found", { status: 404 });
  if (trip.ownerId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const allParticipants = await database
    .select()
    .from(participants)
    .where(eq(participants.tripId, id));

  const prefsWithNames = await Promise.all(
    allParticipants.map(async (p) => {
      const [pref] = await database
        .select()
        .from(preferences)
        .where(eq(preferences.participantId, p.id))
        .limit(1);
      return {
        rawData: pref?.rawData ?? null,
        participantName: p.name || p.email,
      };
    })
  );

  const votes = aggregateBigSkyVotes(
    prefsWithNames.filter((p) => p.rawData !== null)
  );

  const voteSummary = [
    "## Activities (sorted by enthusiasm)",
    ...votes.activities.map(
      (a) => `- ${a.label}: ${a.yes} yes, ${a.fine} fine, ${a.pass} pass`
    ),
    "",
    "## Restaurants",
    ...votes.restaurants.map(
      (r) => `- ${r.label}: ${r.yes} yes, ${r.fine} fine, ${r.pass} pass`
    ),
    "",
    "## Private Chefs",
    ...votes.chefs.map(
      (c) => `- ${c.label}: ${c.yes} yes, ${c.fine} fine, ${c.pass} pass`
    ),
  ].join("\n");

  const openTextSection =
    votes.openTextEntries.length > 0
      ? [
          "",
          "## Open Suggestions",
          ...votes.openTextEntries.map(
            (e) => `- ${e.name}: "${e.text}"`
          ),
        ].join("\n")
      : "";

  const systemPrompt = `You are a trip planning assistant helping a trip leader understand their group's preferences. You have vote data from a survey where participants voted "yes" (excited), "fine" (would go along), or "pass" (not interested) on activities, restaurants, and private chef options.

Write a concise 3-4 paragraph summary that:
1. Highlights clear winners and consensus picks
2. Notes any divisive items or conflicts
3. Calls out any open suggestions worth considering
4. Gives a brief recommendation on what to prioritize

Be warm and conversational. This is a family trip to Big Sky, Montana. ${votes.completedCount} of ${votes.participantCount} people have responded so far.`;

  const userMessage = `Here are the survey results:\n\n${voteSummary}${openTextSection}`;

  const response = await ai().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    stream: true,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
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
