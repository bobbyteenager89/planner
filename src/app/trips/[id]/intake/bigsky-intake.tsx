"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ACTIVITIES,
  CHEF_OPTIONS,
  DINNER_SPOTS,
  ACTIVITY_CATEGORIES,
  type Activity,
} from "./bigsky-config";
import { saveBigSkyAnswers, type BigSkyAnswers } from "./bigsky-actions";

type VoteValue = "yes" | "fine" | "pass";

interface Props {
  tripId: string;
}

const VOTE_OPTIONS: { value: VoteValue; label: string; emoji: string }[] = [
  { value: "yes", label: "Yes!", emoji: "✅" },
  { value: "fine", label: "Fine with it", emoji: "👍" },
  { value: "pass", label: "Pass", emoji: "⏭️" },
];

const VOTE_SELECTED_CLASSES: Record<VoteValue, string> = {
  yes: "bg-emerald-100 border-emerald-500 text-emerald-800 font-semibold",
  fine: "bg-blue-100 border-blue-500 text-blue-800 font-semibold",
  pass: "bg-stone-200 border-stone-400 text-stone-600 font-semibold",
};

const INTEREST_QUESTIONS = [
  { id: "spa-day", label: "Spa Day", description: "Massages, hot tubs, relaxation at a local spa" },
  { id: "whitewater-rafting", label: "Whitewater Rafting", description: "Half-day trip on the Gallatin River — Class II-IV rapids" },
  { id: "mountain-biking", label: "Mountain Biking", description: "Trail rides at Big Sky Resort — rentals available" },
  { id: "cooking-class", label: "Cooking Class", description: "Montana-themed group cooking experience" },
  { id: "stargazing", label: "Stargazing Night", description: "Big Sky has some of the darkest skies in the lower 48" },
  { id: "river-tubing", label: "River Tubing", description: "Lazy float down the Gallatin — tubes available for rent" },
  { id: "scenic-drive", label: "Beartooth Highway Drive", description: "One of the most scenic drives in America — mountain passes and alpine lakes" },
];

const HONORABLE_DINNERS = [
  { id: "buck-t4", label: "Buck's T-4 Lodge", description: "Upscale Montana lodge dining — game meats, local fish, great cocktails" },
  { id: "rainbow-ranch", label: "Rainbow Ranch Lodge", description: "Riverside fine dining on the Gallatin — stunning patio, prix fixe available" },
  { id: "gallatin-riverhouse", label: "Gallatin Riverhouse Grill", description: "Casual burgers and BBQ right on the river — big outdoor deck" },
  { id: "ousel-falls", label: "Ousel & Spur Pizza", description: "Wood-fired pizza and salads in Town Center — great for kids" },
];

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900">{title}</h2>
      <p className="text-stone-500 text-sm mt-1">{subtitle}</p>
    </div>
  );
}

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
      <div className="aspect-video w-full overflow-hidden">
        <img
          src={activity.image}
          alt={activity.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <h3 className="font-bold text-stone-900 text-lg leading-snug">
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
        {activity.link && (
          <a
            href={activity.link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
          >
            {activity.link.label} →
          </a>
        )}
        <VoteButtons value={vote} onChange={onVote} />
      </div>
    </div>
  );
}

export function BigSkyIntake({ tripId }: Props) {
  const [activityVotes, setActivityVotes] = useState<Record<string, VoteValue>>({});
  const [chefNights, setChefNights] = useState<1 | 2>(1);
  const [chefVotes, setChefVotes] = useState<Record<string, VoteValue>>({});
  const [dinnerVotes, setDinnerVotes] = useState<Record<string, VoteValue>>({});
  const [interestVotes, setInterestVotes] = useState<Record<string, VoteValue>>({});
  const [honorableDinnerVotes, setHonorableDinnerVotes] = useState<Record<string, VoteValue>>({});
  const [openText, setOpenText] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter your name before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const answers: BigSkyAnswers = {
      name: name.trim(),
      email: email.trim(),
      partySize: 1,
      activityVotes: { ...activityVotes, ...interestVotes },
      chefNights,
      chefVotes,
      dinnerVotes: { ...dinnerVotes, ...honorableDinnerVotes },
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

  return (
    <div className="min-h-dvh bg-stone-50">
      {/* Hero header */}
      <div className="relative h-72 sm:h-96 w-full overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1472396961693-142e6e269027?w=1600&q=80"
          alt="Big Sky Montana mountains"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <h1 className="text-white text-3xl sm:text-5xl font-extrabold leading-tight">
            Big Sky, Montana
          </h1>
          <p className="text-white text-lg sm:text-2xl font-semibold mt-1">
            July 18 – 25, 2026
          </p>
          <p className="text-white/70 text-sm sm:text-base mt-1">
            20 Moose Ridge Road, Big Sky, MT
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        {/* Your info — at the top */}
        <section className="mb-6">
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            {error && (
              <p className="text-red-500 text-sm mb-4 font-medium" role="alert">
                {error}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="your-name" className="text-sm font-medium text-stone-700 block mb-1.5">
                  Your name <span className="text-red-400">*</span>
                </label>
                <input
                  id="your-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First and last"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
              <div>
                <label htmlFor="your-email" className="text-sm font-medium text-stone-700 block mb-1.5">
                  Email <span className="text-red-400">*</span>
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
          </div>
        </section>

        {/* Intro */}
        <div className="mb-10">
          <p className="text-stone-700 text-base sm:text-lg leading-relaxed">
            Hey! Mom and Andrew have been researching activities and food for the trip.
            We&apos;ve got <strong>6 full days</strong> to fill and want everyone&apos;s
            input before we put the schedule together. Scroll through and vote on what
            sounds good to you!
          </p>
          <div className="mt-4 bg-white rounded-xl border border-stone-100 p-4 space-y-2">
            <p className="text-stone-700 text-sm leading-relaxed">
              <strong className="text-emerald-700">✅ Yes!</strong> — I want to do this, count me in
            </p>
            <p className="text-stone-700 text-sm leading-relaxed">
              <strong className="text-blue-700">👍 Fine with it</strong> — I&apos;d happily go along if others want to
            </p>
            <p className="text-stone-700 text-sm leading-relaxed">
              <strong className="text-stone-500">⏭️ Pass</strong> — Not my thing — I&apos;d rather hang back or do something else during this one
            </p>
          </div>
          <p className="text-stone-500 text-sm mt-3">
            There are no wrong answers and it&apos;s totally fine to say &quot;Yes!&quot; to
            everything. The more you vote, the better we can plan.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* PART 1: ACTIVITIES                              */}
        {/* ═══════════════════════════════════════════════ */}
        <div className="border-t-2 border-stone-200 pt-8 mb-6">
          <SectionHeader
            title="🏔️ Activities"
            subtitle="Here's what we've found so far. Vote on anything that sounds fun."
          />
        </div>

        {/* Activity voting by category */}
        {activitiesByCategory.map(({ category, activities }) => (
          <section key={category} className="mb-10">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">
              {category}
            </h3>
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

        {/* Activity honorable mentions */}
        <section className="mb-10">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
            Honorable Mentions — Other Activity Ideas
          </h3>
          <p className="text-stone-500 text-xs mb-4">
            A few more ideas we came across. Let us know if any of these jump out.
          </p>
          <div className="space-y-3">
            {INTEREST_QUESTIONS.map((q) => {
              const vote = interestVotes[q.id];
              return (
                <div
                  key={q.id}
                  className={cn(
                    "bg-white rounded-xl border p-4 transition-all",
                    vote === "yes" && "border-emerald-300 ring-1 ring-emerald-200",
                    vote === "fine" && "border-blue-200",
                    vote === "pass" && "border-stone-200 opacity-60",
                    !vote && "border-stone-100"
                  )}
                >
                  <p className="font-bold text-stone-900 text-sm">{q.label}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{q.description}</p>
                  <VoteButtons
                    value={vote}
                    onChange={(v) =>
                      setInterestVotes((prev) => ({ ...prev, [q.id]: v }))
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* PART 2: FOOD                                    */}
        {/* ═══════════════════════════════════════════════ */}
        <div className="border-t-2 border-stone-200 pt-8 mb-6">
          <SectionHeader
            title="🍽️ Food & Dining"
            subtitle="We'll be cooking at the house most nights, but here are some dinner-out options and private chef ideas."
          />
        </div>

        {/* Restaurants */}
        <section className="mb-10">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
            Restaurants Near the House
          </h3>
          <p className="text-stone-500 text-xs mb-4">
            For nights we eat out. Vote on places that look good — we&apos;ll try to hit the favorites.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DINNER_SPOTS.map((spot) => {
              const vote = dinnerVotes[spot.id];
              return (
                <div
                  key={spot.id}
                  className={cn(
                    "bg-white rounded-xl border p-4 transition-all",
                    vote === "yes" && "border-emerald-300 ring-1 ring-emerald-200",
                    vote === "fine" && "border-blue-200",
                    vote === "pass" && "border-stone-200 opacity-60",
                    !vote && "border-stone-100"
                  )}
                >
                  <p className="font-bold text-stone-900 text-sm">{spot.name}</p>
                  <p className="text-xs text-stone-400 font-medium uppercase tracking-wide mt-0.5">
                    {spot.vibe}
                  </p>
                  <ul className="mt-2 space-y-0.5">
                    {spot.bullets.map((b) => (
                      <li key={b} className="flex gap-2 text-xs text-stone-500">
                        <span className="text-stone-300 shrink-0">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  {spot.link && (
                    <a
                      href={spot.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1.5 text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
                    >
                      Website →
                    </a>
                  )}
                  <VoteButtons
                    value={vote}
                    onChange={(v) =>
                      setDinnerVotes((prev) => ({ ...prev, [spot.id]: v }))
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Dinner honorable mentions */}
        <section className="mb-10">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
            Honorable Mentions — Other Dinner Ideas
          </h3>
          <p className="text-stone-500 text-xs mb-4">
            A few more spots that came up in our research.
          </p>
          <div className="space-y-3">
            {HONORABLE_DINNERS.map((d) => {
              const vote = honorableDinnerVotes[d.id];
              return (
                <div
                  key={d.id}
                  className={cn(
                    "bg-white rounded-xl border p-4 transition-all",
                    vote === "yes" && "border-emerald-300 ring-1 ring-emerald-200",
                    vote === "fine" && "border-blue-200",
                    vote === "pass" && "border-stone-200 opacity-60",
                    !vote && "border-stone-100"
                  )}
                >
                  <p className="font-bold text-stone-900 text-sm">{d.label}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{d.description}</p>
                  <VoteButtons
                    value={vote}
                    onChange={(v) =>
                      setHonorableDinnerVotes((prev) => ({ ...prev, [d.id]: v }))
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Private chef sub-section */}
        <section className="mb-10">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
            Private Chef at the House
          </h3>
          <p className="text-stone-500 text-xs mb-4">
            We&apos;re going to hire a private chef to cook at the house for 1–2 nights.
            Vote on which style sounds best.
          </p>
          <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-4 mb-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CHEF_OPTIONS.map((chef) => {
              const vote = chefVotes[chef.id];
              return (
                <div
                  key={chef.id}
                  className={cn(
                    "bg-white rounded-xl border p-4 transition-all",
                    vote === "yes" && "border-emerald-300 ring-1 ring-emerald-200",
                    vote === "fine" && "border-blue-200",
                    vote === "pass" && "border-stone-200 opacity-60",
                    !vote && "border-stone-100"
                  )}
                >
                  <p className="font-bold text-stone-900 text-sm">{chef.name}</p>
                  <p className="text-xs text-stone-400 font-medium uppercase tracking-wide mt-0.5">
                    {chef.style}
                  </p>
                  <p className="text-sm text-stone-500 mt-2 leading-snug">
                    {chef.description}
                  </p>
                  {chef.link && (
                    <a
                      href={chef.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1.5 text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
                    >
                      Website →
                    </a>
                  )}
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

        {/* ═══════════════════════════════════════════════ */}
        {/* PART 3: YOUR INPUT                              */}
        {/* ═══════════════════════════════════════════════ */}
        <div className="border-t-2 border-stone-200 pt-8 mb-6">
          <SectionHeader
            title="💬 Your Ideas"
            subtitle="Anything else on your mind? Restaurants, activities, or things you've heard about — drop it here."
          />
        </div>

        <section className="mb-10">
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <textarea
              id="open-text"
              value={openText}
              onChange={(e) => setOpenText(e.target.value)}
              rows={4}
              placeholder="e.g. I heard there's a great pizza place in town, would love to try river tubing, one person is gluten-free..."
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
            />
          </div>
        </section>

        {/* Submit */}
        <div className="pb-12">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-stone-900 text-white font-bold text-base py-4 hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? "Saving your votes…" : "Submit my votes"}
          </button>
          <p className="text-center text-xs text-stone-400 mt-3">
            You can resubmit with the same email if you change your mind.
          </p>
        </div>
      </div>
    </div>
  );
}
