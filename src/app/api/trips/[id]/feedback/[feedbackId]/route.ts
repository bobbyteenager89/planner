import { db } from "@/db";
import { feedbackItems } from "@/db/schema-feedback";
import { trips } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; feedbackId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tripId, feedbackId } = await params;

  // Verify trip ownership
  const [trip] = await db().select().from(trips).where(eq(trips.id, tripId));
  if (!trip || trip.ownerId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { status, adminNote } = body;

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (adminNote !== undefined) updates.adminNote = adminNote;

  const [updated] = await db()
    .update(feedbackItems)
    .set(updates)
    .where(eq(feedbackItems.id, feedbackId))
    .returning();

  if (!updated) {
    return Response.json({ error: "Feedback item not found" }, { status: 404 });
  }

  return Response.json(updated);
}
