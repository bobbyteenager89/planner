"use client";

import { useState, useEffect } from "react";
import { DayPicker } from "./day-picker";
import {
  Block,
  ShareData,
  INK,
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

function PackingListSection({ tripId }: { tripId: string }) {
  const [list, setList] = useState<Record<string, string[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchList = () => {
    if (list) { setOpen(!open); return; }
    setLoading(true);
    fetch(`/api/trips/${tripId}/packing-list`)
      .then((r) => r.json())
      .then((data) => {
        setList(data.packingList);
        setOpen(true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  return (
    <div className="max-w-3xl mx-auto px-5 pb-8 sm:px-8">
      <button
        onClick={fetchList}
        className="w-full text-xl font-bold py-4 text-center cursor-pointer"
        style={{ backgroundColor: CARD_BG, color: INK, border: `2px solid ${RUST}`, borderRadius: "2px" }}
      >
        {loading ? "Generating packing list..." : open ? "🧳 Hide Packing List" : "🧳 What to Pack"}
      </button>

      {open && list && (
        <div className="mt-4 p-6" style={{ backgroundColor: CARD_BG, border: `2px solid ${RUST}`, borderRadius: "2px" }}>
          {Object.entries(list).map(([category, items]) => (
            <div key={category} className="mb-5 last:mb-0">
              <h3 className="text-xl font-black uppercase mb-2" style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}>
                {category}
              </h3>
              <ul className="space-y-1">
                {items.map((item: string, i: number) => (
                  <li key={i} className="text-lg font-medium flex items-start gap-2" style={{ color: INK }}>
                    <span className="shrink-0">☐</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GuestItinerary({ tripId }: { tripId: string }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [weather, setWeather] = useState<Record<number, { high: number; low: number; code: number }>>({});

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <p className="text-xl font-semibold" style={{ color: INK }}>Loading your trip...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: INK }}>Something went wrong</p>
          <p className="text-lg mt-2" style={{ color: INK, opacity: 0.6 }}>Try refreshing the page.</p>
        </div>
      </div>
    );
  }

  if (!data || !data.itinerary || data.blocks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: INK }}>No itinerary yet</p>
          <p className="text-lg mt-2" style={{ color: INK, opacity: 0.6 }}>Check back soon!</p>
        </div>
      </div>
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
    <div style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      {/* ═══ HEADER ═══ */}
      <div className="px-5 py-8 sm:px-10 sm:py-10" style={{ backgroundColor: RUST }}>
        <p className="text-lg font-bold uppercase tracking-widest mb-3" style={{ color: MUSTARD }}>
          Goble Family
        </p>
        <h1
          className="text-6xl sm:text-8xl font-black uppercase leading-none"
          style={{
            color: CREAM,
            fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
            textShadow: `3px 3px 0 ${MUSTARD}`,
            letterSpacing: "-0.02em",
          }}
        >
          BIG SKY
        </h1>
        <p className="text-xl sm:text-3xl font-bold mt-3" style={{ color: CREAM }}>
          July 18 — 25, 2026
        </p>
        <a
          href={mapsUrl("20 Moose Ridge Road, Big Sky, MT")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-lg mt-2 font-medium underline underline-offset-4 decoration-1"
          style={{ color: CREAM, opacity: 0.8 }}
        >
          📍 20 Moose Ridge Road, Big Sky, MT →
        </a>
      </div>

      {/* ═══ COUNTDOWN + TRAVEL INFO ═══ */}
      <div className="max-w-3xl mx-auto px-5 pt-8 sm:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Countdown */}
          <div className="p-4 text-center" style={{ backgroundColor: CARD_BG, border: `2px solid ${RUST}`, borderRadius: "2px" }}>
            <p className="text-4xl font-black" style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}>
              {(() => {
                const tripDate = trip.startDate ? new Date(trip.startDate) : new Date("2026-07-18");
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const diff = Math.ceil((tripDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return diff > 0 ? diff : 0;
              })()}
            </p>
            <p className="text-lg font-bold uppercase tracking-wider" style={{ color: INK, opacity: 0.55 }}>
              days to go
            </p>
          </div>

          {/* Airport → House */}
          <div className="p-4 text-center" style={{ backgroundColor: CARD_BG, border: `2px solid ${RUST}`, borderRadius: "2px" }}>
            <p className="text-xl font-black" style={{ color: INK }}>✈️ BZN → 🏠</p>
            <p className="text-lg font-bold mt-1" style={{ color: INK, opacity: 0.55 }}>55 min drive</p>
            <a
              href={mapsDirectionsUrl(["Bozeman Yellowstone International Airport", "20 Moose Ridge Road, Big Sky, MT"])}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-bold underline underline-offset-4 mt-1 inline-block"
              style={{ color: RUST }}
            >
              Directions →
            </a>
          </div>

          {/* Nearest Grocery */}
          <div className="p-4 text-center" style={{ backgroundColor: CARD_BG, border: `2px solid ${RUST}`, borderRadius: "2px" }}>
            <p className="text-xl font-black" style={{ color: INK }}>🛒 Nearest Grocery</p>
            <p className="text-lg font-bold mt-1" style={{ color: INK, opacity: 0.55 }}>Hungry Moose Market</p>
            <a
              href={mapsUrl("Hungry Moose Market & Deli, Big Sky, MT")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-bold underline underline-offset-4 mt-1 inline-block"
              style={{ color: RUST }}
            >
              5 min drive →
            </a>
          </div>
        </div>
      </div>

      {/* ═══ WARM INTRO ═══ */}
      <div className="max-w-3xl mx-auto px-5 pt-8 pb-4 sm:px-8">
        <p className="text-2xl leading-relaxed font-medium" style={{ color: INK }}>
          Andrew planned this trip around what everyone said they wanted to do.
          Here&apos;s your week.
        </p>
        <a
          href={`/trips/${tripId}/share/guide`}
          className="inline-block text-xl font-bold px-6 py-3 mt-4"
          style={{ backgroundColor: CARD_BG, color: INK, border: `2px solid ${RUST}`, borderRadius: "2px" }}
        >
          🗺 Local Guide — Coffee, Groceries, Ice Cream →
        </a>
      </div>

      {/* ═══ DAY PICKER ═══ */}
      <DayPicker days={dayTabs} activeDay={activeDay} onSelect={(d) => { setActiveDay(d); setExpandedBlock(null); }} />

      {/* ═══ DAY CONTENT ═══ */}
      <div className="max-w-3xl mx-auto px-5 py-8 sm:px-8">
        {/* Day title */}
        <div className="mb-6">
          <h2
            className="text-4xl sm:text-5xl font-black uppercase"
            style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
          >
            Day {activeDay}
          </h2>
          {dayDate && (
            <p className="text-xl font-bold uppercase tracking-wider mt-1" style={{ color: INK, opacity: 0.55 }}>
              {formatDayDate(dayDate)}
              {weather[activeDay] && (
                <span className="ml-3 normal-case tracking-normal">
                  {weatherEmoji(weather[activeDay].code)} {weather[activeDay].high}°/{weather[activeDay].low}°F
                </span>
              )}
            </p>
          )}

          {/* Day driving summary + route link */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {dayDrive > 0 && (
              <span className="text-xl font-bold" style={{ color: INK, opacity: 0.6 }}>
                🚗 ~{dayDrive} min total driving
              </span>
            )}
            {dayLocs.length >= 2 && (
              <a
                href={`/trips/${tripId}/share/map/${activeDay}`}
                className="text-xl font-bold underline underline-offset-4"
                style={{ color: RUST }}
              >
                Open full route →
              </a>
            )}
          </div>
        </div>

        {/* Blocks */}
        <div className="space-y-0">
          {currentBlocks.map((block, idx) => {
            const config = TYPE_CONFIG[block.type] || TYPE_CONFIG.note;
            const isExpanded = expandedBlock === block.id;
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
                  onClick={() => setExpandedBlock(isExpanded ? null : block.id)}
                  className="cursor-pointer transition-opacity mb-4"
                  style={{
                    backgroundColor: CARD_BG,
                    border: `2px solid ${isAlt ? MUSTARD : RUST}`,
                    borderRadius: "2px",
                    borderStyle: isAlt ? "dashed" : "solid",
                    padding: "1.5rem 1.75rem",
                    marginLeft: isAlt ? "1.5rem" : 0,
                    opacity: isAlt && !isExpanded ? 0.8 : 1,
                    overflow: "hidden",
                  }}
                >
                  {/* Photo banner */}
                  {block.imageUrl && (
                    <div
                      className="w-full h-40 sm:h-48 bg-cover bg-center -mt-6 -mx-7 mb-4"
                      style={{
                        backgroundImage: `url(${block.imageUrl})`,
                        width: "calc(100% + 3.5rem)",
                        borderRadius: "2px 2px 0 0",
                      }}
                    />
                  )}
                  {/* Top row */}
                  <div className="flex items-center gap-2.5 flex-wrap mb-2">
                    {block.startTime && (
                      <span className="text-xl font-mono font-bold" style={{ color: INK, opacity: 0.65 }}>
                        {formatTime(block.startTime)}{block.endTime && `–${formatTime(block.endTime)}`}
                      </span>
                    )}
                    <span
                      className="text-lg px-3 py-1 font-bold uppercase tracking-wider"
                      style={{ backgroundColor: config.bg, color: INK, border: `1.5px solid ${RUST}`, borderRadius: "2px" }}
                    >
                      {config.icon} {config.label}
                    </span>
                    {isAlt && (
                      <span
                        className="text-lg px-3 py-1 font-bold uppercase tracking-wider"
                        style={{ backgroundColor: CREAM, color: INK, border: `1.5px solid ${MUSTARD}`, borderRadius: "2px" }}
                      >
                        ↔️ Alternative
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <p
                    className="font-black uppercase text-2xl leading-tight"
                    style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
                  >
                    {block.title}
                  </p>

                  {/* Location */}
                  {block.location && (
                    <a
                      href={mapsUrl(block.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-block text-xl mt-1.5 font-semibold underline underline-offset-4 decoration-1"
                      style={{ color: INK, opacity: 0.75 }}
                    >
                      📍 {block.location} →
                    </a>
                  )}

                  {/* Expanded — description only, NO reasoning */}
                  {isExpanded && block.description && (
                    <p className="text-xl leading-relaxed font-medium mt-4" style={{ color: INK }}>
                      {block.description}
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
              onClick={() => setActiveDay(activeDay - 1)}
              className="text-xl font-bold px-6 py-3"
              style={{ backgroundColor: CARD_BG, color: INK, border: `2px solid ${RUST}`, borderRadius: "2px" }}
            >
              ← Day {activeDay - 1}
            </button>
          ) : <div />}
          {activeDay < dayNumbers[dayNumbers.length - 1] ? (
            <button
              onClick={() => { setActiveDay(activeDay + 1); setExpandedBlock(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="text-xl font-bold px-6 py-3"
              style={{ backgroundColor: RUST, color: CREAM, border: `2px solid ${RUST}`, borderRadius: "2px" }}
            >
              Day {activeDay + 1} →
            </button>
          ) : <div />}
        </div>
      </div>

      <PackingListSection tripId={tripId} />

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
    </div>
  );
}
