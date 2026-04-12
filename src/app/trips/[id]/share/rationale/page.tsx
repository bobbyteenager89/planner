import { db } from "@/db";
import { trips, itineraries, itineraryBlocks } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getRationale } from "@/lib/ai/rationale";
import { auth } from "@/lib/auth";
// NOTE: itinerary-shared is "use client" — we can't call its functions from
// a server component, so the helpers are inlined below.
const INK = "#3B1A0F";
const RUST = "#D14F36";
const MUSTARD = "#EBB644";
const CREAM = "#F3EBE0";
const CARD_BG = "#EBE1D3";

const TYPE_CONFIG: Record<string, { icon: string; label: string; bg: string }> = {
  activity: { icon: "🏔", label: "Activity", bg: MUSTARD },
  meal: { icon: "🍽", label: "Meal", bg: "#E8D5B8" },
  transport: { icon: "🚗", label: "Transport", bg: CARD_BG },
  lodging: { icon: "🏠", label: "Lodging", bg: CARD_BG },
  free_time: { icon: "☀️", label: "Free Time", bg: "#E5DDD0" },
  note: { icon: "📝", label: "Note", bg: CARD_BG },
};

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0
    ? `${hour12} ${period}`
    : `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

function getDayDate(startDate: string | null, dayNumber: number): Date | null {
  if (!startDate) return null;
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNumber - 1);
  return date;
}

function formatDayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getWeekdayShort(startDate: string | null, dayNumber: number): string {
  if (!startDate) return `D${dayNumber}`;
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNumber - 1);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}
import { RegenerateButton } from "./regenerate-button";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: _id } = await params;
  return {
    title: "Itinerary Review — Big Sky",
    description: "The reasoning behind each day and every activity.",
  };
}

export default async function RationalePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ regen?: string }>;
}) {
  const { id } = await params;
  const { regen } = await searchParams;
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

  // Only allow force-regeneration for authenticated trip owners (prevents API credit drain)
  let forceRegen = false;
  if (regen === "1") {
    const session = await auth();
    if (session?.user?.id && trip.ownerId === session.user.id) {
      forceRegen = true;
    }
  }
  const rationale = await getRationale(id, { force: forceRegen });

  const dayNumbers = Array.from(new Set(blocks.map((b) => b.dayNumber))).sort(
    (a, b) => a - b
  );

  const startDateStr = trip.startDate
    ? new Date(trip.startDate).toISOString()
    : null;

  const introLines = (rationale?.intro ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <main
      id="main-content"
      style={{ backgroundColor: CREAM, color: INK, minHeight: "100vh" }}
      className="pb-24"
    >
      {/* ── Hero ── */}
      <header
        className="px-5 sm:px-8 pt-16 pb-12 border-b-2"
        style={{ borderColor: INK }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="text-xs uppercase tracking-[0.2em] mb-4"
            style={{ color: RUST, fontWeight: 700 }}
          >
            For Review
          </div>
          <h1
            className="text-5xl sm:text-6xl font-black leading-none mb-5"
            style={{
              fontFamily: "'Arial Black', Impact, sans-serif",
              color: INK,
            }}
          >
            {trip.title}
          </h1>
          <div className="text-xl" style={{ color: INK }}>
            {trip.destination}
          </div>
          <div
            className="text-lg mt-1"
            style={{ color: "#7A6254" }}
          >
            {trip.startDate && trip.endDate
              ? `${new Date(trip.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${new Date(trip.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
              : null}
          </div>
        </div>
      </header>

      {/* ── Intro / Prefs summary ── */}
      <section className="px-5 sm:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-xs uppercase tracking-[0.2em] mb-4"
            style={{ color: RUST, fontWeight: 700 }}
          >
            Planning Priorities
          </h2>
          <h3
            className="text-3xl font-black mb-6"
            style={{
              fontFamily: "'Arial Black', Impact, sans-serif",
              color: INK,
            }}
          >
            Why this trip looks the way it does
          </h3>
          {rationale ? (
            <div
              className="p-6 space-y-3 text-xl leading-relaxed"
              style={{
                backgroundColor: CARD_BG,
                border: `2px solid ${INK}`,
                borderRadius: 2,
              }}
            >
              {introLines.map((line, i) => {
                const clean = line.replace(/^[-*•]\s*/, "");
                return (
                  <div key={i} className="flex gap-3">
                    <span
                      className="shrink-0 font-bold"
                      style={{ color: RUST }}
                    >
                      ◆
                    </span>
                    <span>{clean}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-lg" style={{ color: "#7A6254" }}>
              Rationale unavailable. Try{" "}
              <a
                href={`/trips/${id}/share/rationale?regen=1`}
                className="underline"
                style={{ color: RUST }}
              >
                regenerating
              </a>
              .
            </p>
          )}
        </div>
      </section>

      {/* ── Who is Going ── */}
      {rationale?.participants && rationale.participants.length > 0 && (
        <section className="px-5 sm:px-8 pb-12">
          <div className="max-w-3xl mx-auto">
            <h2
              className="text-xs uppercase tracking-[0.2em] mb-4"
              style={{ color: RUST, fontWeight: 700 }}
            >
              Who Is Going
            </h2>
            <h3
              className="text-3xl font-black mb-3"
              style={{
                fontFamily: "'Arial Black', Impact, sans-serif",
                color: INK,
              }}
            >
              The crew & what everyone's excited about
            </h3>
            <p
              className="text-base mb-6"
              style={{ color: "#7A6254" }}
            >
              {rationale.participants.reduce(
                (n, p) => n + (p.members?.length ?? 0),
                0
              )}{" "}
              people across {rationale.participants.length} households. Later
              on, everyone will be able to mark which activities they actually
              want to join so we can lock in reservation counts.
            </p>
            <div className="space-y-4">
              {rationale.participants.map((p, i) => (
                <div
                  key={i}
                  className="p-6"
                  style={{
                    backgroundColor: CARD_BG,
                    border: `2px solid ${INK}`,
                    borderRadius: 2,
                  }}
                >
                  <div
                    className="text-2xl font-black mb-1"
                    style={{
                      fontFamily: "'Arial Black', Impact, sans-serif",
                      color: INK,
                    }}
                  >
                    {p.name}
                  </div>
                  {p.members && p.members.length > 0 && (
                    <div
                      className="text-lg mb-3"
                      style={{ color: "#7A6254" }}
                    >
                      {p.members.join(" · ")}
                    </div>
                  )}
                  <div className="space-y-2 text-lg leading-relaxed">
                    {p.likes && (
                      <div>
                        <span
                          className="text-[11px] uppercase tracking-[0.2em] mr-2"
                          style={{ color: RUST, fontWeight: 700 }}
                        >
                          Excited for
                        </span>
                        <span style={{ color: INK }}>{p.likes}</span>
                      </div>
                    )}
                    {p.dislikes && (
                      <div>
                        <span
                          className="text-[11px] uppercase tracking-[0.2em] mr-2"
                          style={{ color: RUST, fontWeight: 700 }}
                        >
                          Passing on
                        </span>
                        <span style={{ color: INK }}>{p.dislikes}</span>
                      </div>
                    )}
                    {p.notes && (
                      <div>
                        <span
                          className="text-[11px] uppercase tracking-[0.2em] mr-2"
                          style={{ color: RUST, fontWeight: 700 }}
                        >
                          Note
                        </span>
                        <span style={{ color: INK }}>{p.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Days ── */}
      <section className="px-5 sm:px-8">
        <div className="max-w-3xl mx-auto">
          {dayNumbers.map((dayNum) => {
            const dayBlocks = blocks.filter((b) => b.dayNumber === dayNum);
            const dayDate = getDayDate(startDateStr, dayNum);
            const dayLogic = rationale?.days?.[String(dayNum)] ?? null;

            return (
              <div key={dayNum} className="mb-16">
                {/* Day header */}
                <div
                  className="border-t-2 pt-6 mb-5"
                  style={{ borderColor: INK }}
                >
                  <div className="flex items-baseline justify-between gap-4 mb-3">
                    <div
                      className="text-xs uppercase tracking-[0.2em]"
                      style={{ color: RUST, fontWeight: 700 }}
                    >
                      Day {dayNum}
                      {dayDate
                        ? ` · ${getWeekdayShort(startDateStr, dayNum)} ${formatDayDate(dayDate)}`
                        : ""}
                    </div>
                  </div>
                </div>

                {/* Day logic */}
                {dayLogic && (
                  <div
                    className="p-6 mb-6 text-xl leading-relaxed italic"
                    style={{
                      backgroundColor: MUSTARD,
                      color: INK,
                      border: `2px solid ${INK}`,
                      borderRadius: 2,
                    }}
                  >
                    <div
                      className="text-[11px] not-italic uppercase tracking-[0.2em] mb-2"
                      style={{ fontWeight: 700 }}
                    >
                      Logic for this day
                    </div>
                    {dayLogic}
                  </div>
                )}

                {/* Blocks */}
                <div className="space-y-4">
                  {dayBlocks.map((b) => {
                    const typeCfg = TYPE_CONFIG[b.type] ?? TYPE_CONFIG.note;
                    return (
                      <article
                        key={b.id}
                        className="p-5"
                        style={{
                          backgroundColor: CARD_BG,
                          border: `2px solid ${INK}`,
                          borderRadius: 2,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold"
                            style={{
                              backgroundColor: typeCfg.bg,
                              color: INK,
                              border: `1px solid ${INK}`,
                            }}
                          >
                            {typeCfg.icon} {typeCfg.label}
                          </span>
                          {b.startTime && (
                            <span
                              className="text-base font-bold"
                              style={{ color: "#7A6254" }}
                            >
                              {formatTime(b.startTime)}
                              {b.endTime ? ` – ${formatTime(b.endTime)}` : ""}
                            </span>
                          )}
                        </div>
                        <h4
                          className="text-3xl font-black leading-tight mb-1"
                          style={{
                            fontFamily: "'Arial Black', Impact, sans-serif",
                            color: INK,
                          }}
                        >
                          {b.title}
                        </h4>
                        {b.location && (
                          <div
                            className="text-base mb-3"
                            style={{ color: "#7A6254" }}
                          >
                            📍 {b.location}
                          </div>
                        )}
                        {b.description && (
                          <p
                            className="text-xl leading-relaxed mb-3"
                            style={{ color: INK }}
                          >
                            {b.description}
                          </p>
                        )}
                        {b.aiReasoning && (
                          <div
                            className="mt-4 pt-4 border-t text-lg leading-relaxed"
                            style={{
                              borderColor: INK,
                              borderTopStyle: "dashed",
                              opacity: 0.9,
                            }}
                          >
                            <div
                              className="text-[11px] uppercase tracking-[0.2em] mb-1"
                              style={{ color: RUST, fontWeight: 700 }}
                            >
                              Why it's here
                            </div>
                            {b.aiReasoning}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── To Do List ── */}
      {rationale?.todos && rationale.todos.length > 0 && (() => {
        const grouped: Record<string, typeof rationale.todos> = {};
        for (const t of rationale.todos) {
          if (!grouped[t.category]) grouped[t.category] = [];
          grouped[t.category].push(t);
        }
        const categoryOrder = [
          "Activities & Tickets",
          "Restaurants",
          "Bookings",
          "Logistics",
          "Supplies",
          "Other",
        ];
        const categories = Object.keys(grouped).sort(
          (a, b) =>
            (categoryOrder.indexOf(a) === -1 ? 99 : categoryOrder.indexOf(a)) -
            (categoryOrder.indexOf(b) === -1 ? 99 : categoryOrder.indexOf(b))
        );
        return (
          <section className="px-5 sm:px-8 py-12 mt-8 border-t-2" style={{ borderColor: INK }}>
            <div className="max-w-3xl mx-auto">
              <h2
                className="text-xs uppercase tracking-[0.2em] mb-4"
                style={{ color: RUST, fontWeight: 700 }}
              >
                Pre-Trip To Do
              </h2>
              <h3
                className="text-3xl font-black mb-3"
                style={{
                  fontFamily: "'Arial Black', Impact, sans-serif",
                  color: INK,
                }}
              >
                What still needs to be booked
              </h3>
              <p
                className="text-base mb-8"
                style={{ color: "#7A6254" }}
              >
                Andrew will work through this list. Included here so you can
                see what's involved — nothing is booked yet.
              </p>
              <div className="space-y-8">
                {categories.map((cat) => (
                  <div key={cat}>
                    <div
                      className="text-[11px] uppercase tracking-[0.2em] mb-3 pb-2 border-b"
                      style={{
                        color: RUST,
                        fontWeight: 700,
                        borderColor: INK,
                      }}
                    >
                      {cat}
                    </div>
                    <ul className="space-y-3">
                      {grouped[cat].map((t, i) => (
                        <li
                          key={i}
                          className="flex gap-3 text-lg leading-relaxed"
                          style={{ color: INK }}
                        >
                          <span
                            className="shrink-0 text-xl"
                            style={{ color: RUST, fontWeight: 700 }}
                          >
                            ☐
                          </span>
                          <div>
                            <div>{t.item}</div>
                            {t.notes && (
                              <div
                                className="text-base mt-0.5"
                                style={{ color: "#7A6254" }}
                              >
                                {t.notes}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── Footer ── */}
      <footer
        className="px-5 sm:px-8 pt-12 pb-8 border-t-2 mt-8"
        style={{ borderColor: INK }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm" style={{ color: "#7A6254" }}>
            {rationale?.generatedAt
              ? `Rationale generated ${new Date(rationale.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
              : null}
          </div>
          <RegenerateButton tripId={id} />
        </div>
      </footer>
    </main>
  );
}
