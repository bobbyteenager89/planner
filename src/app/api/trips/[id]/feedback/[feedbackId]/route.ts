import { db } from "@/db";
import { feedbackItems } from "@/db/schema-feedback";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; feedbackId: string }> }
) {
  const { feedbackId } = await params;
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
