import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { trips, itineraries, itineraryBlocks } from "@/db/schema";
import type { GroupConfig } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { BookingCheckbox } from "./booking-checkbox";

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
  const raw = startDate instanceof Date ? startDate : new Date(startDate);
  if (Number.isNaN(raw.getTime())) return null;
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

// Auto-link phones, emails, URLs in plain text. Returns React nodes.
function linkify(text: string): React.ReactNode[] {
  // One regex catches all three; iterate matches in order.
  const pattern =
    /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})|([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|((?:https?:\/\/|www\.)[^\s,)]+)/gi;
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  text.replace(pattern, (match, phone, email, url, offset: number) => {
    if (offset > last) out.push(text.slice(last, offset));
    if (phone) {
      const tel = phone.replace(/[^\d]/g, "");
      out.push(
        <a
          key={key++}
          href={`tel:${tel}`}
          className="font-bold underline"
          style={{ color: RUST, fontSize: "1.05em" }}
        >
          {phone}
        </a>
      );
    } else if (email) {
      out.push(
        <a
          key={key++}
          href={`mailto:${email}`}
          className="font-bold underline"
          style={{ color: RUST }}
        >
          {email}
        </a>
      );
    } else if (url) {
      const href = url.startsWith("http") ? url : `https://${url}`;
      out.push(
        <a
          key={key++}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold underline"
          style={{ color: RUST }}
        >
          {url}
        </a>
      );
    }
    last = offset + match.length;
    return match;
  });
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// Split notes into a "Going" line + the rest, since "Going (NA + NK): names"
// is now structurally important.
function splitGoing(notes: string): {
  going: string | null;
  rest: string;
} {
  const lines = notes.split("\n");
  const goingIdx = lines.findIndex((l) => /^Going \(/.test(l));
  if (goingIdx === -1) return { going: null, rest: notes };
  const going = lines[goingIdx];
  const rest = lines
    .filter((_, i) => i !== goingIdx)
    .join("\n")
    .trim();
  return { going, rest };
}

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

  const byDay = new Map<number, typeof blocks>();
  for (const b of blocks) {
    const list = byDay.get(b.dayNumber) ?? [];
    list.push(b);
    byDay.set(b.dayNumber, list);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b);

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
        <div className="mb-10">
          <Link
            href={`/trips/${id}/share`}
            className="text-xs uppercase tracking-widest"
            style={{ color: INK_MUTED }}
          >
            ← Itinerary
          </Link>
          <h1
            className="font-extrabold text-5xl sm:text-6xl mt-2 leading-none"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Bookings
          </h1>
          <p
            className="text-lg mt-3 leading-relaxed"
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
                {formatDayDate(getDayDate(trip.endDate, 1)!).replace(
                  /^[A-Za-z]+, /,
                  ""
                )}
                {", "}
                {getDayDate(trip.endDate, 1)!.getFullYear()}
              </>
            )}
          </p>

          {groupConfig && (
            <div
              className="mt-5 p-4 rounded-lg leading-relaxed"
              style={{ backgroundColor: CARD_BG, color: INK }}
            >
              <span
                className="text-xs uppercase tracking-widest font-semibold"
                style={{ color: INK_MUTED }}
              >
                Group · {groupConfig.totalAdults}A + {groupConfig.totalKids}K
              </span>
              <div className="mt-1 text-base">
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

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-base">
            {(Object.keys(STATUS_META) as ResStatus[]).map((k) => (
              <span key={k} style={{ color: STATUS_META[k].color }}>
                {STATUS_META[k].icon} {STATUS_META[k].label}
                {counts[k] ? ` · ${counts[k]}` : ""}
              </span>
            ))}
          </div>
        </div>

        {/* Days */}
        <div className="space-y-14">
          {days.map((day) => {
            const dayBlocks = byDay.get(day)!;
            const date = getDayDate(trip.startDate, day);
            const dateLabel = date ? formatDayDate(date) : `Day ${day}`;

            const showable = dayBlocks.filter(
              (b) => b.reservationStatus !== null
            );
            if (showable.length === 0) return null;

            return (
              <section key={day}>
                {/* Big day heading */}
                <header
                  className="mb-5 pb-3"
                  style={{ borderBottom: `3px solid ${RUST}` }}
                >
                  <div
                    className="text-sm uppercase tracking-widest font-bold"
                    style={{ color: RUST }}
                  >
                    Day {day}
                  </div>
                  <h2
                    className="font-extrabold text-4xl sm:text-5xl leading-tight mt-1"
                    style={{ fontFamily: "var(--font-outfit)" }}
                  >
                    {dateLabel}
                  </h2>
                </header>

                <div className="space-y-4">
                  {showable.map((b) => {
                    const status = (b.reservationStatus ??
                      "unknown") as ResStatus;
                    const meta = STATUS_META[status];
                    const isQuiet = status === "not_needed";
                    const showCheckbox =
                      status === "needed" || status === "booked";
                    const notes = b.reservationNotes ?? "";
                    const { going, rest } = splitGoing(notes);
                    // "Going (5A + 2K): names" — strip the prefix for the value column.
                    const goingValue = going
                      ? going.replace(/^Going \([^)]+\):\s*/, "")
                      : null;

                    return (
                      <article
                        key={b.id}
                        className="rounded-xl p-5 sm:p-6"
                        style={{
                          backgroundColor: CARD_BG,
                          opacity: isQuiet ? 0.65 : 1,
                          border:
                            status === "booked"
                              ? `2px solid #1F8A4D`
                              : "2px solid transparent",
                        }}
                      >
                        {/* Title row */}
                        <div className="flex items-start gap-3">
                          <span
                            className="text-2xl leading-none"
                            style={{ marginTop: 2 }}
                          >
                            {meta.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h3
                              className="font-extrabold text-xl sm:text-2xl leading-tight"
                              style={{ fontFamily: "var(--font-outfit)" }}
                            >
                              {b.title}
                            </h3>
                            <div
                              className="mt-1 text-sm uppercase tracking-wider font-bold"
                              style={{ color: meta.color }}
                            >
                              {meta.label}
                              {b.startTime && (
                                <span style={{ color: INK_MUTED }}>
                                  {"  ·  "}
                                  {formatTime(b.startTime)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Structured fields */}
                        {!isQuiet && (
                          <dl className="mt-5 space-y-4">
                            {(b.adultCount || b.kidCount) && (
                              <Field label="Going">
                                <span className="font-bold text-lg">
                                  {b.adultCount ?? 0}A
                                  {b.kidCount ? ` + ${b.kidCount}K` : ""}
                                </span>
                                {goingValue && (
                                  <span
                                    className="block text-base mt-1"
                                    style={{ color: INK }}
                                  >
                                    {goingValue}
                                  </span>
                                )}
                              </Field>
                            )}

                            {b.bookingWindow && (
                              <Field label="When to book">
                                <span className="text-base">
                                  {linkify(b.bookingWindow)}
                                </span>
                              </Field>
                            )}

                            {rest && (
                              <Field label="Notes">
                                <span
                                  className="text-base whitespace-pre-line"
                                  style={{ color: INK }}
                                >
                                  {linkify(rest)}
                                </span>
                              </Field>
                            )}
                          </dl>
                        )}

                        {/* Checkbox */}
                        {showCheckbox && (
                          <div
                            className="mt-5 pt-4"
                            style={{
                              borderTop: `1px solid rgba(122, 98, 84, 0.25)`,
                            }}
                          >
                            <BookingCheckbox
                              tripId={id}
                              blockId={b.id}
                              initialStatus={status as "needed" | "booked"}
                            />
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-16 text-sm" style={{ color: INK_MUTED }}>
          Live tracker — anyone with the link can mark items booked. Refresh to
          see latest.
        </p>
      </div>
    </main>
  );
}

// Inline label/value field used inside each booking card.
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt
        className="text-xs uppercase tracking-widest font-bold"
        style={{ color: INK_MUTED }}
      >
        {label}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
