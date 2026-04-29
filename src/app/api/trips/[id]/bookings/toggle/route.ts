import { db } from "@/db";
import { itineraryBlocks, itineraries } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

const ALLOWED_STATUSES = ["needed", "booked"] as const;
type Status = (typeof ALLOWED_STATUSES)[number];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  let body: { blockId?: string; status?: Status };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const blockId = body.blockId;
  const status = body.status;
  if (!blockId || !status || !ALLOWED_STATUSES.includes(status)) {
    return Response.json(
      { error: "blockId and status (needed|booked) required" },
      { status: 400 }
    );
  }

  const database = db();

  // Verify the block belongs to this trip (prevent cross-trip writes from a guessed link).
  const tripItins = await database
    .select({ id: itineraries.id })
    .from(itineraries)
    .where(eq(itineraries.tripId, tripId));
  if (tripItins.length === 0) {
    return Response.json({ error: "Trip not found" }, { status: 404 });
  }

  const itinIds = tripItins.map((r) => r.id);
  const [block] = await database
    .select({ id: itineraryBlocks.id })
    .from(itineraryBlocks)
    .where(
      and(
        eq(itineraryBlocks.id, blockId),
        inArray(itineraryBlocks.itineraryId, itinIds)
      )
    )
    .limit(1);
  if (!block) {
    return Response.json(
      { error: "Block not in this trip" },
      { status: 404 }
    );
  }

  await database
    .update(itineraryBlocks)
    .set({ reservationStatus: status })
    .where(eq(itineraryBlocks.id, blockId));

  return Response.json({ ok: true, blockId, status });
}
