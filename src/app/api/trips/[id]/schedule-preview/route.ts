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

  if (!trip.startDate || !trip.endDate) {
    return new Response(
      "Trip dates must be set before generating a schedule preview",
      { status: 400 }
    );
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
    return new Response("No completed responses yet", { status: 400 });
  }

  const numDays = Math.max(
    1,
    Math.ceil(
      (trip.endDate.getTime() - trip.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );

  const startDateStr = trip.startDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formatItems = (items: typeof votes.activities) =>
    items
      .map(
        (item) =>
          `- ${item.label}: ${item.yes} yes, ${item.fine} fine, ${item.pass} pass${item.conflicted ? " [CONFLICTED]" : ""}`
      )
      .join("\n");

  const prompt = `You are a trip planning assistant. Create a rough day-by-day schedule for a ${numDays}-day family trip to Big Sky, Montana starting ${startDateStr}.

Here are the group's vote results (sorted by enthusiasm):

Activities:
${formatItems(votes.activities)}

Restaurants:
${formatItems(votes.restaurants)}

Private Chefs:
${formatItems(votes.chefs)}

IMPORTANT FIXED-DATE CONSTRAINTS:
- The Rodeo at Lone Mountain Ranch is ONLY on Tuesday July 21 (evening)
- The Farmers Market is ONLY on Wednesday July 22 (5-8 PM)
- If these dates fall within the trip, schedule them on the correct day

Rules:
- Put consensus picks (high yes count) on definite days
- Mark split/conflicted items as "optional" with a note
- Include free time blocks
- Don't overschedule — max 2 activities per day plus meals
- Include 1-2 restaurant dinners and 1-2 private chef nights

Return ONLY a valid JSON array, no markdown. Format:
[{"dayNumber":1,"date":"July 18","slots":[{"time":"morning","activity":"Ousel Falls Hike","signal":"consensus","note":"Easy start — unanimous pick"},{"time":"evening","activity":"Free evening at house","signal":"optional","note":"Settle in, cook dinner"}]}]

time must be "morning", "afternoon", or "evening".
signal must be "consensus", "split", or "optional".`;

  const response = await ai().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "[]";

  let schedule: unknown[] = [];
  try {
    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed)) {
      schedule = parsed;
    }
  } catch {
    schedule = [];
  }

  return Response.json(schedule);
}
