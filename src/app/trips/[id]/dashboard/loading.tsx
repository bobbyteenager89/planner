const RUST = "#D14F36";
const CREAM = "#F3EBE0";
const CARD_BG = "#EBE1D3";

export default function DashboardLoading() {
  return (
    <div style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      {/* Header skeleton */}
      <div className="px-5 py-6 sm:px-10 sm:py-8" style={{ backgroundColor: RUST }}>
        <div className="h-4 w-40 rounded animate-pulse" style={{ backgroundColor: "rgba(243,235,224,0.3)" }} />
        <div className="h-14 w-64 rounded animate-pulse mt-3" style={{ backgroundColor: "rgba(243,235,224,0.2)" }} />
        <div className="h-5 w-48 rounded animate-pulse mt-3" style={{ backgroundColor: "rgba(243,235,224,0.15)" }} />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        {/* Participant tracker skeleton */}
        <div
          className="mb-10 p-5"
          style={{ backgroundColor: CARD_BG, border: `1.5px solid ${RUST}`, borderRadius: "2px" }}
        >
          <div className="flex justify-between mb-3">
            <div className="h-4 w-24 rounded animate-pulse" style={{ backgroundColor: "rgba(209,79,54,0.15)" }} />
            <div className="h-4 w-32 rounded animate-pulse" style={{ backgroundColor: "rgba(209,79,54,0.15)" }} />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-20 rounded-full animate-pulse" style={{ backgroundColor: "rgba(209,79,54,0.1)" }} />
            ))}
          </div>
        </div>

        {/* Vote bars skeleton */}
        {[1, 2, 3].map((section) => (
          <div key={section} className="mb-10">
            <div className="border-t-2 mb-4" style={{ borderColor: RUST }} />
            <div className="h-7 w-32 rounded animate-pulse mb-6" style={{ backgroundColor: "rgba(209,79,54,0.15)" }} />
            {[1, 2, 3, 4].map((bar) => (
              <div key={bar} className="mb-3">
                <div className="flex justify-between mb-1">
                  <div className="h-4 w-40 rounded animate-pulse" style={{ backgroundColor: "rgba(209,79,54,0.1)" }} />
                  <div className="h-3 w-24 rounded animate-pulse" style={{ backgroundColor: "rgba(209,79,54,0.08)" }} />
                </div>
                <div className="h-6 rounded animate-pulse" style={{ backgroundColor: "rgba(209,79,54,0.08)" }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
