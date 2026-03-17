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

const RUST = "#D14F36";
const MUSTARD = "#EBB644";
const CREAM = "#F3EBE0";
const CARD_BG = "#EBE1D3";

const VOTE_OPTIONS: { value: VoteValue; label: string; emoji: string }[] = [
  { value: "yes", label: "Yes!", emoji: "✅" },
  { value: "fine", label: "Fine with it", emoji: "👍" },
  { value: "pass", label: "Pass", emoji: "⏭️" },
];

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
    <div className="mb-6">
      <div
        className="border-t-2 mb-4"
        style={{ borderColor: RUST }}
      />
      <h2
        className="text-2xl sm:text-3xl font-black uppercase tracking-tight"
        style={{
          color: RUST,
          fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
        }}
      >
        {title}
      </h2>
      <p className="text-sm mt-1 font-medium" style={{ color: RUST, opacity: 0.7 }}>
        {subtitle}
      </p>
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
    <div className="flex flex-wrap gap-2 mt-3">
      {VOTE_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        let bg = "transparent";
        let textColor = RUST;
        let borderColor = RUST;
        let opacity = 1;

        if (selected) {
          if (opt.value === "yes") {
            bg = RUST;
            textColor = CREAM;
            borderColor = RUST;
          } else if (opt.value === "fine") {
            bg = MUSTARD;
            textColor = RUST;
            borderColor = MUSTARD;
          } else {
            bg = CARD_BG;
            textColor = RUST;
            borderColor = RUST;
            opacity = 0.6;
          }
        }

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-all"
            style={{
              borderRadius: "999px",
              border: `1.5px solid ${borderColor}`,
              backgroundColor: bg,
              color: textColor,
              opacity,
              fontFamily: "system-ui, sans-serif",
            }}
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
  const borderColor = vote === "yes" ? MUSTARD : RUST;
  const cardOpacity = vote === "pass" ? 0.6 : 1;

  return (
    <div
      style={{
        backgroundColor: CARD_BG,
        border: `1.5px solid ${borderColor}`,
        borderRadius: "2px",
        overflow: "hidden",
        opacity: cardOpacity,
        transition: "opacity 0.15s",
      }}
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
        <h3
          className="font-black uppercase text-base leading-tight"
          style={{
            color: RUST,
            fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          {activity.title}
        </h3>
        {activity.note && (
          <div
            className="mt-2 px-3 py-1.5 text-sm font-semibold"
            style={{
              backgroundColor: MUSTARD,
              color: RUST,
              borderRadius: "2px",
            }}
          >
            {activity.note}
          </div>
        )}
        <ul className="mt-2 space-y-1">
          {activity.bullets.map((b) => (
            <li key={b} className="flex gap-2 text-sm" style={{ color: RUST, opacity: 0.8 }}>
              <span className="shrink-0 mt-0.5" style={{ color: RUST, opacity: 0.4 }}>•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        {activity.link && (
          <a
            href={activity.link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-sm underline underline-offset-2 font-medium"
            style={{ color: RUST }}
          >
            {activity.link.label} →
          </a>
        )}
        <VoteButtons value={vote} onChange={onVote} />
      </div>
    </div>
  );
}

function CompactVoteCard({
  title,
  subtitle,
  description,
  vote,
  onVote,
  link,
  linkLabel,
}: {
  title: string;
  subtitle?: string;
  description?: string;
  vote: VoteValue | undefined;
  onVote: (v: VoteValue) => void;
  link?: string;
  linkLabel?: string;
}) {
  const borderColor = vote === "yes" ? MUSTARD : RUST;
  const cardOpacity = vote === "pass" ? 0.6 : 1;

  return (
    <div
      style={{
        backgroundColor: CARD_BG,
        border: `1.5px solid ${borderColor}`,
        borderRadius: "2px",
        padding: "1rem",
        opacity: cardOpacity,
        transition: "opacity 0.15s",
      }}
    >
      <p
        className="font-black uppercase text-sm"
        style={{
          color: RUST,
          fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
        }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          className="text-sm font-bold uppercase tracking-wider mt-0.5"
          style={{ color: RUST, opacity: 0.5 }}
        >
          {subtitle}
        </p>
      )}
      {description && (
        <p className="text-sm mt-1.5 leading-snug" style={{ color: RUST, opacity: 0.8 }}>
          {description}
        </p>
      )}
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-1.5 text-sm underline underline-offset-2 font-medium"
          style={{ color: RUST }}
        >
          {linkLabel ?? "Website"} →
        </a>
      )}
      <VoteButtons value={vote} onChange={onVote} />
    </div>
  );
}

export function BigSkyIntake({ tripId }: Props) {
  const [activityVotes, setActivityVotes] = useState<Record<string, VoteValue>>({});
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
      setError("Please enter your first name before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const answers: BigSkyAnswers = {
      name: name.trim(),
      email: email.trim() || undefined,
      partySize: 1,
      activityVotes: { ...activityVotes, ...interestVotes },
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

  const inputStyle = {
    width: "100%",
    borderRadius: "2px",
    border: `1.5px solid ${RUST}`,
    backgroundColor: CREAM,
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    color: RUST,
    outline: "none",
    fontFamily: "system-ui, sans-serif",
  };

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: CREAM }}>
      {/* ═══════════════════════════════════════════════ */}
      {/* HEADER                                          */}
      {/* ═══════════════════════════════════════════════ */}
      <div
        className="px-5 py-6 sm:px-10 sm:py-8"
        style={{ backgroundColor: RUST }}
      >
        <p
          className="text-sm font-bold uppercase tracking-widest mb-3"
          style={{ color: MUSTARD, opacity: 0.85 }}
        >
          Goble Family
        </p>
        <h1
          className="text-5xl sm:text-7xl font-black uppercase leading-none"
          style={{
            color: CREAM,
            fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
            textShadow: `3px 3px 0 ${MUSTARD}`,
            letterSpacing: "-0.02em",
          }}
        >
          BIG SKY
        </h1>
        <p
          className="text-lg sm:text-2xl font-bold mt-2"
          style={{ color: CREAM, opacity: 0.9 }}
        >
          July 18 — 25, 2026
        </p>
        <p
          className="text-sm mt-1 font-medium"
          style={{ color: CREAM, opacity: 0.6 }}
        >
          20 Moose Ridge Road, Big Sky, MT
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        {/* ═══════════════════════════════════════════════ */}
        {/* YOUR INFO                                       */}
        {/* ═══════════════════════════════════════════════ */}
        <section className="mb-8">
          <div
            style={{
              backgroundColor: CARD_BG,
              border: `1.5px solid ${RUST}`,
              borderRadius: "2px",
              padding: "1.25rem",
            }}
          >
            {error && (
              <p
                className="text-sm mb-4 font-semibold"
                role="alert"
                style={{ color: RUST }}
              >
                {error}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="your-name"
                  className="text-sm font-bold uppercase tracking-wide block mb-1.5"
                  style={{ color: RUST }}
                >
                  First Name <span style={{ color: MUSTARD }}>*</span>
                </label>
                <input
                  id="your-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Andrew"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  htmlFor="your-email"
                  className="text-sm font-bold uppercase tracking-wide block mb-1.5"
                  style={{ color: RUST }}
                >
                  Email{" "}
                  <span
                    className="font-normal normal-case text-sm"
                    style={{ color: RUST, opacity: 0.6 }}
                  >
                    — optional, in case we need to reach you
                  </span>
                </label>
                <input
                  id="your-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* INTRO                                           */}
        {/* ═══════════════════════════════════════════════ */}
        <div className="mb-10">
          <p
            className="text-base sm:text-lg leading-relaxed font-medium"
            style={{ color: RUST }}
          >
            Mom &amp; Andrew have been putting together ideas for the trip. We&apos;ve
            got <strong>6 full days</strong> to fill — vote on what sounds good!
          </p>

          <div
            className="mt-4 p-4 space-y-2"
            style={{
              border: `1.5px solid ${RUST}`,
              borderRadius: "2px",
              backgroundColor: CARD_BG,
            }}
          >
            <p className="text-sm leading-relaxed font-medium" style={{ color: RUST }}>
              <strong>✅ Yes!</strong> — count me in
            </p>
            <p className="text-sm leading-relaxed font-medium" style={{ color: RUST }}>
              <strong>👍 Fine with it</strong> — I&apos;d go along if others want to
            </p>
            <p className="text-sm leading-relaxed font-medium" style={{ color: RUST }}>
              <strong>⏭️ Pass</strong> — not my thing, I&apos;d rather do something else
            </p>
          </div>

          <p
            className="text-sm mt-3 font-medium"
            style={{ color: RUST, opacity: 0.65 }}
          >
            No wrong answers — say Yes to everything if you want. The more you vote,
            the better the plan.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* PART 1: ACTIVITIES                              */}
        {/* ═══════════════════════════════════════════════ */}
        <SectionHeader
          title="Activities"
          subtitle="Here's what we've found so far. Vote on anything that sounds fun."
        />

        {activitiesByCategory.map(({ category, activities }) => (
          <section key={category} className="mb-10">
            <h3
              className="text-sm font-black uppercase tracking-widest mb-4"
              style={{ color: RUST, opacity: 0.5 }}
            >
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

        {/* Honorable mentions — activities */}
        <section className="mb-12">
          <h3
            className="text-lg font-black uppercase tracking-wide mb-1"
            style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
          >
            Honorable Mentions — Other Activity Ideas
          </h3>
          <p
            className="text-base mb-4 font-medium"
            style={{ color: RUST, opacity: 0.6 }}
          >
            A few more ideas we came across. Let us know if any of these jump out.
          </p>
          <div className="space-y-3">
            {INTEREST_QUESTIONS.map((q) => (
              <CompactVoteCard
                key={q.id}
                title={q.label}
                description={q.description}
                vote={interestVotes[q.id]}
                onVote={(v) =>
                  setInterestVotes((prev) => ({ ...prev, [q.id]: v }))
                }
              />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* PART 2: FOOD & DINING                           */}
        {/* ═══════════════════════════════════════════════ */}
        <SectionHeader
          title="Food & Dining"
          subtitle="We'll cook at the house most nights, but here are dinner-out options and private chef ideas."
        />

        {/* Restaurants */}
        <section className="mb-10">
          <h3
            className="text-sm font-black uppercase tracking-widest mb-1"
            style={{ color: RUST, opacity: 0.5 }}
          >
            Restaurants Near the House
          </h3>
          <p
            className="text-sm mb-4 font-medium"
            style={{ color: RUST, opacity: 0.55 }}
          >
            For nights we eat out. Vote on places that look good — we&apos;ll try to
            hit the favorites.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DINNER_SPOTS.map((spot) => (
              <CompactVoteCard
                key={spot.id}
                title={spot.name}
                subtitle={spot.vibe}
                description={spot.bullets.join(" · ")}
                vote={dinnerVotes[spot.id]}
                onVote={(v) =>
                  setDinnerVotes((prev) => ({ ...prev, [spot.id]: v }))
                }
                link={spot.link}
                linkLabel="Website"
              />
            ))}
          </div>
        </section>

        {/* Dinner honorable mentions */}
        <section className="mb-10">
          <h3
            className="text-lg font-black uppercase tracking-wide mb-1"
            style={{ color: RUST, fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif" }}
          >
            Honorable Mentions — Other Dinner Ideas
          </h3>
          <p
            className="text-base mb-4 font-medium"
            style={{ color: RUST, opacity: 0.6 }}
          >
            A few more spots that came up in our research.
          </p>
          <div className="space-y-3">
            {HONORABLE_DINNERS.map((d) => (
              <CompactVoteCard
                key={d.id}
                title={d.label}
                description={d.description}
                vote={honorableDinnerVotes[d.id]}
                onVote={(v) =>
                  setHonorableDinnerVotes((prev) => ({ ...prev, [d.id]: v }))
                }
              />
            ))}
          </div>
        </section>

        {/* Private chef sub-section */}
        <section className="mb-12">
          <h3
            className="text-sm font-black uppercase tracking-widest mb-1"
            style={{ color: RUST, opacity: 0.5 }}
          >
            Private Chef at the House
          </h3>
          <p
            className="text-sm mb-4 font-medium"
            style={{ color: RUST, opacity: 0.55 }}
          >
            We&apos;re hiring a private chef to cook at the house for a couple nights.
            Vote on which style sounds good.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CHEF_OPTIONS.map((chef) => (
              <CompactVoteCard
                key={chef.id}
                title={chef.name}
                subtitle={chef.style}
                description={chef.description}
                vote={chefVotes[chef.id]}
                onVote={(v) =>
                  setChefVotes((prev) => ({ ...prev, [chef.id]: v }))
                }
                link={chef.link}
                linkLabel="Website"
              />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* PART 3: YOUR IDEAS                              */}
        {/* ═══════════════════════════════════════════════ */}
        <SectionHeader
          title="Your Ideas"
          subtitle="Anything else on your mind? Restaurants, activities, or things you've heard about — drop it here."
        />

        <section className="mb-10">
          <div
            style={{
              backgroundColor: CARD_BG,
              border: `1.5px solid ${RUST}`,
              borderRadius: "2px",
              padding: "1.25rem",
            }}
          >
            <textarea
              id="open-text"
              value={openText}
              onChange={(e) => setOpenText(e.target.value)}
              rows={4}
              placeholder="e.g. I heard there's a great pizza place in town, would love to try river tubing, one person is gluten-free..."
              style={{
                ...inputStyle,
                resize: "none",
              }}
            />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* SUBMIT                                          */}
        {/* ═══════════════════════════════════════════════ */}
        <div className="pb-16">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full font-black uppercase text-base py-4 transition-all active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: MUSTARD,
              color: RUST,
              border: `2px solid ${RUST}`,
              borderRadius: "2px",
              fontFamily: "'Arial Black', Impact, 'system-ui', sans-serif",
              letterSpacing: "0.05em",
              boxShadow: `0 4px 0 ${RUST}`,
            }}
          >
            {isSubmitting ? "Saving your votes…" : "Submit My Votes"}
          </button>
          <p
            className="text-center text-sm mt-3 font-medium"
            style={{ color: RUST, opacity: 0.5 }}
          >
            You can resubmit with the same name if you change your mind.
          </p>
        </div>
      </div>
    </div>
  );
}
