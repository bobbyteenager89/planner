# Leader Intelligence Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the leader dashboard with conflict detection, per-item AI insights, scheduling intelligence, and participant engagement tools (remind + copy link).

**Architecture:** Extend existing `aggregateBigSkyVotes()` with conflict logic (pure computation). Three new API routes for AI insights, schedule preview, and reminders. Dashboard client component restructured with AI Tools section. One schema addition (`lastRemindedAt`).

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (Neon), Anthropic SDK (Claude Haiku), Resend (emails), Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-03-18-leader-intelligence-design.md`

---

## File Structure

| File | Type | Responsibility |
|------|------|---------------|
| `src/lib/bigsky-dashboard.ts` | Modify | Add `conflicted`, `conflictPairs` to VoteTally |
| `src/db/schema.ts` | Modify | Add `lastRemindedAt` to participants |
| `src/app/trips/[id]/dashboard/page.tsx` | Modify | Pass `createdAt`, `lastRemindedAt` to client |
| `src/app/trips/[id]/dashboard/dashboard-content.tsx` | Modify | Conflict badges, insights, AI tools, schedule preview, remind/copy |
| `src/app/api/trips/[id]/insights/route.ts` | Create | Batch per-item AI insights |
| `src/app/api/trips/[id]/schedule-preview/route.ts` | Create | Day-by-day schedule framework |
| `src/app/api/trips/[id]/remind/route.ts` | Create | Send reminder email |
| `src/lib/email/survey-reminder.ts` | Create | Reminder email template |

---

### Task 1: Schema Change — Add `lastRemindedAt` to participants

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add the column**

In `src/db/schema.ts`, find the `participants` table definition. Add after the `createdAt` field:

```ts
    lastRemindedAt: timestamp("last_reminded_at", { mode: "date" }),
```

- [ ] **Step 2: Push schema to database**

Run: `cd /Users/andrew/Projects/planner && npm run db:push 2>&1 | tail -10`

Expected: Schema pushed successfully, new column added.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add lastRemindedAt column to participants table

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Conflict Detection in Vote Aggregation

**Files:**
- Modify: `src/lib/bigsky-dashboard.ts`

- [ ] **Step 1: Update VoteTally interface**

In `src/lib/bigsky-dashboard.ts`, add two new fields to the `VoteTally` interface after `voters`:

```ts
  conflicted: boolean;
  conflictPairs: { yesVoter: string; passVoter: string }[];
```

- [ ] **Step 2: Update the tallyVotes return**

Find the final `.map()` in `tallyVotes()` (line 85-87). Replace:

```ts
  return Object.values(tallies)
    .map((t) => ({ ...t, enthusiasm: t.yes + t.fine * 0.5 }))
    .sort((a, b) => b.enthusiasm - a.enthusiasm);
```

With:

```ts
  return Object.values(tallies)
    .map((t) => {
      const yesVoters = t.voters.filter((v) => v.vote === "yes").map((v) => v.name);
      const passVoters = t.voters.filter((v) => v.vote === "pass").map((v) => v.name);
      const conflicted = yesVoters.length > 0 && passVoters.length > 0;
      const conflictPairs: { yesVoter: string; passVoter: string }[] = [];
      if (conflicted) {
        for (const y of yesVoters) {
          for (const p of passVoters) {
            conflictPairs.push({ yesVoter: y, passVoter: p });
          }
        }
      }
      return {
        ...t,
        enthusiasm: t.yes + t.fine * 0.5,
        conflicted,
        conflictPairs,
      };
    })
    .sort((a, b) => b.enthusiasm - a.enthusiasm);
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /Users/andrew/Projects/planner && npx tsc --noEmit 2>&1 | head -20`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/bigsky-dashboard.ts
git commit -m "feat: add conflict detection to vote aggregation

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Reminder Email Template

**Files:**
- Create: `src/lib/email/survey-reminder.ts`

- [ ] **Step 1: Create the email template**

```ts
// src/lib/email/survey-reminder.ts

import { Resend } from "resend";

const resend = new Resend(process.env.AUTH_RESEND_KEY);
const BASE_URL =
  process.env.NEXTAUTH_URL || "https://planner-sooty-theta.vercel.app";

interface SendReminderParams {
  email: string;
  name: string | null;
  ownerName: string | null;
  tripTitle: string;
  destination: string | null;
  tripId: string;
}

export async function sendSurveyReminder(params: SendReminderParams) {
  const { email, name, ownerName, tripTitle, destination, tripId } = params;

  const subject = `Reminder: Share your preferences for ${destination || tripTitle}`;
  const link = `${BASE_URL}/trips/${tripId}/intake`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "Planner <onboarding@resend.dev>",
    to: email,
    subject,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="font-size: 20px; margin-bottom: 8px;">${subject}</h2>
        <p style="color: #57534e; font-size: 15px; line-height: 1.6;">
          Hi${name ? ` ${name}` : ""},<br><br>
          ${ownerName || "Your trip leader"} is planning a trip to ${destination || tripTitle} and would love your input.
          Click below to fill out a quick survey about your preferences.
        </p>
        <a href="${link}" style="display: inline-block; background: #D14F36; color: #F3EBE0; padding: 12px 24px; border-radius: 2px; text-decoration: none; font-size: 15px; font-weight: 700; margin-top: 16px; text-transform: uppercase; letter-spacing: 0.05em;">
          Fill Out Survey
        </a>
        <p style="color: #a8a29e; font-size: 13px; margin-top: 24px;">
          This is a friendly reminder. If you've already responded, you can ignore this email.
        </p>
      </div>
    `,
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/andrew/Projects/planner && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/lib/email/survey-reminder.ts
git commit -m "feat: add survey reminder email template

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Remind API Route

**Files:**
- Create: `src/app/api/trips/[id]/remind/route.ts`

- [ ] **Step 1: Create the route**

```ts
// src/app/api/trips/[id]/remind/route.ts

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, participants, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendSurveyReminder } from "@/lib/email/survey-reminder";

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

  // Load trip — owner only
  const [trip] = await database
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) return new Response("Trip not found", { status: 404 });
  if (trip.ownerId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // Parse body
  const body = await request.json();
  const { participantId } = body as { participantId: string };

  if (!participantId) {
    return new Response("participantId is required", { status: 400 });
  }

  // Load participant — must belong to THIS trip
  const [participant] = await database
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.id, participantId),
        eq(participants.tripId, id)
      )
    )
    .limit(1);

  if (!participant) {
    return new Response("Participant not found", { status: 404 });
  }

  // Rate limit: 24 hours
  if (participant.lastRemindedAt) {
    const hoursSince =
      (Date.now() - participant.lastRemindedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      return new Response("Reminder already sent recently", { status: 429 });
    }
  }

  // Get owner name for email
  const [owner] = await database
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  // Send email
  await sendSurveyReminder({
    email: participant.email,
    name: participant.name,
    ownerName: owner?.name ?? null,
    tripTitle: trip.title,
    destination: trip.destination,
    tripId: id,
  });

  // Update lastRemindedAt
  await database
    .update(participants)
    .set({ lastRemindedAt: new Date() })
    .where(eq(participants.id, participantId));

  return new Response("OK", { status: 200 });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/andrew/Projects/planner && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/trips/[id]/remind/route.ts
git commit -m "feat: add reminder API route with 24h rate limiting

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Insights API Route

**Files:**
- Create: `src/app/api/trips/[id]/insights/route.ts`

- [ ] **Step 1: Create the route**

```ts
// src/app/api/trips/[id]/insights/route.ts

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

  // Load + aggregate
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

  // Empty state guard
  if (votes.completedCount === 0) {
    return Response.json([]);
  }

  // Build prompt with IDs and labels
  const formatItems = (items: typeof votes.activities, category: string) =>
    items
      .map(
        (item) =>
          `- id: "${item.id}", label: "${item.label}": ${item.yes} yes, ${item.fine} fine, ${item.pass} pass (${item.total} voters)`
      )
      .join("\n");

  const prompt = `You are analyzing survey results for a family trip to Big Sky, Montana. ${votes.completedCount} people have responded.

Here are the vote results:

Activities:
${formatItems(votes.activities, "activity")}

Restaurants:
${formatItems(votes.restaurants, "restaurant")}

Private Chefs:
${formatItems(votes.chefs, "chef")}

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

  // Extract text content
  const text =
    response.content[0].type === "text" ? response.content[0].text : "[]";

  // Parse — be tolerant of Haiku output
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
    // If Haiku returns malformed JSON, return empty
    insights = [];
  }

  return Response.json(insights);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/andrew/Projects/planner && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/trips/[id]/insights/route.ts
git commit -m "feat: add batch AI insights route for leader dashboard

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Schedule Preview API Route

**Files:**
- Create: `src/app/api/trips/[id]/schedule-preview/route.ts`

- [ ] **Step 1: Create the route**

```ts
// src/app/api/trips/[id]/schedule-preview/route.ts

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

  // Guard: dates required
  if (!trip.startDate || !trip.endDate) {
    return new Response(
      "Trip dates must be set before generating a schedule preview",
      { status: 400 }
    );
  }

  // Load + aggregate
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

  // Calculate days
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

  // Format vote data
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

  // Parse — be tolerant
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
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/andrew/Projects/planner && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/trips/[id]/schedule-preview/route.ts
git commit -m "feat: add schedule preview route with day-by-day AI planning

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Update Dashboard Server Page

**Files:**
- Modify: `src/app/trips/[id]/dashboard/page.tsx`

Pass `createdAt` and `lastRemindedAt` through to client component.

- [ ] **Step 1: Update the participant mapping**

In `src/app/trips/[id]/dashboard/page.tsx`, find the `participantPrefs` mapping (the `return` inside the `.map()` callback). Replace:

```ts
      return {
        participantId: p.id,
        name: p.name || p.email,
        status: p.status,
        rawData: pref?.rawData ?? null,
      };
```

With:

```ts
      return {
        participantId: p.id,
        name: p.name || p.email,
        status: p.status,
        rawData: pref?.rawData ?? null,
        createdAt: p.createdAt.toISOString(),
        lastRemindedAt: p.lastRemindedAt?.toISOString() ?? null,
      };
```

- [ ] **Step 2: Update the DashboardContent props**

Find the `participants` prop in the JSX return. Replace:

```tsx
      participants={participantPrefs.map((p) => ({
        id: p.participantId,
        name: p.name,
        status: p.status,
      }))}
```

With:

```tsx
      participants={participantPrefs.map((p) => ({
        id: p.participantId,
        name: p.name,
        status: p.status,
        createdAt: p.createdAt,
        lastRemindedAt: p.lastRemindedAt,
      }))}
```

- [ ] **Step 3: Verify it compiles (will have type error until dashboard-content is updated — expected)**

Run: `cd /Users/andrew/Projects/planner && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add src/app/trips/[id]/dashboard/page.tsx
git commit -m "feat: pass participant timing data to dashboard client

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Update Dashboard Client Component

**Files:**
- Modify: `src/app/trips/[id]/dashboard/dashboard-content.tsx`

This is the largest task — adds conflict badges, AI insights, AI tools section, schedule preview, remind/copy buttons, relative time.

- [ ] **Step 1: Read the current file**

Read `src/app/trips/[id]/dashboard/dashboard-content.tsx` in full to understand the current structure before making changes.

- [ ] **Step 2: Update the Participant interface**

Replace:

```ts
interface Participant {
  id: string;
  name: string;
  status: string;
}
```

With:

```ts
interface Participant {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  lastRemindedAt: string | null;
}
```

- [ ] **Step 3: Add ItemInsight interface and signal color map**

After the color constants (`CARD_BG`), add:

```ts
interface ItemInsight {
  itemId: string;
  insight: string;
  signal: "consensus" | "split" | "low_interest" | "conflict";
}

interface ScheduleSlot {
  time: "morning" | "afternoon" | "evening";
  activity: string;
  signal: "consensus" | "split" | "optional";
  note: string;
}

interface ScheduleDay {
  dayNumber: number;
  date: string;
  slots: ScheduleSlot[];
}

const SIGNAL_COLORS: Record<string, string> = {
  consensus: "#4ade80",
  split: MUSTARD,
  conflict: RUST,
  low_interest: "#a8a29e",
  optional: "#a8a29e",
};
```

- [ ] **Step 4: Update the VoteBar component to show conflict badges and insights**

Replace the entire `VoteBar` function with:

```tsx
function VoteBar({
  tally,
  insight,
}: {
  tally: VoteTally;
  insight?: ItemInsight;
}) {
  const maxTotal = Math.max(tally.total, 1);
  const [showConflict, setShowConflict] = useState(false);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: RUST }}>
            {tally.label}
          </p>
          {tally.conflicted && (
            <button
              type="button"
              onClick={() => setShowConflict(!showConflict)}
              className="shrink-0 px-2 py-0.5 text-xs font-bold uppercase"
              style={{
                backgroundColor: RUST,
                color: CREAM,
                borderRadius: "2px",
                fontSize: "10px",
              }}
            >
              Split
            </button>
          )}
        </div>
        <p
          className="text-xs font-semibold whitespace-nowrap ml-3"
          style={{ color: RUST, opacity: 0.6 }}
        >
          {tally.yes} yes · {tally.fine} fine · {tally.pass} pass
        </p>
      </div>
      <div
        className="flex h-6 overflow-hidden"
        style={{
          borderRadius: "2px",
          border: "1px solid rgba(209, 79, 54, 0.3)",
        }}
      >
        {tally.yes > 0 && (
          <div style={{ width: `${(tally.yes / maxTotal) * 100}%`, backgroundColor: RUST }} />
        )}
        {tally.fine > 0 && (
          <div style={{ width: `${(tally.fine / maxTotal) * 100}%`, backgroundColor: MUSTARD }} />
        )}
        {tally.pass > 0 && (
          <div style={{ width: `${(tally.pass / maxTotal) * 100}%`, backgroundColor: CARD_BG }} />
        )}
      </div>
      {/* Conflict details */}
      {showConflict && tally.conflictPairs.length > 0 && (
        <div className="mt-1.5 text-xs font-medium" style={{ color: RUST, opacity: 0.7 }}>
          {tally.conflictPairs.slice(0, 3).map((pair, i) => (
            <span key={i}>
              {pair.yesVoter}: Yes vs {pair.passVoter}: Pass
              {i < Math.min(tally.conflictPairs.length, 3) - 1 && " · "}
            </span>
          ))}
          {tally.conflictPairs.length > 3 && ` +${tally.conflictPairs.length - 3} more`}
        </div>
      )}
      {/* AI insight */}
      {insight && (
        <div className="flex items-center gap-2 mt-1.5">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: SIGNAL_COLORS[insight.signal] || MUSTARD }}
          />
          <p className="text-xs font-medium" style={{ color: RUST, opacity: 0.7 }}>
            {insight.insight}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Update VoteSection to accept and pass insights**

Replace the `VoteSection` function with:

```tsx
function VoteSection({
  title,
  subtitle,
  tallies,
  insights,
}: {
  title: string;
  subtitle: string;
  tallies: VoteTally[];
  insights: ItemInsight[];
}) {
  if (tallies.length === 0) {
    return (
      <section className="mb-10">
        <SectionHeader title={title} subtitle={subtitle} />
        <p className="text-sm font-medium" style={{ color: RUST, opacity: 0.5 }}>
          No votes yet.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <SectionHeader title={title} subtitle={subtitle} />
      {tallies.map((tally) => (
        <VoteBar
          key={tally.id}
          tally={tally}
          insight={insights.find((i) => i.itemId === tally.id)}
        />
      ))}
    </section>
  );
}
```

- [ ] **Step 6: Update ParticipantTracker with remind/copy buttons and relative time**

Replace the entire `ParticipantTracker` function with:

```tsx
function ParticipantTracker({
  participants,
  tripId,
}: {
  participants: Participant[];
  tripId: string;
}) {
  const completed = participants.filter((p) => p.status === "completed").length;
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const statusEmoji: Record<string, string> = {
    completed: "✅",
    in_progress: "✏️",
    invited: "📩",
  };

  const relativeTime = (isoDate: string) => {
    const days = Math.floor(
      (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return "today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  const canRemind = (p: Participant) => {
    if (p.status === "completed") return false;
    if (sentIds.has(p.id)) return false;
    if (p.lastRemindedAt) {
      const hours =
        (Date.now() - new Date(p.lastRemindedAt).getTime()) / (1000 * 60 * 60);
      return hours >= 24;
    }
    return true;
  };

  const handleRemind = async (p: Participant) => {
    try {
      const res = await fetch(`/api/trips/${tripId}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: p.id }),
      });
      if (res.ok) {
        setSentIds((prev) => new Set(prev).add(p.id));
      }
    } catch {
      // silently fail
    }
  };

  const handleCopyLink = (p: Participant) => {
    const url = `${window.location.origin}/trips/${tripId}/intake`;
    navigator.clipboard.writeText(url);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      style={{
        backgroundColor: CARD_BG,
        border: `1.5px solid ${RUST}`,
        borderRadius: "2px",
        padding: "1.25rem",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p
          className="font-black uppercase text-sm tracking-wide"
          style={{
            color: RUST,
            fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
          }}
        >
          Responses
        </p>
        <p className="text-sm font-bold" style={{ color: RUST }}>
          {completed} of {participants.length} completed
        </p>
      </div>
      <div className="space-y-2">
        {participants.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm">{statusEmoji[p.status] || "📩"}</span>
              <span
                className="text-sm font-semibold truncate"
                style={{
                  color: p.status === "completed" ? RUST : RUST,
                  opacity: p.status === "invited" ? 0.5 : 1,
                }}
              >
                {p.name}
              </span>
              {p.status !== "completed" && (
                <span className="text-xs" style={{ color: RUST, opacity: 0.4 }}>
                  · {relativeTime(p.createdAt)}
                </span>
              )}
            </div>
            {p.status !== "completed" && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRemind(p)}
                  disabled={!canRemind(p)}
                  className="text-xs font-bold px-2 py-1 disabled:opacity-30"
                  style={{
                    color: CREAM,
                    backgroundColor: RUST,
                    borderRadius: "2px",
                  }}
                >
                  {sentIds.has(p.id) ? "Sent!" : "Remind"}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyLink(p)}
                  className="text-xs font-bold px-2 py-1"
                  style={{
                    color: RUST,
                    border: `1px solid ${RUST}`,
                    borderRadius: "2px",
                  }}
                >
                  {copiedId === p.id ? "Copied!" : "Link"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Add SchedulePreviewCard component**

Add this new component before the `DashboardContent` export:

```tsx
function SchedulePreviewCard({ schedule }: { schedule: ScheduleDay[] }) {
  if (schedule.length === 0) return null;

  return (
    <div className="space-y-4">
      {schedule.map((day) => (
        <div
          key={day.dayNumber}
          style={{
            backgroundColor: CARD_BG,
            border: `1.5px solid ${RUST}`,
            borderRadius: "2px",
            padding: "1rem",
          }}
        >
          <p
            className="font-black uppercase text-sm mb-2"
            style={{
              color: RUST,
              fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
            }}
          >
            Day {day.dayNumber} — {day.date}
          </p>
          <div className="space-y-1.5">
            {day.slots.map((slot, i) => (
              <div key={i} className="flex items-start gap-2">
                <span
                  className="text-xs font-bold uppercase shrink-0 w-16 mt-0.5"
                  style={{ color: RUST, opacity: 0.5 }}
                >
                  {slot.time}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: SIGNAL_COLORS[slot.signal] || MUSTARD,
                      }}
                    />
                    <span className="text-sm font-semibold" style={{ color: RUST }}>
                      {slot.activity}
                    </span>
                  </div>
                  {slot.note && (
                    <p className="text-xs mt-0.5 ml-3.5" style={{ color: RUST, opacity: 0.6 }}>
                      {slot.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Add AIToolsSection component**

Add this component before `DashboardContent`:

```tsx
function AIToolsSection({ tripId }: { tripId: string }) {
  const [insights, setInsights] = useState<ItemInsight[]>([]);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const handleAnalyze = async () => {
    setLoadingInsights(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/insights`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch { /* */ }
    setLoadingInsights(false);
  };

  const handleSchedule = async () => {
    setLoadingSchedule(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/schedule-preview`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSchedule(data);
      }
    } catch { /* */ }
    setLoadingSchedule(false);
  };

  const handleSummary = async () => {
    setLoadingSummary(true);
    setSummary("");
    try {
      const res = await fetch(`/api/trips/${tripId}/summary`, { method: "POST" });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setSummary(text);
      }
    } catch {
      setSummary("Failed to generate summary.");
    }
    setLoadingSummary(false);
  };

  const btnStyle = {
    backgroundColor: CARD_BG,
    color: RUST,
    border: `1.5px solid ${RUST}`,
    borderRadius: "2px",
    fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
    letterSpacing: "0.05em",
    boxShadow: `0 3px 0 ${RUST}`,
  };

  return { insights, schedule, summary, loadingInsights, loadingSchedule, loadingSummary, handleAnalyze, handleSchedule, handleSummary, btnStyle };
}
```

Wait — this won't work as a component since it needs to pass `insights` up to `VoteSection`. Let me restructure. The state should live in `DashboardContent` and the AI Tools section is just buttons.

Replace the above with nothing (delete `AIToolsSection`). Instead, add the state and handlers directly in `DashboardContent`.

- [ ] **Step 8 (revised): Restructure DashboardContent with AI state**

Replace the entire `DashboardContent` export function with:

```tsx
export function DashboardContent({
  tripId,
  tripDestination,
  tripStartDate,
  tripEndDate,
  tripStatus,
  participants,
  votes,
}: Props) {
  const [insights, setInsights] = useState<ItemInsight[]>([]);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const handleAnalyze = async () => {
    setLoadingInsights(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/insights`, { method: "POST" });
      if (res.ok) setInsights(await res.json());
    } catch { /* */ }
    setLoadingInsights(false);
  };

  const handleSchedule = async () => {
    setLoadingSchedule(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/schedule-preview`, { method: "POST" });
      if (res.ok) setSchedule(await res.json());
    } catch { /* */ }
    setLoadingSchedule(false);
  };

  const handleSummary = async () => {
    setLoadingSummary(true);
    setSummary("");
    try {
      const res = await fetch(`/api/trips/${tripId}/summary`, { method: "POST" });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setSummary(text);
      }
    } catch {
      setSummary("Failed to generate summary.");
    }
    setLoadingSummary(false);
  };

  const aiBtnClass = "font-black uppercase text-sm py-3 px-5 transition-all active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed";
  const aiBtnStyle = {
    backgroundColor: CARD_BG,
    color: RUST,
    border: `1.5px solid ${RUST}`,
    borderRadius: "2px",
    fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
    letterSpacing: "0.05em",
    boxShadow: `0 3px 0 ${RUST}`,
  };

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      <RetroHeader
        destination={tripDestination}
        startDate={tripStartDate}
        endDate={tripEndDate}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        {/* Participant Tracker */}
        <section className="mb-10">
          <ParticipantTracker participants={participants} tripId={tripId} />
        </section>

        {/* Vote Breakdown */}
        <VoteSection
          title="Activities"
          subtitle="Sorted by group enthusiasm — yes counts most, fine counts half."
          tallies={votes.activities}
          insights={insights}
        />

        <VoteSection
          title="Restaurants"
          subtitle="Dinner spots the group voted on."
          tallies={votes.restaurants}
          insights={insights}
        />

        <VoteSection
          title="Private Chefs"
          subtitle="In-house chef options."
          tallies={votes.chefs}
          insights={insights}
        />

        {/* AI Tools */}
        <section className="mb-10">
          <SectionHeader
            title="AI Tools"
            subtitle="Let Claude help you make sense of the votes."
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loadingInsights}
              className={aiBtnClass}
              style={aiBtnStyle}
            >
              {loadingInsights ? "Analyzing…" : insights.length > 0 ? "Re-analyze Votes" : "Analyze Votes"}
            </button>
            <button
              type="button"
              onClick={handleSchedule}
              disabled={loadingSchedule}
              className={aiBtnClass}
              style={aiBtnStyle}
            >
              {loadingSchedule ? "Planning…" : schedule.length > 0 ? "Re-preview Schedule" : "Preview Schedule"}
            </button>
            <button
              type="button"
              onClick={handleSummary}
              disabled={loadingSummary}
              className={aiBtnClass}
              style={aiBtnStyle}
            >
              {loadingSummary ? "Generating…" : summary !== null ? "Regenerate Summary" : "Generate Summary"}
            </button>
          </div>
        </section>

        {/* Schedule Preview */}
        {schedule.length > 0 && (
          <section className="mb-10">
            <SectionHeader
              title="Schedule Preview"
              subtitle="A rough day-by-day framework based on votes. Not the final itinerary."
            />
            <SchedulePreviewCard schedule={schedule} />
          </section>
        )}

        {/* AI Summary */}
        {summary !== null && (
          <section className="mb-10">
            <SectionHeader
              title="AI Summary"
              subtitle="Claude's take on what the group wants."
            />
            <div
              className="p-5 text-sm leading-relaxed whitespace-pre-wrap font-medium"
              style={{
                backgroundColor: CARD_BG,
                border: `1.5px solid ${RUST}`,
                borderRadius: "2px",
                color: RUST,
              }}
            >
              {summary || "Generating…"}
            </div>
          </section>
        )}

        {/* Suggestions */}
        {votes.openTextEntries.length > 0 && (
          <section className="mb-10">
            <SectionHeader
              title="Suggestions"
              subtitle="Free-form ideas from the group."
            />
            <div className="space-y-3">
              {votes.openTextEntries.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: CARD_BG,
                    border: `1.5px solid ${RUST}`,
                    borderRadius: "2px",
                    padding: "1rem",
                  }}
                >
                  <p
                    className="text-sm font-bold uppercase tracking-wide mb-1"
                    style={{ color: RUST, opacity: 0.5 }}
                  >
                    {entry.name}
                  </p>
                  <p
                    className="text-sm leading-relaxed font-medium"
                    style={{ color: RUST }}
                  >
                    {entry.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Generate Itinerary */}
        <section className="pb-16">
          <GenerateItineraryButton
            tripId={tripId}
            tripStatus={tripStatus}
            completedCount={votes.completedCount}
          />
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Remove the old AISummarySection component**

Delete the entire `AISummarySection` function from the file (it's been replaced by the inline summary handling in `DashboardContent`).

- [ ] **Step 10: Verify it compiles**

Run: `cd /Users/andrew/Projects/planner && npx tsc --noEmit 2>&1 | head -30`

Expected: No errors.

- [ ] **Step 11: Verify build**

Run: `cd /Users/andrew/Projects/planner && npm run build 2>&1 | tail -20`

Expected: Build succeeds.

- [ ] **Step 12: Commit**

```bash
git add src/app/trips/[id]/dashboard/dashboard-content.tsx
git commit -m "feat: add conflict badges, AI insights, schedule preview, remind/copy to dashboard

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Production Build + Deploy

- [ ] **Step 1: Full production build**

Run: `cd /Users/andrew/Projects/planner && npm run build 2>&1 | tail -30`

Expected: Build succeeds. New routes visible: `/api/trips/[id]/insights`, `/api/trips/[id]/schedule-preview`, `/api/trips/[id]/remind`.

- [ ] **Step 2: Push to GitHub**

```bash
cd /Users/andrew/Projects/planner && git push origin master
```

- [ ] **Step 3: Verify Vercel deployment**

Wait for build. Check: `https://planner-sooty-theta.vercel.app/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/dashboard`

Verify:
- Conflict "Split" badges appear on items with yes+pass votes
- "Analyze Votes" button works and shows inline insights per item
- "Preview Schedule" button shows day-by-day cards
- "Generate Summary" button streams narrative
- Participant tracker shows "Remind" and "Link" buttons for non-completed participants
- Relative time shown for non-responders
