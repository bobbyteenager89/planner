import { db } from "@/db";
import { trips, itineraries, itineraryBlocks } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getRationale } from "@/lib/ai/rationale";
import {
  INK,
  RUST,
  MUSTARD,
  CREAM,
  CARD_BG,
  TYPE_CONFIG,
  formatTime,
  getDayDate,
  formatDayDate,
  getWeekdayShort,
} from "@/lib/itinerary-shared";
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

  const rationale = await getRationale(id, { force: regen === "1" });

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
            style={{ color: INK, opacity: 0.7 }}
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
              className="p-6 space-y-2 text-lg leading-relaxed"
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
            <p className="text-lg opacity-70">
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
                    className="p-5 mb-6 text-base leading-relaxed italic"
                    style={{
                      backgroundColor: MUSTARD,
                      color: INK,
                      border: `2px solid ${INK}`,
                      borderRadius: 2,
                    }}
                  >
                    <div
                      className="text-[10px] not-italic uppercase tracking-[0.2em] mb-2"
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
                              className="text-sm font-bold"
                              style={{ color: INK, opacity: 0.7 }}
                            >
                              {formatTime(b.startTime)}
                              {b.endTime ? ` – ${formatTime(b.endTime)}` : ""}
                            </span>
                          )}
                        </div>
                        <h4
                          className="text-2xl font-black leading-tight mb-1"
                          style={{
                            fontFamily: "'Arial Black', Impact, sans-serif",
                            color: INK,
                          }}
                        >
                          {b.title}
                        </h4>
                        {b.location && (
                          <div
                            className="text-sm mb-2"
                            style={{ color: INK, opacity: 0.7 }}
                          >
                            📍 {b.location}
                          </div>
                        )}
                        {b.description && (
                          <p
                            className="text-base leading-relaxed mb-3"
                            style={{ color: INK }}
                          >
                            {b.description}
                          </p>
                        )}
                        {b.aiReasoning && (
                          <div
                            className="mt-3 pt-3 border-t text-sm leading-relaxed"
                            style={{
                              borderColor: INK,
                              borderTopStyle: "dashed",
                              opacity: 0.9,
                            }}
                          >
                            <div
                              className="text-[10px] uppercase tracking-[0.2em] mb-1"
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

      {/* ── Footer ── */}
      <footer
        className="px-5 sm:px-8 pt-12 pb-8 border-t-2 mt-8"
        style={{ borderColor: INK }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm" style={{ color: INK, opacity: 0.6 }}>
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
