import { db } from "@/db";
import { trips, itineraries, itineraryBlocks } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { ai } from "./client";

export type ParticipantSummary = {
  name: string;
  represents: string;
  members: string[];
  likes: string;
  dislikes: string;
  notes?: string;
};

export type Rationale = {
  intro: string;
  participants: ParticipantSummary[];
  days: Record<string, string>;
  generatedAt: string;
};

// Household groupings for the Big Sky trip. One row per "voting unit".
// Alicia speaks for the Clark/Alicia family (4 people incl. the two girls).
// Maddie speaks for her + Corban (Corban didn't fill out the survey).
// Jeff & Sharon are the grandparents / planners.
// Andrew is solo.
const HOUSEHOLDS: Array<{
  name: string;
  represents: string;
  members: string[];
  voterNames: string[];
}> = [
  {
    name: "Jeff & Sharon",
    represents: "Grandparents & trip planners",
    members: ["Jeff", "Sharon"],
    voterNames: ["Jeff", "Sharon"],
  },
  {
    name: "Clark & Alicia's family",
    represents: "Clark, Alicia, and their girls Andie & Piper",
    members: ["Clark", "Alicia", "Andie", "Piper"],
    voterNames: ["Alicia", "Clark"],
  },
  {
    name: "Andrew",
    represents: "Solo",
    members: ["Andrew"],
    voterNames: ["Andrew"],
  },
  {
    name: "Maddie & Corban",
    represents: "Maddie filled out the survey for both",
    members: ["Maddie", "Corban"],
    voterNames: ["Maddie"],
  },
];

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

  const totalPeople = HOUSEHOLDS.reduce((n, h) => n + h.members.length, 0);
  const householdsBlock = HOUSEHOLDS.map(
    (h) =>
      `- ${h.name} — members: ${h.members.join(", ")}. Look for votes under: ${h.voterNames.join(", ")}`
  ).join("\n");

  const prompt = `You are helping a trip host share an itinerary with his mom for review. She wants to understand the reasoning behind the plan and each person's preferences.

TRIP: ${trip.title}
DESTINATION: ${trip.destination ?? "—"}
DATES: ${trip.startDate ? new Date(trip.startDate).toDateString() : "?"} – ${trip.endDate ? new Date(trip.endDate).toDateString() : "?"}

GROUP STRUCTURE — 4 households, ${totalPeople} people total (NOT 20):
${householdsBlock}

HOST ONBOARDING CONVERSATION (partial context; DO NOT quote the "20 people" figure — that was an early miscount):
${onboarding || "(none)"}

ITINERARY WITH PER-BLOCK REASONING (mentions specific voters by name):
${itineraryText}

Produce a JSON object with this EXACT shape:
{
  "intro": "...",
  "participants": [
    { "name": "Jeff & Sharon", "represents": "...", "likes": "...", "dislikes": "...", "notes": "..." },
    ...
  ],
  "days": { "1": "...", "2": "...", ... }
}

RULES:
- "intro": 4-6 short bullets (markdown with "- " bullets) summarizing the planning priorities. Warm, concise.
  * DO NOT say "20 people" — say "the group" or "our four households".
  * DO NOT repeat the phrase "ages 4–69" or similar age-range framing. Focus on what the group wanted and the trade-offs we made.
  * No heading.

- "participants": ONE object per household, in the exact order given above. For each:
  * "name", "represents", "members" — copy EXACTLY from the group structure.
  * "likes": 1 short sentence listing 2–4 things they voted YES on / are most excited about. Derive from the voter name mentions in the block reasonings.
  * "dislikes": 1 short sentence listing hard-no votes (or "No hard nos" if none).
  * "notes": 1 short optional sentence of anything unique. Empty string if nothing stands out.

- "days": For each day number in the itinerary, 2-3 sentences explaining the logic — the arc, pacing, and how it serves the group. Plain prose, no bullets. Do NOT explain obvious things (e.g. "we did a group kickoff because it builds alignment"). Do NOT keep repeating "ages 4–69".

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

  const participantsRaw = Array.isArray(parsed.participants)
    ? parsed.participants
    : [];
  const participants: ParticipantSummary[] = HOUSEHOLDS.map((h) => {
    const match = participantsRaw.find(
      (p: { name?: string }) =>
        typeof p?.name === "string" &&
        p.name.toLowerCase().includes(h.name.toLowerCase().split(" ")[0])
    );
    return {
      name: h.name,
      represents: h.represents,
      members: h.members,
      likes: String(match?.likes ?? ""),
      dislikes: String(match?.dislikes ?? ""),
      notes: match?.notes ? String(match.notes) : "",
    };
  });

  const rationale: Rationale = {
    intro: String(parsed.intro ?? ""),
    participants,
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
