import { db } from "@/db";
import { households, householdMembers } from "@/db/schema-feedback";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;

  const allHouseholds = await db()
    .select()
    .from(households)
    .where(eq(households.tripId, tripId))
    .orderBy(households.sortOrder);

  const allMembers = await db()
    .select({
      householdId: householdMembers.householdId,
      participantId: householdMembers.participantId,
      participantName: participants.name,
    })
    .from(householdMembers)
    .leftJoin(participants, eq(householdMembers.participantId, participants.id));

  const result = allHouseholds.map((h) => ({
    ...h,
    members: allMembers.filter((m) => m.householdId === h.id),
  }));

  return Response.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const body = await request.json();
  const { name, memberIds } = body as { name: string; memberIds: string[] };

  if (!name || !memberIds?.length) {
    return Response.json(
      { error: "name and memberIds required" },
      { status: 400 }
    );
  }

  const [household] = await db()
    .insert(households)
    .values({ tripId, name })
    .returning();

  for (const participantId of memberIds) {
    await db()
      .insert(householdMembers)
      .values({ householdId: household.id, participantId });
  }

  return Response.json(household, { status: 201 });
}
