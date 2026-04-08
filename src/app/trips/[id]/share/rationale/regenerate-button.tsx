"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INK, RUST } from "@/lib/itinerary-shared";

export function RegenerateButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        router.push(`/trips/${tripId}/share/rationale?regen=1`);
        router.refresh();
      }}
      className="text-xs uppercase tracking-[0.2em] px-3 py-2 font-bold cursor-pointer disabled:opacity-50"
      style={{
        color: INK,
        border: `2px solid ${RUST}`,
        backgroundColor: "transparent",
        borderRadius: 2,
      }}
    >
      {loading ? "Regenerating…" : "Regenerate rationale"}
    </button>
  );
}
