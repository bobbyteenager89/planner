import { db } from "@/db";
import {
  trips,
  itineraries,
  itineraryBlocks,
  opsItems,
} from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";

const STATUS_LABEL: Record<string, string> = {
  not_needed: "no reservation needed",
  walk_in: "walk-in",
  needed: "RESERVATION NEEDED",
  booked: "booked",
  unknown: "unknown — research needed",
};

const TODO_STATUS_LABEL: Record<string, string> = {
  todo: "[ ]",
  doing: "[~]",
  done: "[x]",
  blocked: "[!]",
};

function fmtCounts(adults: number | null, kids: number | null): string {
  if (adults == null && kids == null) return "";
  const a = adults ?? 0;
  const k = kids ?? 0;
  if (a === 0 && k === 0) return "";
  const parts: string[] = [];
  if (a > 0) parts.push(`${a}A`);
  if (k > 0) parts.push(`${k}K`);
  return ` — **${parts.join("+")}** (${a + k} total)`;
}

export async function generateOpsMarkdown(tripId: string): Promise<string> {
  const database = db();

  const [trip] = await database
    .select()
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1);
  if (!trip) throw new Error("Trip not found");

  const [itinerary] = await database
    .select()
    .from(itineraries)
    .where(eq(itineraries.tripId, tripId))
    .orderBy(desc(itineraries.version))
    .limit(1);
  if (!itinerary) throw new Error("No itinerary");

  const blocks = await database
    .select()
    .from(itineraryBlocks)
    .where(eq(itineraryBlocks.itineraryId, itinerary.id))
    .orderBy(
      asc(itineraryBlocks.dayNumber),
      asc(itineraryBlocks.sortOrder)
    );

  const ops = await database
    .select()
    .from(opsItems)
    .where(eq(opsItems.tripId, tripId))
    .orderBy(asc(opsItems.ownerName), asc(opsItems.createdAt));

  const lines: string[] = [];

  // Header
  lines.push(`# ${trip.title} — Ops Doc`);
  lines.push("");
  lines.push(`> Trip ID: \`${tripId}\``);
  lines.push(`> Generated: ${new Date().toISOString()}`);
  if (trip.startDate && trip.endDate) {
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    lines.push(`> Dates: ${fmt(trip.startDate)} → ${fmt(trip.endDate)}`);
  }
  if (trip.destination) {
    lines.push(`> Destination: ${trip.destination}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  // Group composition
  lines.push("## Group");
  lines.push("");

  const gc = trip.groupConfig as import("@/db/schema").GroupConfig | null;
  if (gc && gc.households.length > 0) {
    const tA = gc.totalAdults;
    const tK = gc.totalKids;
    lines.push(`**${tA} adult${tA !== 1 ? "s" : ""} + ${tK} kid${tK !== 1 ? "s" : ""} = ${tA + tK} total**`);
    lines.push("");
    for (const h of gc.households) {
      const members = [...h.adults];
      for (const kid of h.kids) {
        members.push(`${kid} (kid)`);
      }
      lines.push(`- ${h.label}: ${members.join(", ")}`);
    }
  } else {
    // Fallback for trips without group config
    lines.push("**7 adults + 2 kids = 9 total**");
    lines.push("");
    lines.push("- Jeff & Sharon (grandparents / planners)");
    lines.push("- Clark & Alicia + Andie (kid) + Piper (kid)");
    lines.push("- Andrew (solo)");
    lines.push("- Maddie (solo)");
    lines.push("- Corban (solo)");
  }
  lines.push("");
  lines.push(
    "_Note: Kids are always with their household. Headcounts assume the full party unless overridden on a block._"
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  // Day-by-day
  lines.push("## Itinerary — by day");
  lines.push("");
  const days = Array.from(new Set(blocks.map((b) => b.dayNumber))).sort(
    (a, b) => a - b
  );
  for (const day of days) {
    lines.push(`### Day ${day}`);
    lines.push("");
    const dayBlocks = blocks.filter((b) => b.dayNumber === day);
    for (const b of dayBlocks) {
      const counts = fmtCounts(b.adultCount, b.kidCount);
      const status = b.reservationStatus
        ? STATUS_LABEL[b.reservationStatus] ?? b.reservationStatus
        : "—";
      lines.push(`- **${b.title}**${counts}`);
      if (b.location) lines.push(`  - 📍 ${b.location}`);
      lines.push(`  - Reservation: ${status}`);
      if (b.bookingWindow) lines.push(`  - Booking window: ${b.bookingWindow}`);
      if (b.reservationNotes) lines.push(`  - Notes: ${b.reservationNotes}`);
    }
    lines.push("");
  }
  lines.push("---");
  lines.push("");

  // Todos grouped by owner
  lines.push("## To-do — by owner");
  lines.push("");
  const owners = Array.from(new Set(ops.map((o) => o.ownerName)));
  for (const owner of owners) {
    const ownerOps = ops.filter((o) => o.ownerName === owner);
    lines.push(`### ${owner}`);
    lines.push("");
    for (const o of ownerOps) {
      const check = TODO_STATUS_LABEL[o.status] ?? "[ ]";
      lines.push(`- ${check} **${o.title}** \`${o.id}\``);
      if (o.description) lines.push(`  - ${o.description}`);
      if (o.confirmation) lines.push(`  - ✅ Confirmation: ${o.confirmation}`);
      if (o.notes) lines.push(`  - 📝 ${o.notes}`);
      if (o.status === "blocked") lines.push(`  - ⚠️ BLOCKED`);
    }
    lines.push("");
  }
  lines.push("---");
  lines.push("");

  // Open questions / status summary
  const todoCount = ops.filter((o) => o.status === "todo").length;
  const doingCount = ops.filter((o) => o.status === "doing").length;
  const doneCount = ops.filter((o) => o.status === "done").length;
  const blockedCount = ops.filter((o) => o.status === "blocked").length;
  lines.push("## Status");
  lines.push("");
  lines.push(`- ${todoCount} todo · ${doingCount} doing · ${doneCount} done · ${blockedCount} blocked`);
  lines.push("");

  // Cowork instructions
  lines.push("## For Claude Cowork");
  lines.push("");
  lines.push("Update items via:");
  lines.push("");
  lines.push("```");
  lines.push("POST https://planner-sooty-theta.vercel.app/api/trips/" + tripId + "/ops/update");
  lines.push("Authorization: Bearer <token>");
  lines.push("Content-Type: application/json");
  lines.push("");
  lines.push("{");
  lines.push('  "updates": [');
  lines.push('    { "id": "<ops_item_id>", "status": "done", "confirmation": "Conf# 12345", "notes": "Booked for 6pm" }');
  lines.push("  ]");
  lines.push("}");
  lines.push("```");
  lines.push("");
  lines.push("Allowed status values: `todo | doing | done | blocked`");
  lines.push("All fields except `id` are optional. Send only what changed.");
  lines.push("");

  return lines.join("\n");
}
