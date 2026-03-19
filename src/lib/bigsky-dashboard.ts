// src/lib/bigsky-dashboard.ts

import {
  ACTIVITIES,
  DINNER_SPOTS,
  CHEF_OPTIONS,
} from "@/app/trips/[id]/intake/bigsky-config";

export interface VoteTally {
  id: string;
  label: string;
  yes: number;
  fine: number;
  pass: number;
  total: number;
  enthusiasm: number;
  voters: { name: string; vote: "yes" | "fine" | "pass" }[];
  conflicted: boolean;
  conflictPairs: { yesVoter: string; passVoter: string }[];
}

export interface AggregatedVotes {
  activities: VoteTally[];
  restaurants: VoteTally[];
  chefs: VoteTally[];
  openTextEntries: { name: string; text: string }[];
  participantCount: number;
  completedCount: number;
}

interface RawPreference {
  rawData: unknown;
  participantName: string;
}

// Lookup maps for resolving IDs to display names
const ACTIVITY_LABELS: Record<string, string> = {};
for (const a of ACTIVITIES) {
  ACTIVITY_LABELS[a.id] = a.title;
}

const DINNER_LABELS: Record<string, string> = {};
for (const d of DINNER_SPOTS) {
  DINNER_LABELS[d.id] = d.name;
}

const CHEF_LABELS: Record<string, string> = {};
for (const c of CHEF_OPTIONS) {
  CHEF_LABELS[c.id] = c.name;
}

function humanizeId(id: string): string {
  return id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function tallyVotes(
  allVotes: Record<string, Record<string, "yes" | "fine" | "pass">>,
  labelMap: Record<string, string>,
  names: Record<string, string>
): VoteTally[] {
  const tallies: Record<string, VoteTally> = {};

  for (const [participantKey, votes] of Object.entries(allVotes)) {
    const name = names[participantKey] || "Unknown";
    for (const [itemId, vote] of Object.entries(votes)) {
      if (!tallies[itemId]) {
        tallies[itemId] = {
          id: itemId,
          label: labelMap[itemId] || humanizeId(itemId),
          yes: 0,
          fine: 0,
          pass: 0,
          total: 0,
          enthusiasm: 0,
          voters: [],
          conflicted: false,
          conflictPairs: [],
        };
      }
      tallies[itemId][vote]++;
      tallies[itemId].total++;
      tallies[itemId].voters.push({ name, vote });
    }
  }

  // Calculate enthusiasm, detect conflicts, and sort
  return Object.values(tallies)
    .map((t) => {
      const yesVoters = t.voters.filter((v) => v.vote === "yes").map((v) => v.name);
      const passVoters = t.voters.filter((v) => v.vote === "pass").map((v) => v.name);
      const conflicted = yesVoters.length > 0 && passVoters.length > 0;
      const conflictPairs: { yesVoter: string; passVoter: string }[] = [];
      if (conflicted) {
        for (const y of yesVoters) {
          for (const p of passVoters) {
            conflictPairs.push({ yesVoter: y, passVoter: p });
          }
        }
      }
      return {
        ...t,
        enthusiasm: t.yes + t.fine * 0.5,
        conflicted,
        conflictPairs,
      };
    })
    .sort((a, b) => b.enthusiasm - a.enthusiasm);
}

export function aggregateBigSkyVotes(
  prefs: RawPreference[]
): AggregatedVotes {
  const activityVotesAll: Record<string, Record<string, "yes" | "fine" | "pass">> = {};
  const dinnerVotesAll: Record<string, Record<string, "yes" | "fine" | "pass">> = {};
  const chefVotesAll: Record<string, Record<string, "yes" | "fine" | "pass">> = {};
  const names: Record<string, string> = {};
  const openTextEntries: { name: string; text: string }[] = [];

  let completedCount = 0;

  for (let i = 0; i < prefs.length; i++) {
    const { rawData, participantName } = prefs[i];
    if (!rawData || typeof rawData !== "object") continue;

    const data = rawData as Record<string, unknown>;
    if (data.surveyType !== "bigsky") continue;

    completedCount++;
    const key = String(i);
    names[key] = participantName || "Anonymous";

    if (data.activityVotes && typeof data.activityVotes === "object") {
      activityVotesAll[key] = data.activityVotes as Record<string, "yes" | "fine" | "pass">;
    }

    if (data.dinnerVotes && typeof data.dinnerVotes === "object") {
      dinnerVotesAll[key] = data.dinnerVotes as Record<string, "yes" | "fine" | "pass">;
    }

    if (data.chefVotes && typeof data.chefVotes === "object") {
      chefVotesAll[key] = data.chefVotes as Record<string, "yes" | "fine" | "pass">;
    }

    if (data.openText && typeof data.openText === "string" && data.openText.trim()) {
      openTextEntries.push({ name: names[key], text: data.openText.trim() });
    }
  }

  return {
    activities: tallyVotes(activityVotesAll, ACTIVITY_LABELS, names),
    restaurants: tallyVotes(dinnerVotesAll, DINNER_LABELS, names),
    chefs: tallyVotes(chefVotesAll, CHEF_LABELS, names),
    openTextEntries,
    participantCount: prefs.length,
    completedCount,
  };
}
