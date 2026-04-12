import { db } from "@/db";
import { trips } from "@/db/schema";
import type { GroupConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const database = db();

  // Verify trip ownership
  const [trip] = await database
    .select({ id: trips.id, ownerId: trips.ownerId })
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) {
    return Response.json({ error: "Trip not found" }, { status: 404 });
  }
  if (trip.ownerId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { groupConfig: GroupConfig };
  if (!body.groupConfig || !Array.isArray(body.groupConfig.households)) {
    return Response.json({ error: "Invalid group config" }, { status: 400 });
  }

  // Recompute totals from households
  const totalAdults = body.groupConfig.households.reduce(
    (sum, h) => sum + h.adults.length,
    0
  );
  const totalKids = body.groupConfig.households.reduce(
    (sum, h) => sum + h.kids.length,
    0
  );

  const groupConfig: GroupConfig = {
    households: body.groupConfig.households,
    totalAdults,
    totalKids,
  };

  await database
    .update(trips)
    .set({ groupConfig, updatedAt: new Date() })
    .where(eq(trips.id, id));

  return Response.json({ groupConfig });
}
