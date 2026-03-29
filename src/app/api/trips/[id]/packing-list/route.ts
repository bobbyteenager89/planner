import { db } from "@/db";
import { trips, itineraries, itineraryBlocks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const database = db();

  const [trip] = await database
    .select({ title: trips.title, destination: trips.destination, startDate: trips.startDate, endDate: trips.endDate })
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) return Response.json({ error: "Not found" }, { status: 404 });

  const [itinerary] = await database
    .select({ id: itineraries.id })
    .from(itineraries)
    .where(eq(itineraries.tripId, id))
    .orderBy(desc(itineraries.version))
    .limit(1);

  if (!itinerary) return Response.json({ packingList: null });

  const blocks = await database
    .select({ title: itineraryBlocks.title, type: itineraryBlocks.type, description: itineraryBlocks.description })
    .from(itineraryBlocks)
    .where(eq(itineraryBlocks.itineraryId, itinerary.id));

  const activities = blocks.map((b) => `${b.title}: ${b.description || ""}`).join("\n");

  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Generate a packing list for a family trip to ${trip.destination} (${trip.startDate ? new Date(trip.startDate).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "summer"}).

Activities planned:
${activities}

Output a JSON object with categories as keys and arrays of items as values. Be specific to the activities (e.g., "wading boots" for fly fishing, "closed-toe shoes" for horseback riding). Include essentials like sunscreen and bug spray for Montana in July. Keep it practical — no over-packing.

Format: {"Category": ["item1", "item2"]}
Only output the JSON, nothing else.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const packingList = JSON.parse(text);
    return Response.json(
      { packingList },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
    );
  } catch {
    return Response.json(
      { packingList: null },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  }
}
