import { db } from "@/db";
import { trips, itineraries, itineraryBlocks } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { ai } from "./client";

export type Rationale = {
  intro: string;
  days: Record<string, string>;
  generatedAt: string;
};

function parseRationale(raw: string | null): Rationale | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.intro === "string" && parsed.days) {
      return parsed as Rationale;
    }
  } catch {
    // legacy plain-text reasoning — treat as no rationale
  }
  return null;
}

export async function generateRationale(tripId: string): Promise<Rationale> {
  const database = db();

  const [trip] = await database
    .select()
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1);

  if (!trip) throw new Error("Trip not found");

  const [itinerary] = await database
    .select()
    .from(itineraries)
    .where(eq(itineraries.tripId, tripId))
    .orderBy(desc(itineraries.version))
    .limit(1);

  if (!itinerary) throw new Error("No itinerary for this trip");

  const blocks = await database
    .select({
      dayNumber: itineraryBlocks.dayNumber,
      sortOrder: itineraryBlocks.sortOrder,
      type: itineraryBlocks.type,
      title: itineraryBlocks.title,
      description: itineraryBlocks.description,
      location: itineraryBlocks.location,
      aiReasoning: itineraryBlocks.aiReasoning,
    })
    .from(itineraryBlocks)
    .where(eq(itineraryBlocks.itineraryId, itinerary.id))
    .orderBy(asc(itineraryBlocks.dayNumber), asc(itineraryBlocks.sortOrder));

  const dayNumbers = Array.from(new Set(blocks.map((b) => b.dayNumber))).sort(
    (a, b) => a - b
  );

  const onboarding = Array.isArray(trip.onboardingConversation)
    ? (trip.onboardingConversation as Array<{ role: string; content: string }>)
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n\n")
    : "";

  const itineraryText = dayNumbers
    .map((d) => {
      const dayBlocks = blocks.filter((b) => b.dayNumber === d);
      return `## Day ${d}\n${dayBlocks
        .map(
          (b) =>
            `- [${b.type}] ${b.title}${b.location ? ` @ ${b.location}` : ""}\n  Description: ${b.description ?? "—"}\n  Why: ${b.aiReasoning ?? "—"}`
        )
        .join("\n")}`;
    })
    .join("\n\n");

  const prompt = `You are helping a trip host share an itinerary with their mom for review. She wants to understand the reasoning behind the plan before approving it.

TRIP: ${trip.title}
DESTINATION: ${trip.destination ?? "—"}
DATES: ${trip.startDate ? new Date(trip.startDate).toDateString() : "?"} – ${trip.endDate ? new Date(trip.endDate).toDateString() : "?"}

HOST ONBOARDING CONVERSATION (context on the group and goals):
${onboarding || "(none)"}

ITINERARY WITH PER-BLOCK REASONING:
${itineraryText}

Produce a JSON object with this exact shape:
{
  "intro": "...",
  "days": { "1": "...", "2": "...", ... }
}

- "intro": 4-8 bullet points (as a single markdown string with "- " bullets) summarizing the group, constraints, and planning priorities that shaped the whole trip. Warm but concise. No heading.
- "days": For each day number in the itinerary, 2-4 sentences explaining the logic of that day — the arc, pacing, and how it serves the group. Plain prose, no bullets. Reference specific activities only when it helps explain the reasoning.

Output ONLY the JSON. No code fences, no preamble.`;

  const client = ai();
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  const parsed = JSON.parse(cleaned);

  const rationale: Rationale = {
    intro: String(parsed.intro ?? ""),
    days: Object.fromEntries(
      Object.entries(parsed.days ?? {}).map(([k, v]) => [String(k), String(v)])
    ),
    generatedAt: new Date().toISOString(),
  };

  await database
    .update(itineraries)
    .set({ aiReasoning: JSON.stringify(rationale) })
    .where(eq(itineraries.id, itinerary.id));

  return rationale;
}

export async function getRationale(
  tripId: string,
  { force = false }: { force?: boolean } = {}
): Promise<Rationale | null> {
  if (force) {
    try {
      return await generateRationale(tripId);
    } catch {
      return null;
    }
  }

  const database = db();
  const [itinerary] = await database
    .select({ aiReasoning: itineraries.aiReasoning })
    .from(itineraries)
    .where(eq(itineraries.tripId, tripId))
    .orderBy(desc(itineraries.version))
    .limit(1);

  const existing = parseRationale(itinerary?.aiReasoning ?? null);
  if (existing) return existing;

  try {
    return await generateRationale(tripId);
  } catch {
    return null;
  }
}
