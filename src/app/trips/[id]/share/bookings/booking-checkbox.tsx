"use client";

import { useState, useTransition } from "react";

type Status = "needed" | "booked";

export function BookingCheckbox({
  tripId,
  blockId,
  initialStatus,
}: {
  tripId: string;
  blockId: string;
  initialStatus: Status;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next: Status = status === "booked" ? "needed" : "booked";
    const prev = status;
    setStatus(next); // optimistic
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/trips/${tripId}/bookings/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blockId, status: next }),
        });
        if (!res.ok) throw new Error(`${res.status}`);
      } catch {
        setStatus(prev); // revert
        setError("Couldn't save — try again");
      }
    });
  }

  const isBooked = status === "booked";
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={isBooked}
      className="inline-flex items-center gap-3 select-none cursor-pointer"
      style={{ background: "none", border: "none", padding: 0 }}
    >
      <span
        className="inline-flex items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          border: "2px solid #3B1A0F",
          background: isBooked ? "#1F8A4D" : "transparent",
          color: "white",
          fontSize: 22,
          lineHeight: 1,
          transition: "background 120ms ease",
        }}
      >
        {isBooked ? "✓" : ""}
      </span>
      <span
        className="font-bold uppercase tracking-wider text-base"
        style={{ color: isBooked ? "#1F8A4D" : "#7A6254" }}
      >
        {isBooked ? "Booked" : "Mark booked"}
      </span>
      {error && (
        <span className="text-sm" style={{ color: "#A13D2A" }}>
          {error}
        </span>
      )}
    </button>
  );
}
