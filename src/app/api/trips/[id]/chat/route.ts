import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, participants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ai } from "@/lib/ai/client";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

type OnboardingPath = "brainstorm" | "draft" | "research";

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
  const { message, path } = body as {
    message: string;
    path?: OnboardingPath;
  };

  if (!message?.trim()) {
    return new Response("Message is required", { status: 400 });
  }

  const database = db();

  // Load trip
  const [trip] = await database
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) {
    return new Response("Trip not found", { status: 404 });
  }

  // Verify caller is owner
  if (trip.ownerId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // Count participants for context
  const participantList = await database
    .select()
    .from(participants)
    .where(and(eq(participants.tripId, id)));

  const participantCount = participantList.length;

  // Determine onboarding path
  const resolvedPath: OnboardingPath =
    trip.onboardingPath ?? path ?? "brainstorm";

  // Build updates for trip
  const updates: Partial<typeof trips.$inferSelect> = {
    updatedAt: new Date(),
  };

  if (!trip.onboardingPath) {
    updates.onboardingPath = resolvedPath;
  }

  if (trip.status === "draft") {
    updates.status = "onboarding";
  }

  // Apply updates if needed
  if (Object.keys(updates).length > 1) {
    await database.update(trips).set(updates).where(eq(trips.id, id));
  }

  // Build messages array
  const existingConversation = (trip.onboardingConversation ?? []) as Array<{
    role: string;
    content: string;
  }>;
  const messages: MessageParam[] = [
    ...existingConversation.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  // Build system prompt
  const systemPrompt = buildSystemPrompt(trip, resolvedPath, participantCount);

  // Call Claude with streaming
  const response = await ai().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    stream: true,
    system: systemPrompt,
    messages,
  });

  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
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

      // Detect onboarding completion marker
      const COMPLETION_MARKER = "[ONBOARDING_COMPLETE]";
      const isComplete = fullResponse.includes(COMPLETION_MARKER);
      const storedResponse = isComplete
        ? fullResponse.replace(COMPLETION_MARKER, "").trim()
        : fullResponse;

      // Fire-and-forget DB write after stream completes
      const updatedConversation = [
        ...existingConversation,
        { role: "user", content: message },
        { role: "assistant", content: storedResponse },
      ];

      const dbUpdate: Partial<typeof trips.$inferSelect> = {
        onboardingConversation: updatedConversation,
        updatedAt: new Date(),
      };

      if (isComplete) {
        dbUpdate.status = "intake";
      }

      db()
        .update(trips)
        .set(dbUpdate)
        .where(eq(trips.id, id))
        .catch((err) => console.error("Failed to save conversation:", err));
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const [trip] = await db()
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) {
    return new Response("Trip not found", { status: 404 });
  }

  if (trip.ownerId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  return Response.json({
    conversation: trip.onboardingConversation ?? [],
    path: trip.onboardingPath,
    status: trip.status,
  });
}
