# Phase 4: Itinerary Generation + Reactions — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build owner-triggered AI itinerary generation with streaming output, per-block reactions, general comments, pinning, and email notifications.

**Architecture:** Single streaming API route generates NDJSON blocks via Claude Sonnet 4.6. Blocks persist after stream completes. Participants react per-block + leave comments. Owner pins blocks and regenerates. Post-hoc merge for pinned blocks.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM + Neon, Anthropic SDK (streaming), Resend emails, Tailwind CSS v4, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-03-17-phase4-itinerary-generation-design.md`

---

## File Map

### New Files
| File | Purpose |
|------|---------|
| `src/app/api/trips/[id]/generate/route.ts` | Streaming itinerary generation endpoint |
| `src/app/api/trips/[id]/itinerary/route.ts` | GET current itinerary + blocks + reactions |
| `src/app/api/trips/[id]/reactions/route.ts` | POST reaction to a block |
| `src/app/api/trips/[id]/comments/route.ts` | POST general comment on itinerary |
| `src/lib/ai/itinerary-prompt.ts` | `buildItineraryPrompt` function |
| `src/lib/email/itinerary-ready.ts` | Email template + send function |
| `src/app/trips/[id]/itinerary-view.tsx` | Client component: review screen with reactions |
| `src/app/trips/[id]/generate-view.tsx` | Client component: streaming generation UI |

### Modified Files
| File | Changes |
|------|---------|
| `src/db/schema.ts` | Add `comments` JSONB column to `itineraries` table |
| `src/app/trips/[id]/page.tsx` | Add `intake` generate button, `generating`/`reviewing` states, participant view |
| `src/lib/ai/prompts.ts` | Re-export types used by itinerary prompt |

---

## Chunk 1: Schema + API Foundation

### Task 1: Add comments column to itineraries schema

**Files:**
- Modify: `src/db/schema.ts:247-267`

- [ ] **Step 1: Add comments JSONB column**

In `src/db/schema.ts`, add to the `itineraries` table definition (after `aiReasoning` field, line ~258):

```typescript
comments: jsonb("comments")
  .$type<Array<{ participantId: string; text: string; createdAt: string }>>()
  .default([]),
```

- [ ] **Step 2: Push schema to Neon**

Run: `cd /Users/andrew/Projects/planner && npm run db:push`
Expected: Schema changes applied successfully.

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add comments JSONB column to itineraries table"
```

---

### Task 2: Build itinerary prompt function

**Files:**
- Create: `src/lib/ai/itinerary-prompt.ts`

- [ ] **Step 1: Create the prompt builder**

Create `src/lib/ai/itinerary-prompt.ts`:

```typescript
import { trips, participants, preferences, itineraryBlocks, reactions } from "@/db/schema";

type Trip = typeof trips.$inferSelect;
type Participant = typeof participants.$inferSelect;
type Preference = typeof preferences.$inferSelect;
type Block = typeof itineraryBlocks.$inferSelect;

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
  const { trip, onboardingConversation, participantsWithPrefs, priorBlocks, priorReactions, priorComments, pinnedSlots } = params;

  // Calculate trip duration
  let durationDays = 3; // default
  if (trip.startDate && trip.endDate) {
    durationDays = Math.max(1, Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
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
    trip.destination ? `- Destination: ${trip.destination}` : `- Destination: TBD`,
    trip.startDate ? `- Start: ${trip.startDate.toLocaleDateString()}` : null,
    trip.endDate ? `- End: ${trip.endDate.toLocaleDateString()}` : null,
    `- Duration: ${durationDays} days`,
    `- Group size: ${participantsWithPrefs.length} people`,
  ].filter(Boolean).join("\n");
  sections.push(tripContext);

  // Owner's vision from onboarding
  if (onboardingConversation.length > 0) {
    const convoSummary = onboardingConversation
      .map(m => `${m.role === "user" ? "Owner" : "Assistant"}: ${m.content}`)
      .join("\n");
    sections.push(`## Owner's Vision (from onboarding conversation)\n${convoSummary}`);
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
    if (pref.activityPreferences?.length) lines.push(`- Activities: ${pref.activityPreferences.join(", ")}`);
    if (pref.budgetMin || pref.budgetMax) lines.push(`- Budget: ${pref.budgetMin ?? "?"} – ${pref.budgetMax ?? "?"}`);
    if (pref.dietaryRestrictions?.length) lines.push(`- Dietary: ${pref.dietaryRestrictions.join(", ")}`);
    if (pref.hardNos?.length) lines.push(`- Hard nos: ${pref.hardNos.join(", ")}`);
    if (pref.mustHaves?.length) lines.push(`- Must haves: ${pref.mustHaves.join(", ")}`);
    if (pref.pacePreference) lines.push(`- Pace: ${pref.pacePreference}`);
    if (pref.additionalNotes) lines.push(`- Notes: ${pref.additionalNotes}`);
    if (pref.rawData) lines.push(`- Raw intake answers: ${JSON.stringify(pref.rawData)}`);
    prefsSection.push(lines.join("\n"));
  }
  sections.push(prefsSection.join("\n"));

  // Conflict resolution
  sections.push(`## Conflict Resolution
When preferences clash (e.g., one person wants relaxation, another wants action), blend both and explain the trade-off in the aiReasoning field. No one should feel their input was ignored.`);

  // Pinned slots (post-hoc merge — tell Claude to skip these)
  if (pinnedSlots?.length) {
    const slotList = pinnedSlots.map(s => `- Day ${s.dayNumber}, slot ${s.sortOrder}: "${s.title}"`).join("\n");
    sections.push(`## Reserved Slots (Pinned — DO NOT generate blocks for these)
The following slots are pinned from a prior version. Skip them — they will be merged in after generation. Plan around them.
${slotList}`);
  }

  // Prior version feedback (for revisions)
  if (priorBlocks?.length && priorReactions?.length) {
    const feedbackLines: string[] = ["## Prior Version Feedback"];
    for (const block of priorBlocks) {
      const rxn = priorReactions.find(r => r.blockId === block.id);
      if (!rxn) continue;
      feedbackLines.push(`\n**Day ${block.dayNumber}: ${block.title}** (${block.type})`);
      feedbackLines.push(`Reactions: ❤️${rxn.love} 👍${rxn.fine} 🤷${rxn.rather_not} 🚫${rxn.hard_no}`);
      if (rxn.notes.length) {
        feedbackLines.push(`Notes: ${rxn.notes.map(n => `"${n.text}" — ${n.name}`).join("; ")}`);
      }
    }
    sections.push(feedbackLines.join("\n"));
  }

  if (priorComments?.length) {
    const commentLines = priorComments.map(c => `- "${c.text}"`).join("\n");
    sections.push(`## General Comments from Group\n${commentLines}`);
  }

  return sections.join("\n\n");
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/itinerary-prompt.ts
git commit -m "feat: add buildItineraryPrompt for itinerary generation"
```

---

### Task 3: Build POST /api/trips/[id]/generate route

**Files:**
- Create: `src/app/api/trips/[id]/generate/route.ts`

- [ ] **Step 1: Create the streaming generation route**

Create `src/app/api/trips/[id]/generate/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  trips, participants, preferences, itineraries, itineraryBlocks, reactions,
} from "@/db/schema";
import { eq, and, desc, max } from "drizzle-orm";
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
  if (trip.ownerId !== session.user.id) return new Response("Forbidden", { status: 403 });

  // Guard: only generate from intake or reviewing status
  if (trip.status !== "intake" && trip.status !== "reviewing") {
    return new Response(`Cannot generate from status: ${trip.status}`, { status: 400 });
  }

  // Guard: at least one completed participant
  const allParticipants = await database
    .select()
    .from(participants)
    .where(eq(participants.tripId, id));

  const completedCount = allParticipants.filter(p => p.status === "completed").length;
  if (completedCount === 0) {
    return new Response("No participants have completed intake", { status: 400 });
  }

  // Set trip status to generating (prevents double-tap)
  const previousStatus = trip.status;
  await database.update(trips).set({ status: "generating", updatedAt: new Date() }).where(eq(trips.id, id));

  // Load participant preferences
  const participantsWithPrefs = await Promise.all(
    allParticipants.map(async (p) => {
      const [pref] = await database
        .select()
        .from(preferences)
        .where(eq(preferences.participantId, p.id))
        .limit(1);
      return { name: p.name, email: p.email, preferences: pref ?? null };
    })
  );

  // Load prior itinerary data for revisions
  let priorBlocks: typeof itineraryBlocks.$inferSelect[] = [];
  let priorReactions: Array<{ blockId: string; love: number; fine: number; rather_not: number; hard_no: number; notes: Array<{ name: string; text: string }> }> = [];
  let priorComments: Array<{ participantId: string; text: string; createdAt: string }> = [];
  let pinnedSlots: Array<{ dayNumber: number; sortOrder: number; title: string }> = [];
  let pinnedBlocksToMerge: typeof itineraryBlocks.$inferSelect[] = [];

  // Get latest itinerary version number
  const [latestItinerary] = await database
    .select()
    .from(itineraries)
    .where(eq(itineraries.tripId, id))
    .orderBy(desc(itineraries.version))
    .limit(1);

  if (latestItinerary) {
    // Load prior blocks
    priorBlocks = await database
      .select()
      .from(itineraryBlocks)
      .where(eq(itineraryBlocks.itineraryId, latestItinerary.id));

    // Separate pinned blocks for post-hoc merge
    pinnedBlocksToMerge = priorBlocks.filter(b => b.pinned);
    pinnedSlots = pinnedBlocksToMerge.map(b => ({
      dayNumber: b.dayNumber,
      sortOrder: b.sortOrder,
      title: b.title,
    }));

    // Load reactions with participant names
    for (const block of priorBlocks) {
      const blockReactions = await database
        .select()
        .from(reactions)
        .where(eq(reactions.blockId, block.id));

      const summary = { blockId: block.id, love: 0, fine: 0, rather_not: 0, hard_no: 0, notes: [] as Array<{ name: string; text: string }> };
      for (const r of blockReactions) {
        summary[r.reaction]++;
        if (r.note) {
          const participant = allParticipants.find(p => p.id === r.participantId);
          summary.notes.push({ name: participant?.name || participant?.email || "Unknown", text: r.note });
        }
      }
      priorReactions.push(summary);
    }

    // Load prior comments
    priorComments = (latestItinerary.comments as Array<{ participantId: string; text: string; createdAt: string }>) ?? [];
  }

  const newVersion = latestItinerary ? latestItinerary.version + 1 : 1;

  // Build prompt
  const systemPrompt = buildItineraryPrompt({
    trip,
    onboardingConversation: (trip.onboardingConversation ?? []) as Array<{ role: string; content: string }>,
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
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            fullResponse += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();

        // Parse NDJSON blocks
        const lines = fullResponse.trim().split("\n").filter(l => l.trim());
        const parsedBlocks: Array<{
          dayNumber: number; sortOrder: number; type: string; title: string;
          description: string; startTime: string | null; endTime: string | null;
          location: string | null; estimatedCost: string | null; aiReasoning: string | null;
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
              type: b.type as "activity" | "meal" | "transport" | "lodging" | "free_time" | "note",
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
        await persistDb.update(trips).set({ status: "reviewing", updatedAt: new Date() }).where(eq(trips.id, id));

        // Send notification emails (fire-and-forget)
        const participantEmails = allParticipants
          .filter(p => p.role !== "owner" && p.email)
          .map(p => ({ email: p.email, name: p.name }));

        sendItineraryReadyEmail({
          emails: participantEmails,
          tripTitle: trip.title,
          destination: trip.destination,
          tripId: id,
          version: newVersion,
        }).catch(() => {}); // fire-and-forget

      } catch (error) {
        // Rollback trip status on failure
        db().update(trips).set({ status: previousStatus, updatedAt: new Date() }).where(eq(trips.id, id)).then(() => {});
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: May fail on missing `sendItineraryReadyEmail` — that's Task 4. Confirm no other errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/trips/[id]/generate/route.ts
git commit -m "feat: add streaming itinerary generation API route"
```

---

### Task 4: Build email notification function

**Files:**
- Create: `src/lib/email/itinerary-ready.ts`

- [ ] **Step 1: Create the email function**

Create `src/lib/email/itinerary-ready.ts`:

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.AUTH_RESEND_KEY);
const BASE_URL = process.env.NEXTAUTH_URL || "https://planner-sooty-theta.vercel.app";

interface SendParams {
  emails: Array<{ email: string; name: string | null }>;
  tripTitle: string;
  destination: string | null;
  tripId: string;
  version: number;
}

export async function sendItineraryReadyEmail(params: SendParams) {
  const { emails, tripTitle, destination, tripId, version } = params;
  const isRevision = version > 1;

  const subject = isRevision
    ? `Updated itinerary for ${destination || tripTitle} (v${version})`
    : `Your ${destination || tripTitle} trip itinerary is ready!`;

  const body = isRevision
    ? `The itinerary has been revised based on everyone's feedback. Take another look and react to the changes.`
    : `An itinerary has been generated for your trip. Check it out and share your reactions — your feedback helps shape the final plan.`;

  const link = `${BASE_URL}/trips/${tripId}`;

  for (const { email, name } of emails) {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "Planner <onboarding@resend.dev>",
      to: email,
      subject,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
          <h2 style="font-size: 20px; margin-bottom: 8px;">${subject}</h2>
          <p style="color: #57534e; font-size: 15px; line-height: 1.6;">
            Hi${name ? ` ${name}` : ""},<br><br>
            ${body}
          </p>
          <a href="${link}" style="display: inline-block; background: #1c1917; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 500; margin-top: 16px;">
            View ${isRevision ? "Updated " : ""}Itinerary
          </a>
        </div>
      `,
    }).catch(() => {}); // individual email failures are non-critical
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email/itinerary-ready.ts
git commit -m "feat: add itinerary ready email notification"
```

---

## Chunk 2: Read + React API Routes

### Task 5: Build GET /api/trips/[id]/itinerary route

**Files:**
- Create: `src/app/api/trips/[id]/itinerary/route.ts`

- [ ] **Step 1: Create the itinerary read route**

Create `src/app/api/trips/[id]/itinerary/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  trips, participants, itineraries, itineraryBlocks, reactions,
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
    return Response.json({ itinerary: null, blocks: [], versions: [], viewer: { participantId: viewer.id, role: viewer.role } });
  }

  // Load blocks sorted by day + order
  const blocks = await database
    .select()
    .from(itineraryBlocks)
    .where(eq(itineraryBlocks.itineraryId, itinerary.id));

  const sortedBlocks = blocks.sort((a, b) => a.dayNumber - b.dayNumber || a.sortOrder - b.sortOrder);

  // Load all participants for name lookup
  const allParticipants = await database
    .select({ id: participants.id, name: participants.name, email: participants.email })
    .from(participants)
    .where(eq(participants.tripId, id));

  const nameMap = new Map(allParticipants.map(p => [p.id, p.name || p.email]));

  // Load reactions for all blocks
  const blockIds = sortedBlocks.map(b => b.id);
  const allReactions = blockIds.length > 0
    ? await database.select().from(reactions).where(
        // Load all reactions for this itinerary's blocks
        eq(reactions.blockId, blockIds[0]) // Will be replaced with inArray below
      )
    : [];

  // Actually load reactions for all blocks (can't use inArray with neon-http easily, so load per-block)
  const blocksWithReactions = await Promise.all(
    sortedBlocks.map(async (block) => {
      const blockReactions = await database
        .select()
        .from(reactions)
        .where(eq(reactions.blockId, block.id));

      const reactionSummary = { love: 0, fine: 0, rather_not: 0, hard_no: 0 };
      const reactionList = blockReactions.map(r => {
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
  const rawComments = (itinerary.comments as Array<{ participantId: string; text: string; createdAt: string }>) ?? [];
  const commentsWithNames = rawComments.map(c => ({
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/trips/[id]/itinerary/route.ts
git commit -m "feat: add GET /api/trips/[id]/itinerary route"
```

---

### Task 6: Build POST /api/trips/[id]/reactions route

**Files:**
- Create: `src/app/api/trips/[id]/reactions/route.ts`

- [ ] **Step 1: Create the reactions route**

Create `src/app/api/trips/[id]/reactions/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { participants, reactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { blockId, reaction, note } = body as {
    blockId: string;
    reaction: "love" | "fine" | "rather_not" | "hard_no";
    note?: string;
  };

  if (!blockId || !reaction) {
    return new Response("blockId and reaction required", { status: 400 });
  }

  const validReactions = ["love", "fine", "rather_not", "hard_no"];
  if (!validReactions.includes(reaction)) {
    return new Response("Invalid reaction type", { status: 400 });
  }

  const database = db();

  // Verify caller is a participant of this trip
  const [viewer] = await database
    .select()
    .from(participants)
    .where(and(eq(participants.tripId, id), eq(participants.userId, session.user.id)))
    .limit(1);

  if (!viewer) return new Response("Forbidden", { status: 403 });

  // Upsert reaction
  await database
    .insert(reactions)
    .values({
      blockId,
      participantId: viewer.id,
      reaction,
      note: note || null,
    })
    .onConflictDoUpdate({
      target: [reactions.blockId, reactions.participantId],
      set: {
        reaction,
        note: note || null,
        createdAt: new Date(),
      },
    });

  return Response.json({ success: true });
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/trips/[id]/reactions/route.ts
git commit -m "feat: add POST /api/trips/[id]/reactions route with upsert"
```

---

### Task 7: Build POST /api/trips/[id]/comments route

**Files:**
- Create: `src/app/api/trips/[id]/comments/route.ts`

- [ ] **Step 1: Create the comments route**

Create `src/app/api/trips/[id]/comments/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { participants, itineraries } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { text } = body as { text: string };

  if (!text?.trim()) {
    return new Response("Comment text required", { status: 400 });
  }

  const database = db();

  // Verify caller is a participant
  const [viewer] = await database
    .select()
    .from(participants)
    .where(and(eq(participants.tripId, id), eq(participants.userId, session.user.id)))
    .limit(1);

  if (!viewer) return new Response("Forbidden", { status: 403 });

  // Get latest itinerary
  const [latestItinerary] = await database
    .select()
    .from(itineraries)
    .where(eq(itineraries.tripId, id))
    .orderBy(desc(itineraries.version))
    .limit(1);

  if (!latestItinerary) {
    return new Response("No itinerary exists", { status: 400 });
  }

  // Append comment to JSONB array
  const existingComments = (latestItinerary.comments as Array<{ participantId: string; text: string; createdAt: string }>) ?? [];
  const updatedComments = [
    ...existingComments,
    { participantId: viewer.id, text: text.trim(), createdAt: new Date().toISOString() },
  ];

  await database
    .update(itineraries)
    .set({ comments: updatedComments })
    .where(eq(itineraries.id, latestItinerary.id));

  return Response.json({ success: true });
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/trips/[id]/comments/route.ts
git commit -m "feat: add POST /api/trips/[id]/comments route"
```

---

## Chunk 3: UI Components

### Task 8: Build streaming generation view component

**Files:**
- Create: `src/app/trips/[id]/generate-view.tsx`

- [ ] **Step 1: Create the streaming generation client component**

Create `src/app/trips/[id]/generate-view.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";

interface Block {
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
}

const TYPE_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  activity: { bg: "bg-blue-100", text: "text-blue-800", label: "Activity" },
  meal: { bg: "bg-amber-100", text: "text-amber-800", label: "Meal" },
  transport: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Transport" },
  lodging: { bg: "bg-purple-100", text: "text-purple-800", label: "Lodging" },
  free_time: { bg: "bg-green-100", text: "text-green-800", label: "Free Time" },
  note: { bg: "bg-stone-100", text: "text-stone-600", label: "Note" },
};

export function GenerateView({
  tripId,
  tripDays,
  onComplete,
}: {
  tripId: string;
  tripDays: number;
  onComplete: () => void;
}) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startGeneration = useCallback(async () => {
    setIsGenerating(true);
    setBlocks([]);
    setError(null);

    try {
      const res = await fetch(`/api/trips/${tripId}/generate`, { method: "POST" });
      if (!res.ok) {
        setError(await res.text());
        setIsGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const block: Block = JSON.parse(line);
            setBlocks(prev => [...prev, block]);
            setCurrentDay(block.dayNumber);
          } catch {
            // Skip malformed lines
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const block: Block = JSON.parse(buffer);
          setBlocks(prev => [...prev, block]);
        } catch {
          // Skip
        }
      }

      setIsGenerating(false);
      // Small delay then refresh to show review UI
      setTimeout(onComplete, 1000);
    } catch (err) {
      setError("Generation failed. Please try again.");
      setIsGenerating(false);
    }
  }, [tripId, onComplete]);

  // Group blocks by day
  const dayGroups = blocks.reduce<Record<number, Block[]>>((acc, block) => {
    if (!acc[block.dayNumber]) acc[block.dayNumber] = [];
    acc[block.dayNumber].push(block);
    return acc;
  }, {});

  if (!isGenerating && blocks.length === 0) {
    return (
      <div className="text-center py-12">
        <button
          onClick={startGeneration}
          className="bg-stone-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-stone-800 transition-colors"
        >
          Generate Itinerary
        </button>
        {error && <p className="text-red-600 mt-4 text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden">
      {/* Progress header */}
      <div className="bg-white px-5 py-4 border-b border-stone-200">
        <div className="flex items-center gap-2.5 mb-2">
          {isGenerating && (
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          )}
          <p className="text-sm font-semibold text-stone-900">
            {isGenerating ? "Building your itinerary..." : "Itinerary generated!"}
          </p>
        </div>
        {isGenerating && (
          <>
            <div className="h-1 bg-stone-200 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (currentDay / tripDays) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-stone-400 mt-1">Day {currentDay} of {tripDays}</p>
          </>
        )}
      </div>

      {/* Blocks */}
      {Object.entries(dayGroups)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([day, dayBlocks]) => (
          <div key={day}>
            <div className="px-5 py-3 border-b border-stone-100">
              <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold">
                Day {day}
              </p>
            </div>
            {dayBlocks
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((block, i) => {
                const badge = TYPE_BADGES[block.type] || TYPE_BADGES.note;
                return (
                  <div
                    key={`${day}-${i}`}
                    className="px-5 py-3.5 border-b border-stone-100 animate-in fade-in duration-300"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {block.startTime && (
                        <span className="text-xs text-stone-500">{block.startTime}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${badge.bg} ${badge.text} font-medium`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="font-semibold text-stone-900">{block.title}</p>
                    {block.description && (
                      <p className="text-sm text-stone-600 mt-0.5">{block.description}</p>
                    )}
                    {(block.location || block.estimatedCost) && (
                      <p className="text-xs text-stone-400 mt-1">
                        {block.location && `📍 ${block.location}`}
                        {block.location && block.estimatedCost && " · "}
                        {block.estimatedCost && `~$${block.estimatedCost}/person`}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        ))}

      {/* Typing indicator */}
      {isGenerating && (
        <div className="px-5 py-4 flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-pulse" />
            <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-pulse [animation-delay:200ms]" />
            <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-pulse [animation-delay:400ms]" />
          </div>
          <span className="text-xs text-stone-400">Planning next activity...</span>
        </div>
      )}

      {error && (
        <div className="px-5 py-4 bg-red-50 text-red-700 text-sm">{error}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds (component not yet imported anywhere).

- [ ] **Step 3: Commit**

```bash
git add src/app/trips/[id]/generate-view.tsx
git commit -m "feat: add streaming generation view component"
```

---

### Task 9: Build itinerary review view component

**Files:**
- Create: `src/app/trips/[id]/itinerary-view.tsx`

- [ ] **Step 1: Create the review client component**

Create `src/app/trips/[id]/itinerary-view.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";

interface Reaction {
  participantId: string;
  name: string;
  reaction: string;
  note: string | null;
}

interface ReactionSummary {
  love: number;
  fine: number;
  rather_not: number;
  hard_no: number;
}

interface Block {
  id: string;
  dayNumber: number;
  sortOrder: number;
  type: string;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  estimatedCost: string | null;
  aiReasoning: string | null;
  pinned: boolean;
  reactions: Reaction[];
  reactionSummary: ReactionSummary;
}

interface Comment {
  participantId: string;
  name: string;
  text: string;
  createdAt: string;
}

interface ItineraryData {
  itinerary: {
    id: string;
    version: number;
    status: string;
    comments: Comment[];
    createdAt: string;
  };
  blocks: Block[];
  versions: Array<{ version: number; createdAt: string }>;
  viewer: { participantId: string; role: string };
}

const TYPE_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  activity: { bg: "bg-blue-100", text: "text-blue-800", label: "Activity" },
  meal: { bg: "bg-amber-100", text: "text-amber-800", label: "Meal" },
  transport: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Transport" },
  lodging: { bg: "bg-purple-100", text: "text-purple-800", label: "Lodging" },
  free_time: { bg: "bg-green-100", text: "text-green-800", label: "Free Time" },
  note: { bg: "bg-stone-100", text: "text-stone-600", label: "Note" },
};

const REACTION_BUTTONS = [
  { key: "love", emoji: "❤️", label: "Love" },
  { key: "fine", emoji: "👍", label: "Fine" },
  { key: "rather_not", emoji: "🤷", label: "Rather Not" },
  { key: "hard_no", emoji: "🚫", label: "Hard No" },
] as const;

export function ItineraryView({
  tripId,
  isOwner,
  onRegenerate,
}: {
  tripId: string;
  isOwner: boolean;
  onRegenerate: () => void;
}) {
  const [data, setData] = useState<ItineraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [reactingBlockId, setReactingBlockId] = useState<string | null>(null);

  const fetchItinerary = useCallback(async (version?: number) => {
    setLoading(true);
    const url = version
      ? `/api/trips/${tripId}/itinerary?version=${version}`
      : `/api/trips/${tripId}/itinerary`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      setData(json);
      setSelectedVersion(json.itinerary?.version ?? null);
    }
    setLoading(false);
  }, [tripId]);

  useEffect(() => { fetchItinerary(); }, [fetchItinerary]);

  const handleReaction = async (blockId: string, reaction: string) => {
    setReactingBlockId(blockId);
    await fetch(`/api/trips/${tripId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId, reaction }),
    });
    await fetchItinerary(selectedVersion ?? undefined);
    setReactingBlockId(null);
  };

  const handlePin = async (blockId: string, pinned: boolean) => {
    // TODO: Add pin toggle endpoint in future iteration
    // For now, pins are managed through regeneration
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    await fetch(`/api/trips/${tripId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: commentText }),
    });
    setCommentText("");
    await fetchItinerary(selectedVersion ?? undefined);
    setSubmittingComment(false);
  };

  if (loading || !data || !data.itinerary) {
    return <div className="text-center py-12 text-stone-500">Loading itinerary...</div>;
  }

  const { itinerary, blocks, versions, viewer } = data;

  // Group blocks by day
  const dayGroups = blocks.reduce<Record<number, Block[]>>((acc, block) => {
    if (!acc[block.dayNumber]) acc[block.dayNumber] = [];
    acc[block.dayNumber].push(block);
    return acc;
  }, {});

  // Find viewer's existing reactions
  const viewerReactions = new Map<string, string>();
  for (const block of blocks) {
    const myReaction = block.reactions.find(r => r.participantId === viewer.participantId);
    if (myReaction) viewerReactions.set(block.id, myReaction.reaction);
  }

  return (
    <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden">
      {/* Version bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-stone-200">
        <span className="text-xs text-stone-500">
          Version {itinerary.version} of {versions.length}
        </span>
        <div className="flex gap-1.5">
          {versions.map(v => (
            <button
              key={v.version}
              onClick={() => fetchItinerary(v.version)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                v.version === selectedVersion
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200"
              }`}
            >
              v{v.version}
            </button>
          ))}
        </div>
      </div>

      {/* Blocks by day */}
      {Object.entries(dayGroups)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([day, dayBlocks]) => (
          <div key={day}>
            <div className="px-5 py-3 border-b border-stone-100">
              <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold">
                Day {day}
              </p>
            </div>
            {dayBlocks
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((block) => {
                const badge = TYPE_BADGES[block.type] || TYPE_BADGES.note;
                const hasHardNos = block.reactionSummary.hard_no > 0;
                const hardNoNotes = block.reactions.filter(r => r.reaction === "hard_no" && r.note);
                const myReaction = viewerReactions.get(block.id);

                return (
                  <div
                    key={block.id}
                    className={`px-5 py-4 border-b border-stone-100 ${hasHardNos ? "bg-red-50" : ""}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {block.startTime && (
                            <span className="text-xs text-stone-500">{block.startTime}</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded ${badge.bg} ${badge.text} font-medium`}>
                            {badge.label}
                          </span>
                          {hasHardNos && (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 font-semibold">
                              ⚠ {block.reactionSummary.hard_no} Hard No{block.reactionSummary.hard_no > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-stone-900">{block.title}</p>
                        {block.description && (
                          <p className="text-sm text-stone-600 mt-0.5">{block.description}</p>
                        )}
                        {(block.location || block.estimatedCost) && (
                          <p className="text-xs text-stone-400 mt-1">
                            {block.location && `📍 ${block.location}`}
                            {block.location && block.estimatedCost && " · "}
                            {block.estimatedCost && `~$${block.estimatedCost}/person`}
                          </p>
                        )}
                      </div>
                      {isOwner && (
                        <button
                          className={`border rounded-md px-2 py-1.5 text-sm ${
                            block.pinned
                              ? "bg-amber-50 border-amber-300 text-amber-700"
                              : "border-stone-200 text-stone-400 hover:bg-stone-50"
                          }`}
                          title={block.pinned ? "Pinned" : "Pin this block"}
                        >
                          📌
                        </button>
                      )}
                    </div>

                    {/* Pinned indicator */}
                    {block.pinned && (
                      <div className="flex items-center gap-1.5 mt-2.5 px-2.5 py-1.5 bg-amber-50 rounded-md border border-amber-200">
                        <span className="text-xs">📌</span>
                        <span className="text-xs text-amber-700 font-medium">Pinned — won't change on regeneration</span>
                      </div>
                    )}

                    {/* Hard no notes */}
                    {hardNoNotes.length > 0 && (
                      <div className="mt-2 px-3 py-2 bg-white rounded-md border border-red-200">
                        <p className="text-xs text-red-700 font-medium mb-1">Notes from group:</p>
                        {hardNoNotes.map((r, i) => (
                          <p key={i} className="text-xs text-stone-600">"{r.note}" — {r.name}</p>
                        ))}
                      </div>
                    )}

                    {/* Reaction buttons */}
                    <div className="flex gap-1.5 mt-3">
                      {REACTION_BUTTONS.map(({ key, emoji, label }) => {
                        const count = block.reactionSummary[key as keyof ReactionSummary];
                        const isSelected = myReaction === key;
                        return (
                          <button
                            key={key}
                            onClick={() => handleReaction(block.id, key)}
                            disabled={reactingBlockId === block.id}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                              isSelected
                                ? key === "hard_no"
                                  ? "bg-red-50 border-2 border-red-400"
                                  : "bg-green-50 border-2 border-green-400"
                                : "bg-stone-100 border border-stone-200 hover:bg-stone-200"
                            }`}
                          >
                            {emoji} {label}
                            {count > 0 && (
                              <span className={`font-semibold ${
                                key === "hard_no" ? "text-red-600" : "text-green-600"
                              }`}>{count}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        ))}

      {/* General comments */}
      <div className="px-5 py-4 bg-white border-t-2 border-stone-200">
        <p className="text-sm font-semibold text-stone-900 mb-3">💬 General Comments</p>

        {itinerary.comments.map((c, i) => (
          <div key={i} className="px-3 py-2.5 bg-stone-50 rounded-lg mb-2">
            <p className="text-xs text-stone-500 mb-0.5">{c.name}</p>
            <p className="text-sm text-stone-700">{c.text}</p>
          </div>
        ))}

        <div className="flex gap-2 mt-2">
          <input
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleComment()}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2.5 border border-stone-200 rounded-lg text-sm outline-none focus:border-stone-400"
          />
          <button
            onClick={handleComment}
            disabled={submittingComment || !commentText.trim()}
            className="bg-stone-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {/* Owner action bar */}
      {isOwner && (
        <div className="flex items-center justify-between px-5 py-4 bg-stone-50 border-t-2 border-stone-200">
          <span className="text-xs text-stone-500">
            {blocks.filter(b => b.reactions.length > 0).length} of {blocks.length} blocks have reactions
          </span>
          <div className="flex gap-2">
            <button
              onClick={onRegenerate}
              className="px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm hover:bg-stone-50 transition-colors"
            >
              🔄 Regenerate
            </button>
            <button className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
              ✓ Finalize
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/trips/[id]/itinerary-view.tsx
git commit -m "feat: add itinerary review view with reactions, comments, pinning"
```

---

### Task 10: Update trip detail page with all states

**Files:**
- Modify: `src/app/trips/[id]/page.tsx`

- [ ] **Step 1: Rewrite trip detail page to handle all status states**

Replace the full contents of `src/app/trips/[id]/page.tsx` with:

```typescript
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, participants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InviteForm } from "./invite-form";
import { TripContent } from "./trip-content";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const database = db();

  const [trip] = await database.select().from(trips).where(eq(trips.id, id));
  if (!trip) notFound();

  // Check if viewer is a participant (owner or invited)
  const [viewer] = await database
    .select()
    .from(participants)
    .where(and(eq(participants.tripId, id), eq(participants.userId, session.user.id)))
    .limit(1);

  if (!viewer) notFound();

  const isOwner = trip.ownerId === session.user.id;

  const tripParticipants = await database
    .select()
    .from(participants)
    .where(eq(participants.tripId, id));

  const completedCount = tripParticipants.filter(p => p.status === "completed").length;

  // Calculate trip duration for streaming view
  let tripDays = 3;
  if (trip.startDate && trip.endDate) {
    tripDays = Math.max(1, Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{trip.title}</h1>
          <Badge variant="secondary">{trip.status}</Badge>
        </div>
        {trip.destination && (
          <p className="mt-1 text-muted-foreground">{trip.destination}</p>
        )}
        {(trip.startDate || trip.endDate) && (
          <p className="text-sm text-muted-foreground">
            {trip.startDate && new Date(trip.startDate).toLocaleDateString()}
            {trip.startDate && trip.endDate && " — "}
            {trip.endDate && new Date(trip.endDate).toLocaleDateString()}
          </p>
        )}
      </div>

      <TripContent
        tripId={id}
        tripStatus={trip.status}
        isOwner={isOwner}
        completedCount={completedCount}
        tripDays={tripDays}
        viewerStatus={viewer.status}
      />

      {/* Participants + Invite (always visible for owner) */}
      {isOwner && (
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Participants</h2>
            </CardHeader>
            <CardContent>
              {tripParticipants.length === 0 ? (
                <p className="text-sm text-muted-foreground">No participants yet.</p>
              ) : (
                <ul className="space-y-2">
                  {tripParticipants.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span>
                        {p.name || p.email}
                        {p.role === "owner" && (
                          <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                        )}
                      </span>
                      <Badge variant="outline" className="text-xs">{p.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <InviteForm tripId={id} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the TripContent client component**

Create `src/app/trips/[id]/trip-content.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GenerateView } from "./generate-view";
import { ItineraryView } from "./itinerary-view";

export function TripContent({
  tripId,
  tripStatus,
  isOwner,
  completedCount,
  tripDays,
  viewerStatus,
}: {
  tripId: string;
  tripStatus: string;
  isOwner: boolean;
  completedCount: number;
  tripDays: number;
  viewerStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(tripStatus);

  const handleGenerateComplete = () => {
    setStatus("reviewing");
    router.refresh();
  };

  const handleRegenerate = () => {
    setStatus("generating");
  };

  // Draft / Onboarding — owner only
  if ((status === "draft" || status === "onboarding") && isOwner) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {status === "draft" ? "Ready to start planning your trip?" : "Onboarding in progress"}
            </p>
            <Link href={`/trips/${tripId}/onboard`}>
              <Button>{status === "draft" ? "Start Planning" : "Continue Planning"}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Intake — different views for owner vs participant
  if (status === "intake") {
    if (isOwner) {
      return (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {completedCount === 0
                    ? "Waiting for participants to complete their intake."
                    : `${completedCount} participant${completedCount > 1 ? "s" : ""} completed intake.`}
                </p>
              </div>
              {completedCount > 0 && (
                <GenerateView
                  tripId={tripId}
                  tripDays={tripDays}
                  onComplete={handleGenerateComplete}
                />
              )}
            </div>
          </CardContent>
        </Card>
      );
    }
    // Participant view
    if (viewerStatus === "completed") {
      return (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              You've completed your intake. Waiting for others...
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Share your travel preferences.</p>
            <Link href={`/trips/${tripId}/intake`}>
              <Button>Complete Your Intake</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generating
  if (status === "generating") {
    if (isOwner) {
      return (
        <GenerateView
          tripId={tripId}
          tripDays={tripDays}
          onComplete={handleGenerateComplete}
        />
      );
    }
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Your itinerary is being created...</p>
        </CardContent>
      </Card>
    );
  }

  // Reviewing
  if (status === "reviewing") {
    return (
      <ItineraryView
        tripId={tripId}
        isOwner={isOwner}
        onRegenerate={handleRegenerate}
      />
    );
  }

  // Finalized (placeholder for Phase 5)
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">Trip finalized.</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/trips/[id]/page.tsx src/app/trips/[id]/trip-content.tsx
git commit -m "feat: update trip detail page with generate/review/participant states"
```

---

## Chunk 4: Integration + Verification

### Task 11: Push schema and verify end-to-end

- [ ] **Step 1: Push schema changes to Neon**

Run: `cd /Users/andrew/Projects/planner && npm run db:push`
Expected: Schema applied (comments column added to itineraries).

- [ ] **Step 2: Full build check**

Run: `npm run build 2>&1 | tail -15`
Expected: All routes compile, no errors.

- [ ] **Step 3: Start dev server and verify routes exist**

Run: `npm run dev &` then check the routes respond:
- `curl -s http://localhost:3000/api/trips/test/itinerary | head -20` → should return auth error (401)
- `curl -s http://localhost:3000/api/trips/test/generate -X POST | head -20` → should return auth error (401)

- [ ] **Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: Phase 4 itinerary generation — complete implementation"
```

- [ ] **Step 5: Push to GitHub**

```bash
git push origin main
```
