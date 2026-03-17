import {
  trips,
  participants,
  preferences,
  itineraryBlocks,
  reactions,
} from "@/db/schema";

type Trip = typeof trips.$inferSelect;
type Participant = typeof participants.$inferSelect;
type Preference = typeof preferences.$inferSelect;
type Block = typeof itineraryBlocks.$inferSelect;

// Silence unused-variable lints for type-only imports
type _Participant = Participant;
type _Reaction = typeof reactions.$inferSelect;

interface ReactionAggregate {
  blockId: string;
  love: number;
  fine: number;
  rather_not: number;
  hard_no: number;
  notes: Array<{ name: string; text: string }>;
}

interface CommentEntry {
  participantId: string;
  text: string;
  createdAt: string;
}

interface ItineraryPromptParams {
  trip: Trip;
  onboardingConversation: Array<{ role: string; content: string }>;
  participantsWithPrefs: Array<{
    name: string | null;
    email: string;
    preferences: Preference | null;
  }>;
  priorBlocks?: Block[];
  priorReactions?: ReactionAggregate[];
  priorComments?: CommentEntry[];
  pinnedSlots?: Array<{ dayNumber: number; sortOrder: number; title: string }>;
}

export function buildItineraryPrompt(params: ItineraryPromptParams): string {
  const {
    trip,
    onboardingConversation,
    participantsWithPrefs,
    priorBlocks,
    priorReactions,
    priorComments,
    pinnedSlots,
  } = params;

  // Calculate trip duration
  let durationDays = 3; // default
  if (trip.startDate && trip.endDate) {
    durationDays = Math.max(
      1,
      Math.ceil(
        (trip.endDate.getTime() - trip.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    );
  }

  const sections: string[] = [];

  // Core instruction
  sections.push(`You are a travel itinerary generator. Create a detailed day-by-day itinerary as NDJSON (one JSON object per line, no array wrapper, no trailing commas).

Each line must be a valid JSON object with these fields:
{"dayNumber": <int>, "sortOrder": <int>, "type": "<activity|meal|transport|lodging|free_time|note>", "title": "<string>", "description": "<string>", "startTime": "<HH:MM or null>", "endTime": "<HH:MM or null>", "location": "<string or null>", "estimatedCost": "<number or null>", "aiReasoning": "<why this fits the group>"}

Output ONLY the JSON lines. No markdown, no commentary, no wrapping.
Sort by dayNumber ASC, then sortOrder ASC within each day.
Aim for 4-7 blocks per day (mix of activities, meals, transport, free time).`);

  // Trip context
  const tripContext = [
    `## Trip Details`,
    `- Title: ${trip.title}`,
    trip.destination
      ? `- Destination: ${trip.destination}`
      : `- Destination: TBD`,
    trip.startDate ? `- Start: ${trip.startDate.toLocaleDateString()}` : null,
    trip.endDate ? `- End: ${trip.endDate.toLocaleDateString()}` : null,
    `- Duration: ${durationDays} days`,
    `- Group size: ${participantsWithPrefs.length} people`,
  ]
    .filter(Boolean)
    .join("\n");
  sections.push(tripContext);

  // Owner's vision from onboarding
  if (onboardingConversation.length > 0) {
    const convoSummary = onboardingConversation
      .map(
        (m) => `${m.role === "user" ? "Owner" : "Assistant"}: ${m.content}`
      )
      .join("\n");
    sections.push(
      `## Owner's Vision (from onboarding conversation)\n${convoSummary}`
    );
  }

  // Participant preferences
  const prefsSection: string[] = ["## Participant Preferences"];
  for (const p of participantsWithPrefs) {
    const name = p.name || p.email;
    const pref = p.preferences;
    if (!pref) {
      prefsSection.push(`\n### ${name}\nNo preferences submitted.`);
      continue;
    }
    const lines = [`\n### ${name}`];
    if (pref.activityPreferences?.length)
      lines.push(`- Activities: ${pref.activityPreferences.join(", ")}`);
    if (pref.budgetMin || pref.budgetMax)
      lines.push(`- Budget: ${pref.budgetMin ?? "?"} – ${pref.budgetMax ?? "?"}`);
    if (pref.dietaryRestrictions?.length)
      lines.push(`- Dietary: ${pref.dietaryRestrictions.join(", ")}`);
    if (pref.hardNos?.length)
      lines.push(`- Hard nos: ${pref.hardNos.join(", ")}`);
    if (pref.mustHaves?.length)
      lines.push(`- Must haves: ${pref.mustHaves.join(", ")}`);
    if (pref.pacePreference) lines.push(`- Pace: ${pref.pacePreference}`);
    if (pref.additionalNotes) lines.push(`- Notes: ${pref.additionalNotes}`);
    if (pref.rawData)
      lines.push(`- Raw intake answers: ${JSON.stringify(pref.rawData)}`);
    prefsSection.push(lines.join("\n"));
  }
  sections.push(prefsSection.join("\n"));

  // Conflict resolution
  sections.push(`## Conflict Resolution
When preferences clash (e.g., one person wants relaxation, another wants action), blend both and explain the trade-off in the aiReasoning field. No one should feel their input was ignored.`);

  // Pinned slots (post-hoc merge — tell Claude to skip these)
  if (pinnedSlots?.length) {
    const slotList = pinnedSlots
      .map((s) => `- Day ${s.dayNumber}, slot ${s.sortOrder}: "${s.title}"`)
      .join("\n");
    sections.push(`## Reserved Slots (Pinned — DO NOT generate blocks for these)
The following slots are pinned from a prior version. Skip them — they will be merged in after generation. Plan around them.
${slotList}`);
  }

  // Prior version feedback (for revisions)
  if (priorBlocks?.length && priorReactions?.length) {
    const feedbackLines: string[] = ["## Prior Version Feedback"];
    for (const block of priorBlocks) {
      const rxn = priorReactions.find((r) => r.blockId === block.id);
      if (!rxn) continue;
      feedbackLines.push(
        `\n**Day ${block.dayNumber}: ${block.title}** (${block.type})`
      );
      feedbackLines.push(
        `Reactions: ❤️${rxn.love} 👍${rxn.fine} 🤷${rxn.rather_not} 🚫${rxn.hard_no}`
      );
      if (rxn.notes.length) {
        feedbackLines.push(
          `Notes: ${rxn.notes.map((n) => `"${n.text}" — ${n.name}`).join("; ")}`
        );
      }
    }
    sections.push(feedbackLines.join("\n"));
  }

  if (priorComments?.length) {
    const commentLines = priorComments
      .map((c) => `- "${c.text}"`)
      .join("\n");
    sections.push(`## General Comments from Group\n${commentLines}`);
  }

  return sections.join("\n\n");
}
