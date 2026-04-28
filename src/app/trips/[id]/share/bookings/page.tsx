import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { trips, itineraries, itineraryBlocks } from "@/db/schema";
import type { GroupConfig } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
// Color tokens (duplicated from itinerary-shared, which is client-only).
const INK = "#3B1A0F";
const INK_MUTED = "#7A6254";
const RUST = "#D14F36";
const CREAM = "#F3EBE0";
const CARD_BG = "#EBE1D3";

function getDayDate(
  startDate: Date | string | null,
  dayNumber: number
): Date | null {
  if (!startDate) return null;
  const raw =
    startDate instanceof Date ? startDate : new Date(startDate);
  if (Number.isNaN(raw.getTime())) return null;
  // Use UTC components: trip dates are stored as midnight in trip-local TZ,
  // which serializes to a UTC offset. Reading UTC components gives back the
  // intended calendar date regardless of viewer TZ.
  return new Date(
    raw.getUTCFullYear(),
    raw.getUTCMonth(),
    raw.getUTCDate() + dayNumber - 1
  );
}

function formatDayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export const dynamic = "force-dynamic";

type ResStatus = "not_needed" | "walk_in" | "needed" | "booked" | "unknown";

const STATUS_META: Record<
  ResStatus,
  { icon: string; label: string; color: string }
> = {
  booked: { icon: "✅", label: "Booked", color: "#1F8A4D" },
  needed: { icon: "🟡", label: "Needs booking", color: "#C57A00" },
  walk_in: { icon: "🟢", label: "Walk-in", color: "#3F7A1A" },
  not_needed: { icon: "⚪", label: "No booking needed", color: INK_MUTED },
  unknown: { icon: "❓", label: "TBD", color: INK_MUTED },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Bookings — Big Sky",
    description: `Booking tracker for trip ${id}`,
  };
}

export default async function BookingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const database = db();

  const [trip] = await database
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);
  if (!trip) notFound();

  const [itinerary] = await database
    .select()
    .from(itineraries)
    .where(eq(itineraries.tripId, id))
    .orderBy(desc(itineraries.version))
    .limit(1);
  if (!itinerary) notFound();

  const blocks = await database
    .select()
    .from(itineraryBlocks)
    .where(eq(itineraryBlocks.itineraryId, itinerary.id))
    .orderBy(asc(itineraryBlocks.dayNumber), asc(itineraryBlocks.sortOrder));

  // Group by day
  const byDay = new Map<number, typeof blocks>();
  for (const b of blocks) {
    const list = byDay.get(b.dayNumber) ?? [];
    list.push(b);
    byDay.set(b.dayNumber, list);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b);

  // Stats
  const counts = blocks.reduce(
    (acc, b) => {
      const s = (b.reservationStatus ?? "unknown") as ResStatus;
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<ResStatus, number>
  );

  const groupConfig = trip.groupConfig as GroupConfig | null;
  const allAdults = groupConfig?.households.flatMap((h) => h.adults) ?? [];
  const allKids = groupConfig?.households.flatMap((h) => h.kids) ?? [];

  return (
    <main
      className="min-h-screen pb-24"
      style={{ backgroundColor: CREAM, color: INK }}
    >
      <div className="max-w-3xl mx-auto px-5 pt-10 sm:pt-14">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/trips/${id}/share`}
            className="text-xs uppercase tracking-widest"
            style={{ color: INK_MUTED }}
          >
            ← Itinerary
          </Link>
          <h1
            className="font-extrabold text-4xl sm:text-5xl mt-2 leading-tight"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Bookings
          </h1>
          <p
            className="text-base mt-2 leading-relaxed"
            style={{ color: INK_MUTED }}
          >
            {trip.title}
            {trip.startDate && trip.endDate && (
              <>
                {" · "}
                {formatDayDate(getDayDate(trip.startDate, 1)!).replace(
                  /^[A-Za-z]+, /,
                  ""
                )}
                {"–"}
                {formatDayDate(
                  getDayDate(trip.endDate, 1)!
                ).replace(/^[A-Za-z]+, /, "")}
                {", "}
                {getDayDate(trip.endDate, 1)!.getFullYear()}
              </>
            )}
          </p>

          {/* Group roster */}
          {groupConfig && (
            <div
              className="mt-4 p-4 rounded-lg text-sm leading-relaxed"
              style={{ backgroundColor: CARD_BG, color: INK }}
            >
              <span
                className="text-xs uppercase tracking-widest font-semibold"
                style={{ color: INK_MUTED }}
              >
                Group · {groupConfig.totalAdults}A + {groupConfig.totalKids}K
              </span>
              <div className="mt-1">
                {allAdults.join(", ")}
                {allKids.length > 0 && (
                  <>
                    {" "}+ <span style={{ color: INK_MUTED }}>kids:</span>{" "}
                    {allKids.join(", ")}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Status legend / counts */}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {(Object.keys(STATUS_META) as ResStatus[]).map((k) => (
              <span key={k} style={{ color: STATUS_META[k].color }}>
                {STATUS_META[k].icon} {STATUS_META[k].label}
                {counts[k] ? ` · ${counts[k]}` : ""}
              </span>
            ))}
          </div>
        </div>

        {/* Days */}
        <div className="space-y-10">
          {days.map((day) => {
            const dayBlocks = byDay.get(day)!;
            const date = getDayDate(trip.startDate, day);
            const dateLabel = date ? formatDayDate(date) : `Day ${day}`;

            // Skip days where every block is not_needed (pure travel/rest day)
            const showable = dayBlocks.filter(
              (b) => b.reservationStatus !== null
            );
            if (showable.length === 0) return null;

            return (
              <section key={day}>
                <header className="mb-3 flex items-baseline gap-3">
                  <span
                    className="text-xs uppercase tracking-widest font-semibold"
                    style={{ color: RUST }}
                  >
                    Day {day}
                  </span>
                  <h2
                    className="font-extrabold text-xl"
                    style={{ fontFamily: "var(--font-outfit)" }}
                  >
                    {dateLabel}
                  </h2>
                </header>

                <div className="space-y-3">
                  {showable.map((b) => {
                    const status = (b.reservationStatus ?? "unknown") as ResStatus;
                    const meta = STATUS_META[status];
                    const isQuiet = status === "not_needed";

                    return (
                      <div
                        key={b.id}
                        className="rounded-lg p-4"
                        style={{
                          backgroundColor: CARD_BG,
                          opacity: isQuiet ? 0.6 : 1,
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl leading-tight">
                            {meta.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <h3 className="font-semibold text-base">
                                {b.title}
                              </h3>
                              {b.startTime && (
                                <span
                                  className="text-xs"
                                  style={{ color: INK_MUTED }}
                                >
                                  {formatTime(b.startTime)}
                                </span>
                              )}
                            </div>

                            <div
                              className="text-xs uppercase tracking-wider mt-1"
                              style={{ color: meta.color }}
                            >
                              {meta.label}
                              {(b.adultCount || b.kidCount) && (
                                <span style={{ color: INK_MUTED }}>
                                  {" · "}
                                  {b.adultCount ?? 0}A
                                  {b.kidCount ? ` + ${b.kidCount}K` : ""}
                                </span>
                              )}
                            </div>

                            {b.bookingWindow && !isQuiet && (
                              <div
                                className="mt-2 text-sm"
                                style={{ color: INK }}
                              >
                                <span
                                  className="text-xs uppercase tracking-wider font-semibold mr-1"
                                  style={{ color: INK_MUTED }}
                                >
                                  When
                                </span>
                                {b.bookingWindow}
                              </div>
                            )}

                            {b.reservationNotes && (
                              <div
                                className="mt-2 text-sm leading-relaxed"
                                style={{ color: INK }}
                              >
                                <span
                                  className="text-xs uppercase tracking-wider font-semibold mr-1"
                                  style={{ color: INK_MUTED }}
                                >
                                  Notes
                                </span>
                                {b.reservationNotes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <p
          className="mt-12 text-xs"
          style={{ color: INK_MUTED }}
        >
          Live tracker — refresh anytime to see latest status.
        </p>
      </div>
    </main>
  );
}
