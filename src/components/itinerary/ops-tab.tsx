"use client";

import { useState, useCallback } from "react";
import {
  type FeedbackItem,
  type SignOff,
  type Participant,
  INK,
  RUST,
  CREAM,
  MUSTARD,
  FEEDBACK_TYPE_CONFIG,
} from "@/lib/itinerary-shared";
import type { GroupConfig, Household } from "@/db/schema";

interface OpsTabProps {
  tripId: string;
  participants: Participant[];
  feedbackItems: FeedbackItem[];
  signOffs: SignOff[];
  groupConfig: GroupConfig | null;
}

// ── Household Editor ──────────────────────────────────────

function HouseholdCard({
  household,
  index,
  onUpdate,
  onRemove,
}: {
  household: Household;
  index: number;
  onUpdate: (index: number, h: Household) => void;
  onRemove: (index: number) => void;
}) {
  const inputStyle: React.CSSProperties = {
    backgroundColor: "white",
    border: `1.5px solid rgba(59,26,15,0.15)`,
    borderRadius: "4px",
    color: INK,
    padding: "0.35rem 0.5rem",
    fontSize: "0.8125rem",
    fontWeight: 600,
    width: "100%",
  };

  const tagStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: 600,
    background: "white",
    border: `1px solid rgba(59,26,15,0.1)`,
    color: INK,
  };

  function updateLabel(label: string) {
    onUpdate(index, { ...household, label });
  }

  function updateAdult(i: number, name: string) {
    const adults = [...household.adults];
    adults[i] = name;
    onUpdate(index, { ...household, adults });
  }

  function addAdult() {
    onUpdate(index, { ...household, adults: [...household.adults, ""] });
  }

  function removeAdult(i: number) {
    const adults = household.adults.filter((_, idx) => idx !== i);
    onUpdate(index, { ...household, adults });
  }

  function updateKid(i: number, name: string) {
    const kids = [...household.kids];
    kids[i] = name;
    onUpdate(index, { ...household, kids });
  }

  function addKid() {
    onUpdate(index, { ...household, kids: [...household.kids, ""] });
  }

  function removeKid(i: number) {
    const kids = household.kids.filter((_, idx) => idx !== i);
    onUpdate(index, { ...household, kids });
  }

  return (
    <div
      className="p-4 rounded-lg"
      style={{ background: CREAM, border: `1px solid rgba(59,26,15,0.08)` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={household.label}
          onChange={(e) => updateLabel(e.target.value)}
          placeholder="Household label"
          style={{ ...inputStyle, fontWeight: 700, fontSize: "0.875rem" }}
        />
        <button
          onClick={() => onRemove(index)}
          className="shrink-0 px-2 py-1 rounded text-xs font-bold transition-opacity hover:opacity-70"
          style={{ color: RUST }}
          title="Remove household"
        >
          Remove
        </button>
      </div>

      {/* Adults */}
      <div className="mb-2">
        <span className="text-xs font-bold uppercase tracking-wide opacity-50" style={{ color: INK }}>
          Adults
        </span>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {household.adults.map((name, i) => (
            <span key={i} style={tagStyle}>
              <input
                type="text"
                value={name}
                onChange={(e) => updateAdult(i, e.target.value)}
                placeholder="Name"
                className="bg-transparent border-none outline-none w-20 text-xs font-semibold"
                style={{ color: INK }}
              />
              <button
                onClick={() => removeAdult(i)}
                className="opacity-40 hover:opacity-100 text-xs"
                style={{ color: RUST }}
              >
                x
              </button>
            </span>
          ))}
          <button
            onClick={addAdult}
            className="px-2 py-0.5 rounded text-xs font-bold transition-opacity hover:opacity-70"
            style={{ color: RUST, border: `1px dashed ${RUST}` }}
          >
            + Adult
          </button>
        </div>
      </div>

      {/* Kids */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wide opacity-50" style={{ color: INK }}>
          Kids
        </span>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {household.kids.map((name, i) => (
            <span key={i} style={tagStyle}>
              <input
                type="text"
                value={name}
                onChange={(e) => updateKid(i, e.target.value)}
                placeholder="Name"
                className="bg-transparent border-none outline-none w-20 text-xs font-semibold"
                style={{ color: INK }}
              />
              <button
                onClick={() => removeKid(i)}
                className="opacity-40 hover:opacity-100 text-xs"
                style={{ color: RUST }}
              >
                x
              </button>
            </span>
          ))}
          <button
            onClick={addKid}
            className="px-2 py-0.5 rounded text-xs font-bold transition-opacity hover:opacity-70"
            style={{ color: RUST, border: `1px dashed ${RUST}` }}
          >
            + Kid
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupSection({
  tripId,
  groupConfig,
}: {
  tripId: string;
  groupConfig: GroupConfig | null;
}) {
  const [households, setHouseholds] = useState<Household[]>(
    groupConfig?.households ?? []
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const totalAdults = households.reduce((s, h) => s + h.adults.length, 0);
  const totalKids = households.reduce((s, h) => s + h.kids.length, 0);

  const updateHousehold = useCallback((index: number, h: Household) => {
    setHouseholds((prev) => prev.map((old, i) => (i === index ? h : old)));
    setDirty(true);
  }, []);

  const removeHousehold = useCallback((index: number) => {
    setHouseholds((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }, []);

  function addHousehold() {
    setHouseholds((prev) => [
      ...prev,
      { label: "", adults: [""], kids: [] },
    ]);
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/group-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupConfig: { households, totalAdults, totalKids },
        }),
      });
      if (res.ok) {
        setDirty(false);
        setLastSaved(new Date().toLocaleTimeString());
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Summary bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg mb-4"
        style={{ background: MUSTARD, color: INK }}
      >
        <span className="text-sm font-black">
          {totalAdults}A + {totalKids}K = {totalAdults + totalKids} total
        </span>
        <span className="text-xs opacity-60 ml-auto">
          {households.length} household{households.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Household cards */}
      <div className="space-y-3 mb-4">
        {households.map((h, i) => (
          <HouseholdCard
            key={i}
            household={h}
            index={i}
            onUpdate={updateHousehold}
            onRemove={removeHousehold}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={addHousehold}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:opacity-80"
          style={{ background: CREAM, color: INK, border: `1.5px dashed ${RUST}` }}
        >
          + Add Household
        </button>

        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: RUST, color: "white", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}

        {lastSaved && !dirty && (
          <span className="text-xs opacity-50" style={{ color: INK }}>
            Saved at {lastSaved}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main OpsTab ───────────────────────────────────────────

export function OpsTab({ tripId, participants, feedbackItems, signOffs, groupConfig }: OpsTabProps) {
  const [activeSection, setActiveSection] = useState<"group" | "todos" | "rsvps" | "changes">("group");

  const sections = [
    { key: "group" as const, label: "Group" },
    { key: "todos" as const, label: "Todos" },
    { key: "rsvps" as const, label: "RSVPs" },
    { key: "changes" as const, label: "Changes" },
  ];

  const changeFeed = [...feedbackItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: activeSection === s.key ? RUST : CREAM,
              color: activeSection === s.key ? "white" : INK,
            }}
          >
            {s.label}
            {s.key === "changes" && changeFeed.filter((f) => f.status === "pending").length > 0 && (
              <span
                className="ml-2 px-1.5 py-0.5 rounded-full text-xs"
                style={{ background: MUSTARD, color: INK }}
              >
                {changeFeed.filter((f) => f.status === "pending").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeSection === "group" && (
        <GroupSection tripId={tripId} groupConfig={groupConfig} />
      )}

      {activeSection === "todos" && (
        <div className="text-sm" style={{ color: INK }}>
          <p className="opacity-60 mb-4">
            Reservation tasks and booking deadlines. Managed via the ops doc system.
          </p>
          <a
            href={`/api/trips/${tripId}/ops/doc`}
            className="inline-block px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: RUST, color: "white" }}
          >
            Download Ops Doc
          </a>
        </div>
      )}

      {activeSection === "rsvps" && (
        <div>
          <h4 className="text-sm font-bold mb-3" style={{ color: INK }}>Review Status</h4>
          <div className="space-y-2 mb-6">
            {participants.filter((p) => p.role !== "owner").map((p) => {
              const signOff = signOffs.find((s) => s.participantId === p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ background: CREAM }}>
                  <span className="font-semibold text-sm" style={{ color: INK }}>{p.name || "Guest"}</span>
                  <span className="ml-auto text-xs">
                    {signOff?.status === "approved" && "\u2705 Approved"}
                    {signOff?.status === "has_feedback" && "\uD83D\uDCDD Has feedback"}
                    {!signOff && "\u23F3 Not reviewed yet"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSection === "changes" && (
        <div className="space-y-3">
          {changeFeed.length === 0 ? (
            <p className="text-sm opacity-60" style={{ color: INK }}>
              No feedback yet. Share the link and feedback will appear here.
            </p>
          ) : (
            changeFeed.map((item) => {
              const config = FEEDBACK_TYPE_CONFIG[item.type];
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-4 py-3 rounded-lg"
                  style={{ background: item.status === "pending" ? CREAM : "white", border: `1px solid ${CREAM}` }}
                >
                  <span>{config?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm" style={{ color: INK }}>{item.participantName || "Guest"}</span>
                    <span className="text-xs opacity-50 ml-2">{config?.label}</span>
                    {item.text && (
                      <p className="text-sm mt-1" style={{ color: INK }}>&ldquo;{item.text}&rdquo;</p>
                    )}
                    <p className="text-xs opacity-40 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  {item.status === "pending" && (
                    <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: MUSTARD, color: INK }}>New</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
