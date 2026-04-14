"use client";

import { useState, useEffect } from "react";
import { DayPicker } from "./day-picker";
import {
  Block,
  ShareData,
  INK,
  INK_MUTED,
  RUST,
  MUSTARD,
  CREAM,
  CARD_BG,
  TYPE_CONFIG,
  mapsUrl,
  mapsDirectionsUrl,
  formatTime,
  getDayDate,
  formatDayDate,
  getWeekdayShort,
  getDayVibe,
  weatherEmoji,
  getDayLocations,
  getDayDriveTotal,
  TravelCard,
} from "@/lib/itinerary-shared";
import { NamePicker } from "@/components/itinerary/name-picker";
import { ThreeDotMenu } from "@/components/itinerary/three-dot-menu";
import { SignOffBanner } from "@/components/itinerary/sign-off-banner";
import { HeroSection } from "@/components/itinerary/hero-section";
import { TripStats } from "@/components/itinerary/trip-stats";
import { type FeedbackItem, type Participant } from "@/lib/itinerary-shared";
import { getGuestParticipantId } from "@/lib/guest-identity";

function BlockImage({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      className="w-full h-40 sm:h-48 object-cover -mt-6 -mx-7 mb-4"
      style={{ width: "calc(100% + 3.5rem)", borderRadius: "2px 2px 0 0", display: "block" }}
    />
  );
}

function renderDescription(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

export function GuestItinerary({ tripId }: { tripId: string }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [weather, setWeather] = useState<Record<number, { high: number; low: number; code: number }>>({});
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [signOffStatus, setSignOffStatus] = useState<"approved" | "has_feedback" | null>(null);

  useEffect(() => {
    // Fetch trip data + weather in parallel (independent requests)
    const sharePromise = fetch(`/api/trips/${tripId}/share`)
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); });

    const weatherPromise = fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=45.28&longitude=-111.40&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=fahrenheit&start_date=2026-07-18&end_date=2026-07-25&timezone=America/Denver`
    ).then((r) => r.ok ? r.json() : null).catch(() => null);

    Promise.all([sharePromise, weatherPromise])
      .then(([json, weatherJson]) => {
        setData(json);
        setLoading(false);
        if (weatherJson?.daily) {
          const map: Record<number, { high: number; low: number; code: number }> = {};
          weatherJson.daily.time.forEach((date: string, i: number) => {
            map[i + 1] = {
              high: Math.round(weatherJson.daily.temperature_2m_max[i]),
              low: Math.round(weatherJson.daily.temperature_2m_min[i]),
              code: weatherJson.daily.weather_code[i],
            };
          });
          setWeather(map);
        }
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [tripId]);

  // Initialize guest identity from localStorage
  useEffect(() => {
    if (!data) return;
    const storedId = getGuestParticipantId(tripId);
    if (storedId) {
      const participant = (data.participants as Participant[] | undefined)?.find((p) => p.id === storedId);
      if (participant) {
        setGuestId(storedId);
        setGuestName(participant.name || "Guest");
      }
    }
  }, [data, tripId]);

  // Fetch feedback items when guest is identified
  useEffect(() => {
    if (!guestId) return;
    fetch(`/api/trips/${tripId}/feedback`)
      .then((r) => r.json())
      .then((items) => setFeedbackItems(items))
      .catch(() => {});
  }, [guestId, tripId]);

  // Initialize day from URL hash (e.g. #day-3 on load)
  useEffect(() => {
    if (typeof window === "undefined" || !data) return;
    const match = window.location.hash.match(/^#day-(\d+)$/);
    if (match) {
      const d = parseInt(match[1], 10);
      if (d >= 1) {
        setActiveDay(d);
        requestAnimationFrame(() => {
          document.getElementById("day-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
  }, [data]);

  async function submitFeedback(blockId: string, type: string, text?: string) {
    if (!guestId) return;
    const res = await fetch(`/api/trips/${tripId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId, participantId: guestId, type, text }),
    });
    if (res.ok) {
      const item = await res.json();
      setFeedbackItems((prev) => [...prev, item]);
    }
  }

  async function submitSignOff(status: "approved" | "has_feedback") {
    if (!guestId) return;
    await fetch(`/api/trips/${tripId}/sign-off`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: guestId, status }),
    });
    setSignOffStatus(status);
  }

  if (loading) {
    return (
      <main id="main-content" className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <p className="text-xl font-semibold" style={{ color: INK }}>Loading your trip...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main id="main-content" className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: INK }}>Something went wrong</p>
          <p className="text-lg mt-2" style={{ color: INK_MUTED }}>Try refreshing the page.</p>
        </div>
      </main>
    );
  }

  if (!data || !data.itinerary || data.blocks.length === 0) {
    return (
      <main id="main-content" className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: INK }}>No itinerary yet</p>
          <p className="text-lg mt-2" style={{ color: INK_MUTED }}>Check back soon!</p>
        </div>
      </main>
    );
  }

  const { trip, blocks } = data;

  const dayGroups = blocks.reduce<Record<number, Block[]>>((acc, block) => {
    if (!acc[block.dayNumber]) acc[block.dayNumber] = [];
    acc[block.dayNumber].push(block);
    return acc;
  }, {});

  const dayNumbers = Object.keys(dayGroups).map(Number).sort((a, b) => a - b);

  // Build day tabs
  const dayTabs = dayNumbers.map((d) => ({
    dayNumber: d,
    weekday: getWeekdayShort(trip.startDate, d),
    vibe: getDayVibe(dayGroups[d]),
  }));

  // Current day's blocks
  const currentBlocks = (dayGroups[activeDay] || []).sort((a, b) => a.sortOrder - b.sortOrder);
  const dayDate = getDayDate(trip.startDate, activeDay);
  const dayLocs = getDayLocations(currentBlocks);
  const dayDrive = getDayDriveTotal(currentBlocks);

  return (
    <main id="main-content" style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      {/* ═══ HERO ═══ */}
      <HeroSection
        title="BIG SKY"
        subtitle="Goble Family · Est. 2026"
        kicker="An eight-day itinerary in the Montana mountains"
        dateLabel="July 18 — 25, 2026"
        daysToGo={(() => {
          const tripDate = trip.startDate ? new Date(trip.startDate) : new Date("2026-07-18");
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diff = Math.ceil((tripDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return diff > 0 ? diff : 0;
        })()}
      />

      {/* ═══ TRIP STATS STRIP ═══ */}
      <div className="max-w-3xl mx-auto">
        <TripStats
          stats={[
            {
              label: "Basecamp",
              value: (
                <>
                  20 Moose Ridge Rd
                  <br />
                  <span style={{ color: INK_MUTED, fontSize: "13px" }}>Big Sky, MT</span>
                </>
              ),
              href: mapsUrl("20 Moose Ridge Road, Big Sky, MT"),
            },
            {
              label: "Airport → House",
              value: (
                <>
                  BZN <span style={{ color: RUST }}>→</span> 55 min
                </>
              ),
              href: mapsDirectionsUrl([
                "Bozeman Yellowstone International Airport",
                "20 Moose Ridge Road, Big Sky, MT",
              ]),
            },
          ]}
        />
      </div>

      {/* ═══ WARM INTRO (day 1 only) ═══ */}
      {activeDay === 1 && (
        <div className="max-w-3xl mx-auto px-5 pt-10 pb-6 sm:px-8">
          <div
            className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-3"
            style={{ color: RUST, fontFamily: "'Arial Black', Impact, sans-serif" }}
          >
            The Plan
            <span className="flex-1 h-px opacity-30" style={{ background: RUST }} />
          </div>
          <p
            className="leading-relaxed"
            style={{
              color: INK,
              fontSize: "19px",
              fontFamily: "var(--font-fraunces), Georgia, serif",
              maxWidth: "560px",
            }}
          >
            Andrew planned this trip around what everyone said they wanted to do. Here&apos;s your week — tap any activity to react, leave a note, or propose an alternative.
          </p>
          <a
            href={`/trips/${tripId}/share/guide`}
            className="inline-block mt-6 text-sm font-black uppercase tracking-wider px-5 py-3 transition-colors"
            style={{
              backgroundColor: CARD_BG,
              color: INK,
              border: `2px solid ${RUST}`,
              fontFamily: "'Arial Black', Impact, sans-serif",
              letterSpacing: "0.1em",
            }}
          >
            🗺 Local Guide — Coffee, Groceries, Ice Cream →
          </a>
        </div>
      )}

      {/* ═══ GUEST IDENTITY + SIGN-OFF ═══ */}
      <div className="max-w-3xl mx-auto px-5 py-4 sm:px-8">
        {!guestId ? (
          <NamePicker
            tripId={tripId}
            participants={(data.participants as Participant[]) || []}
            onSelect={(id, name) => {
              setGuestId(id);
              setGuestName(name);
            }}
          />
        ) : (
          <>
            <SignOffBanner
              tripId={tripId}
              participantId={guestId}
              participantName={guestName}
              itineraryStatus={data.itinerary?.status || "reviewing"}
              onSignOff={submitSignOff}
              existingSignOff={signOffStatus}
            />
            <a
              href={`/trips/${tripId}/share/my-plan`}
              className="inline-flex items-center gap-2 mt-4 text-sm font-black uppercase tracking-wider px-5 py-3 transition-colors"
              style={{
                backgroundColor: CARD_BG,
                color: INK,
                border: `2px solid ${RUST}`,
                fontFamily: "'Arial Black', Impact, sans-serif",
                letterSpacing: "0.1em",
              }}
            >
              📋 View My Plan →
            </a>
          </>
        )}
      </div>

      {/* ═══ DAY PICKER ═══ */}
      <DayPicker
        days={dayTabs}
        activeDay={activeDay}
        onSelect={(d) => {
          setActiveDay(d);
          // Update URL hash and scroll to the day content
          if (typeof window !== "undefined") {
            window.history.replaceState(null, "", `#day-${d}`);
            requestAnimationFrame(() => {
              document
                .getElementById("day-content")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }
        }}
      />

      {/* ═══ DAY CONTENT ═══ */}
      <div id="day-content" className="max-w-3xl mx-auto px-5 py-8 sm:px-8 scroll-mt-4">
        {/* Day title */}
        <div className="mb-6">
          <h2
            className="text-4xl sm:text-5xl font-black uppercase"
            style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
          >
            Day {activeDay}
          </h2>
          {dayDate && (
            <p
              className="text-lg italic mt-2"
              style={{
                color: INK_MUTED,
                fontFamily: "var(--font-fraunces), Georgia, serif",
              }}
            >
              {formatDayDate(dayDate)}
              {weather[activeDay] && (
                <span className="ml-3">
                  {weatherEmoji(weather[activeDay].code)} {weather[activeDay].high}°/{weather[activeDay].low}°F
                </span>
              )}
            </p>
          )}

          {/* Day driving summary + route link */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {dayDrive > 0 && (
              <span
                className="text-lg italic"
                style={{
                  color: INK_MUTED,
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                }}
              >
                🚗 ~{dayDrive} min total driving
              </span>
            )}
          </div>
        </div>

        {/* Blocks */}
        <div className="space-y-0">
          {currentBlocks.map((block, idx) => {
            const config = TYPE_CONFIG[block.type] || TYPE_CONFIG.note;
            const isAlt = block.title.includes("(Alt)");

            const prevBlock = idx > 0 ? currentBlocks[idx - 1] : null;
            const showTravel =
              !isAlt &&
              prevBlock &&
              !prevBlock.title.includes("(Alt)") &&
              prevBlock.location &&
              block.location &&
              prevBlock.location !== block.location;

            return (
              <div key={block.id}>
                {showTravel && (
                  <TravelCard fromLocation={prevBlock!.location!} toLocation={block.location!} />
                )}
                <div
                  className="transition-opacity mb-5"
                  style={{
                    backgroundColor: CARD_BG,
                    border: `2px solid ${isAlt ? MUSTARD : RUST}`,
                    borderRadius: "2px",
                    borderStyle: isAlt ? "dashed" : "solid",
                    padding: "1.5rem 1.75rem",
                    marginLeft: isAlt ? "1.5rem" : 0,
                    opacity: isAlt ? 0.9 : 1,
                    overflow: "hidden",
                  }}
                >
                  {/* Photo banner */}
                  {block.imageUrl && (
                    <BlockImage url={block.imageUrl} alt={block.title || "Activity photo"} />
                  )}
                  {/* Top row */}
                  <div className="flex items-center gap-2.5 flex-wrap mb-2">
                    {block.startTime && (
                      <span className="text-base font-mono font-bold" style={{ color: INK_MUTED }}>
                        {formatTime(block.startTime)}{block.endTime && `–${formatTime(block.endTime)}`}
                      </span>
                    )}
                    <span
                      className="text-sm px-3 py-1 font-bold uppercase tracking-wider"
                      style={{ backgroundColor: config.bg, color: INK, border: `1.5px solid ${RUST}`, borderRadius: "2px" }}
                    >
                      {config.icon} {config.label}
                    </span>
                    {isAlt && (
                      <span
                        className="text-sm px-3 py-1 font-bold uppercase tracking-wider"
                        style={{ backgroundColor: CREAM, color: INK, border: `1.5px solid ${MUSTARD}`, borderRadius: "2px" }}
                      >
                        ↔️ Alternative
                      </span>
                    )}
                  </div>

                  {/* Title + feedback menu */}
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="font-black uppercase text-2xl leading-tight"
                      style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
                    >
                      {block.title}
                    </p>
                    {guestId && (
                      <ThreeDotMenu
                        blockId={block.id}
                        onFeedback={(type, text) => submitFeedback(block.id, type, text)}
                        existingFeedback={
                          feedbackItems.find(
                            (f) => f.blockId === block.id && f.participantId === guestId
                          )?.type
                        }
                      />
                    )}
                  </div>

                  {/* Location */}
                  {block.location && (
                    <a
                      href={mapsUrl(block.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-block text-base mt-1.5 font-semibold underline underline-offset-4 decoration-1"
                      style={{ color: INK_MUTED }}
                    >
                      📍 {block.location} →
                    </a>
                  )}

                  {block.description && (
                    <p
                      className="leading-relaxed mt-4"
                      style={{
                        color: INK,
                        fontSize: "16px",
                        fontFamily: "var(--font-fraunces), Georgia, serif",
                      }}
                    >
                      {renderDescription(block.description)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Day navigation */}
        <div className="flex justify-between mt-8">
          {activeDay > dayNumbers[0] ? (
            <button
              onClick={() => {
                const next = activeDay - 1;
                setActiveDay(next);
                window.history.replaceState(null, "", `#day-${next}`);
                requestAnimationFrame(() => {
                  document.getElementById("day-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
              }}
              className="text-xl font-bold px-6 py-3"
              style={{ backgroundColor: CARD_BG, color: INK, border: `2px solid ${RUST}`, borderRadius: "2px" }}
            >
              ← Day {activeDay - 1}
            </button>
          ) : <div />}
          {activeDay < dayNumbers[dayNumbers.length - 1] ? (
            <button
              onClick={() => {
                const next = activeDay + 1;
                setActiveDay(next);
                window.history.replaceState(null, "", `#day-${next}`);
                requestAnimationFrame(() => {
                  document.getElementById("day-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
              }}
              className="text-xl font-bold px-6 py-3"
              style={{ backgroundColor: RUST, color: CREAM, border: `2px solid ${RUST}`, borderRadius: "2px" }}
            >
              Day {activeDay + 1} →
            </button>
          ) : <div />}
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div className="max-w-3xl mx-auto px-5 pb-16 sm:px-8">
        <div className="p-6" style={{ backgroundColor: RUST, borderRadius: "2px" }}>
          <p className="text-xl font-black uppercase tracking-wider" style={{ color: MUSTARD }}>
            {blocks.length} activities across {dayNumbers.length} days
          </p>
          <p className="text-xl mt-1 font-medium" style={{ color: CREAM, opacity: 0.8 }}>
            Tap any card for details
          </p>
        </div>
      </div>
    </main>
  );
}
