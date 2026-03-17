"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  ACTIVITIES,
  CHEF_OPTIONS,
  ACTIVITY_CATEGORIES,
  type Activity,
} from "./bigsky-config";
import { saveBigSkyAnswers, type BigSkyAnswers } from "./bigsky-actions";

type VoteValue = "yes" | "fine" | "pass";

interface Props {
  tripId: string;
}

const VOTE_OPTIONS: { value: VoteValue; label: string; emoji: string }[] = [
  { value: "yes", label: "Yes", emoji: "✅" },
  { value: "fine", label: "Fine", emoji: "👍" },
  { value: "pass", label: "Pass", emoji: "⏭️" },
];

const VOTE_SELECTED_CLASSES: Record<VoteValue, string> = {
  yes: "bg-emerald-100 border-emerald-500 text-emerald-800 font-semibold",
  fine: "bg-blue-100 border-blue-500 text-blue-800 font-semibold",
  pass: "bg-stone-200 border-stone-400 text-stone-600 font-semibold",
};

function VoteButtons({
  value,
  onChange,
}: {
  value: VoteValue | undefined;
  onChange: (v: VoteValue) => void;
}) {
  return (
    <div className="flex gap-2 mt-3">
      {VOTE_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all",
              selected
                ? VOTE_SELECTED_CLASSES[opt.value]
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
            )}
          >
            <span>{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ActivityCard({
  activity,
  vote,
  onVote,
}: {
  activity: Activity;
  vote: VoteValue | undefined;
  onVote: (v: VoteValue) => void;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl shadow-sm border overflow-hidden transition-all",
        vote === "yes" && "border-emerald-300 ring-1 ring-emerald-200",
        vote === "fine" && "border-blue-200",
        vote === "pass" && "border-stone-200 opacity-60",
        !vote && "border-stone-100"
      )}
    >
      <div className="relative aspect-video w-full">
        <Image
          src={activity.image}
          alt={activity.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          unoptimized
        />
      </div>
      <div className="p-4">
        <h3 className="font-bold text-stone-900 text-base leading-snug">
          {activity.title}
        </h3>
        {activity.note && (
          <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800 font-medium">
            {activity.note}
          </div>
        )}
        <ul className="mt-2 space-y-1">
          {activity.bullets.map((b) => (
            <li key={b} className="flex gap-2 text-sm text-stone-500">
              <span className="text-stone-300 shrink-0 mt-0.5">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <VoteButtons value={vote} onChange={onVote} />
      </div>
    </div>
  );
}

export function BigSkyIntake({ tripId }: Props) {
  const [activityVotes, setActivityVotes] = useState<
    Record<string, VoteValue>
  >({});
  const [chefNights, setChefNights] = useState<1 | 2>(1);
  const [chefVotes, setChefVotes] = useState<Record<string, VoteValue>>({});
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [openText, setOpenText] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [partySize, setPartySize] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter your name before submitting.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const answers: BigSkyAnswers = {
      name: name.trim(),
      email: email.trim(),
      partySize,
      activityVotes,
      chefNights,
      chefVotes,
      arrivalDate: arrivalDate || undefined,
      arrivalTime: arrivalTime || undefined,
      departureDate: departureDate || undefined,
      departureTime: departureTime || undefined,
      openText: openText.trim() || undefined,
    };

    try {
      await saveBigSkyAnswers(tripId, answers);
    } catch (err) {
      setIsSubmitting(false);
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    }
  };

  const activitiesByCategory = ACTIVITY_CATEGORIES.map((cat) => ({
    category: cat,
    activities: ACTIVITIES.filter((a) => a.category === cat),
  }));

  const totalVoted = Object.keys(activityVotes).length + Object.keys(chefVotes).length;
  const total = ACTIVITIES.length + CHEF_OPTIONS.length;

  return (
    <div className="min-h-dvh bg-stone-50">
      {/* Hero header */}
      <div className="relative h-72 sm:h-96 w-full overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1600&h=800&fit=crop"
          alt="Big Sky Montana mountains"
          fill
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-1">
            Family Trip Survey
          </p>
          <h1 className="text-white text-3xl sm:text-4xl font-extrabold leading-tight">
            Big Sky, Montana
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-white/80 text-sm">
            <span>July 18–25, 2026</span>
            <span className="hidden sm:inline text-white/40">·</span>
            <span>20 Moose Ridge Road</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        {/* Intro note */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-8">
          <p className="text-stone-600 text-sm leading-relaxed">
            We have <strong className="text-stone-900">6 full days</strong> to fill. Vote on
            what sounds fun — we&apos;ll build the schedule based on everyone&apos;s picks. No
            pressure to vote on everything, but the more you share the better the plan.
          </p>
          {totalVoted > 0 && (
            <p className="text-xs text-stone-400 mt-2">
              {totalVoted} of {total} items voted on
            </p>
          )}
        </div>

        {/* Activity voting by category */}
        {activitiesByCategory.map(({ category, activities }) => (
          <section key={category} className="mb-10">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">
              {category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  vote={activityVotes[activity.id]}
                  onVote={(v) =>
                    setActivityVotes((prev) => ({ ...prev, [activity.id]: v }))
                  }
                />
              ))}
            </div>
          </section>
        ))}

        {/* Private chef section */}
        <section className="mb-10">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">
            Private Chef Dinners
          </h2>
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-4">
            <p className="text-stone-700 text-sm font-medium mb-3">
              How many chef nights would you want?
            </p>
            <div className="flex gap-3">
              {([1, 2] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setChefNights(n)}
                  className={cn(
                    "px-5 py-2 rounded-full border text-sm font-medium transition-all",
                    chefNights === n
                      ? "bg-stone-900 border-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                  )}
                >
                  {n} night{n > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CHEF_OPTIONS.map((chef) => {
              const vote = chefVotes[chef.id];
              return (
                <div
                  key={chef.id}
                  className={cn(
                    "bg-white rounded-2xl border shadow-sm p-4 transition-all",
                    vote === "yes" && "border-emerald-300 ring-1 ring-emerald-200",
                    vote === "fine" && "border-blue-200",
                    vote === "pass" && "border-stone-200 opacity-60",
                    !vote && "border-stone-100"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-stone-900 text-sm">{chef.name}</p>
                      <p className="text-xs text-stone-400 font-medium uppercase tracking-wide mt-0.5">
                        {chef.style}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-stone-500 mt-2 leading-snug">
                    {chef.description}
                  </p>
                  <VoteButtons
                    value={vote}
                    onChange={(v) =>
                      setChefVotes((prev) => ({ ...prev, [chef.id]: v }))
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Flight info */}
        <section className="mb-10">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">
            Your Travel Dates (Optional)
          </h2>
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-stone-700 mb-2">
                  Arriving
                </p>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                    className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    min="2026-07-18"
                    max="2026-07-25"
                  />
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="w-28 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-700 mb-2">
                  Departing
                </p>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    min="2026-07-18"
                    max="2026-07-26"
                  />
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-28 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Open text */}
        <section className="mb-10">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">
            Anything Else?
          </h2>
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <label
              htmlFor="open-text"
              className="text-sm font-medium text-stone-700 block mb-2"
            >
              Other things you want to do, dietary needs, mobility notes, or anything else
              we should know
            </label>
            <textarea
              id="open-text"
              value={openText}
              onChange={(e) => setOpenText(e.target.value)}
              rows={4}
              placeholder="e.g. would love a white water rafting day, one person is gluten-free..."
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
            />
          </div>
        </section>

        {/* Your info */}
        <section className="mb-10">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">
            Your Info
          </h2>
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="your-name"
                  className="text-sm font-medium text-stone-700 block mb-1.5"
                >
                  Your name <span className="text-red-400">*</span>
                </label>
                <input
                  id="your-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First and last name"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
              <div>
                <label
                  htmlFor="your-email"
                  className="text-sm font-medium text-stone-700 block mb-1.5"
                >
                  Your email <span className="text-red-400">*</span>
                </label>
                <input
                  id="your-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
            </div>
            <div className="mt-5">
              <label
                htmlFor="party-size"
                className="text-sm font-medium text-stone-700 block mb-1.5"
              >
                How many in your party? (including kids)
              </label>
              <input
                id="party-size"
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(e) =>
                  setPartySize(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-32 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="pb-12">
          {error && (
            <p className="text-red-500 text-sm text-center mb-4" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-stone-900 text-white font-bold text-base py-4 hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? "Saving your votes\u2026" : "Submit my votes"}
          </button>
          <p className="text-center text-xs text-stone-400 mt-3">
            You can only submit once, but Andrew can adjust things based on your notes.
          </p>
        </div>
      </div>
    </div>
  );
}
