import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, participants, preferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ai } from "@/lib/ai/client";
import { aggregateBigSkyVotes } from "@/lib/bigsky-dashboard";

export interface ItemInsight {
  itemId: string;
  insight: string;
  signal: "consensus" | "split" | "low_interest" | "conflict";
}

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

  if (votes.completedCount === 0) {
    return Response.json([]);
  }

  const formatItems = (items: typeof votes.activities) =>
    items
      .map(
        (item) =>
          `- id: "${item.id}", label: "${item.label}": ${item.yes} yes, ${item.fine} fine, ${item.pass} pass (${item.total} voters)`
      )
      .join("\n");

  const prompt = `You are analyzing survey results for a family trip to Big Sky, Montana. ${votes.completedCount} people have responded.

Here are the vote results:

Activities:
${formatItems(votes.activities)}

Restaurants:
${formatItems(votes.restaurants)}

Private Chefs:
${formatItems(votes.chefs)}

For EACH item above, return a JSON array entry with:
- "itemId": the exact id value shown above
- "insight": a brief one-liner (max 15 words) about what the votes mean for trip planning
- "signal": one of "consensus" (strong agreement), "split" (polarized), "low_interest" (mostly pass/fine), "conflict" (yes vs pass tension)

Return ONLY a valid JSON array, no markdown, no explanation. Example format:
[{"itemId":"fly-fishing","insight":"Strong consensus — book early","signal":"consensus"}]`;

  const response = await ai().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "[]";

  let insights: ItemInsight[] = [];
  try {
    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed)) {
      insights = parsed.map((item: Record<string, unknown>) => ({
        itemId: String(item.itemId || ""),
        insight: String(item.insight || ""),
        signal: ["consensus", "split", "low_interest", "conflict"].includes(
          String(item.signal)
        )
          ? (String(item.signal) as ItemInsight["signal"])
          : "split",
      }));
    }
  } catch {
    insights = [];
  }

  return Response.json(insights);
}
