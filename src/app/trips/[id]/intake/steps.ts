export type StepOption = {
  value: string;
  label: string;
  emoji?: string;
  spanFull?: boolean;
};

export type Step = {
  id: string;
  heading: [string, string];
  subtitle: string;
  options: StepOption[];
  columns: 1 | 2;
};

export const steps: Step[] = [
  {
    id: "destination",
    heading: ["Desti-", "nation"],
    subtitle: "Where do you want to go?",
    columns: 1,
    options: [
      { value: "beach", label: "Beach" },
      { value: "big_city", label: "Big City Energy" },
      { value: "mountain", label: "Mountain Retreat" },
    ],
  },
  {
    id: "crew",
    heading: ["The", "Crew"],
    subtitle: "Who\u2019s coming along?",
    columns: 2,
    options: [
      { value: "solo", label: "Solo", emoji: "\u{1F920}" },
      { value: "couple", label: "Couple", emoji: "\u{1F469}\u200D\u2764\uFE0F\u200D\u{1F468}" },
      { value: "squad", label: "Whole Squad", emoji: "\u{1F525}", spanFull: true },
    ],
  },
  {
    id: "vibe",
    heading: ["Vibe", "Check"],
    subtitle: "What\u2019s the energy?",
    columns: 1,
    options: [
      { value: "relaxation", label: "Pure Relaxation" },
      { value: "action", label: "Action Packed" },
      { value: "food", label: "Food Coma" },
    ],
  },
];
