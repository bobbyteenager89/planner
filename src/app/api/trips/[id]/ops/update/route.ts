import { db } from "@/db";
import { opsItems, opsTokens } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { hashToken } from "@/lib/ops/auth";

const ALLOWED_STATUSES = ["todo", "doing", "done", "blocked"] as const;
type Status = (typeof ALLOWED_STATUSES)[number];

interface UpdatePatch {
  id: string;
  status?: Status;
  confirmation?: string;
  notes?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;

  // Bearer token auth
  const authHeader = request.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return Response.json({ error: "Missing bearer token" }, { status: 401 });
  }
  const rawToken = match[1].trim();
  const tokenHash = hashToken(rawToken);

  const database = db();
  const [tokenRow] = await database
    .select()
    .from(opsTokens)
    .where(
      and(
        eq(opsTokens.tripId, tripId),
        eq(opsTokens.tokenHash, tokenHash),
        isNull(opsTokens.revokedAt)
      )
    )
    .limit(1);

  if (!tokenRow) {
    return Response.json({ error: "Invalid or revoked token" }, { status: 401 });
  }

  // Parse body
  let body: { updates?: UpdatePatch[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body.updates) || body.updates.length === 0) {
    return Response.json({ error: "Missing updates array" }, { status: 400 });
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const patch of body.updates) {
    if (!patch.id) {
      results.push({ id: "(missing)", ok: false, error: "Missing id" });
      continue;
    }
    if (patch.status && !ALLOWED_STATUSES.includes(patch.status)) {
      results.push({ id: patch.id, ok: false, error: "Invalid status" });
      continue;
    }

    // Verify ops item belongs to this trip (prevents cross-trip writes)
    const [item] = await database
      .select()
      .from(opsItems)
      .where(and(eq(opsItems.id, patch.id), eq(opsItems.tripId, tripId)))
      .limit(1);
    if (!item) {
      results.push({ id: patch.id, ok: false, error: "Not found in this trip" });
      continue;
    }

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.status) update.status = patch.status;
    if (patch.confirmation !== undefined) update.confirmation = patch.confirmation;
    if (patch.notes !== undefined) update.notes = patch.notes;

    await database.update(opsItems).set(update).where(eq(opsItems.id, patch.id));
    results.push({ id: patch.id, ok: true });
  }

  // Mark token as recently used
  await database
    .update(opsTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(opsTokens.id, tokenRow.id));

  const successCount = results.filter((r) => r.ok).length;
  return Response.json({
    ok: true,
    updated: successCount,
    failed: results.length - successCount,
    results,
  });
}
