import Link from "next/link";
import { LOCAL_SPOTS, SPOT_CATEGORIES } from "@/lib/bigsky-local-spots";

const INK = "#3B1A0F";
const INK_MUTED = "#7A6254";
const RUST = "#D14F36";
const CREAM = "#F3EBE0";
const CARD_BG = "#EBE1D3";

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main id="main-content" style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      <div className="px-5 py-8 sm:px-10 sm:py-10" style={{ backgroundColor: RUST }}>
        <Link
          href={`/trips/${id}/share`}
          className="text-lg font-bold transition-opacity hover:opacity-80"
          style={{ color: CREAM }}
        >
          ← Back to itinerary
        </Link>
        <h1
          className="text-4xl sm:text-5xl font-black uppercase leading-none"
          style={{ color: CREAM, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
        >
          Local Guide
        </h1>
        <p className="text-xl font-bold mt-2" style={{ color: CREAM }}>
          Everything you need in Big Sky
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8 sm:px-8">
        {SPOT_CATEGORIES.map((category) => {
          const spots = LOCAL_SPOTS.filter((s) => s.category === category);
          return (
            <div key={category} className="mb-10">
              <h2
                className="text-2xl font-black uppercase mb-4"
                style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
              >
                {category}
              </h2>
              <div className="space-y-3">
                {spots.map((spot) => (
                  <div
                    key={spot.name}
                    className="p-5"
                    style={{ backgroundColor: CARD_BG, border: `2px solid ${RUST}`, borderRadius: "2px" }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xl font-black" style={{ color: INK }}>{spot.name}</p>
                        <p className="text-lg font-medium mt-1 leading-relaxed" style={{ color: INK_MUTED }}>
                          {spot.note}
                        </p>
                      </div>
                      {spot.driveMinutes && (
                        <span className="text-lg font-bold shrink-0" style={{ color: INK_MUTED }}>
                          ~{spot.driveMinutes} min
                        </span>
                      )}
                    </div>
                    <a
                      href={mapsUrl(spot.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-lg font-bold underline underline-offset-4 mt-2"
                      style={{ color: RUST }}
                    >
                      📍 Directions →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
