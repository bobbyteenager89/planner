"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChatInterfaceWithPath } from "@/components/chat/chat-interface";

type OnboardingPath = "brainstorm" | "draft" | "research";

const PATH_OPTIONS = [
  {
    id: "brainstorm" as const,
    label: "I'm dreaming",
    subtitle: "Not sure where or when yet. Let's figure it out together.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-8"
      >
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        <path d="M20 3v4" />
        <path d="M22 5h-4" />
        <path d="M4 17v2" />
        <path d="M5 18H3" />
      </svg>
    ),
  },
  {
    id: "draft" as const,
    label: "I have a plan",
    subtitle: "I know where we're going. Help me fill in the details.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-8"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
  {
    id: "research" as const,
    label: "I've done research",
    subtitle: "I have links, lists, and ideas. Help me organize them.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-8"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
];

interface OnboardClientProps {
  tripId: string;
  tripTitle: string;
  existingPath: OnboardingPath | null;
  existingConversation: { role: "user" | "assistant"; content: string }[];
}

export function OnboardClient({
  tripId,
  tripTitle,
  existingPath,
  existingConversation,
}: OnboardClientProps) {
  const [selectedPath, setSelectedPath] = useState<OnboardingPath | null>(existingPath);
  const [pendingPath, setPendingPath] = useState<OnboardingPath | null>(null);

  const endpoint = `/api/trips/${tripId}/chat`;

  function handlePathSelect(pathId: OnboardingPath) {
    setPendingPath(pathId);
    setSelectedPath(pathId);
  }

  if (!selectedPath) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">{tripTitle}</h1>
          <p className="mt-3 text-muted-foreground">
            Let&apos;s get started planning. Where are you coming from?
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {PATH_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => handlePathSelect(option.id)}
              className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              <Card className="h-full cursor-pointer transition-all duration-150 hover:ring-2 hover:ring-primary hover:shadow-md hover:-translate-y-0.5">
                <CardHeader>
                  <div className="mb-2 text-muted-foreground">{option.icon}</div>
                  <CardTitle>{option.label}</CardTitle>
                  <CardDescription>{option.subtitle}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const selectedOption = PATH_OPTIONS.find((p) => p.id === selectedPath);

  return (
    <div className="flex h-screen flex-col">
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <div>
          <h1 className="text-base font-semibold leading-tight">{tripTitle}</h1>
          <p className="text-xs text-muted-foreground">
            {selectedOption?.label}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatInterfaceWithPath
          tripId={tripId}
          endpoint={endpoint}
          initialMessages={existingConversation}
          placeholder="Tell me more about your trip..."
          initialPath={pendingPath ?? undefined}
        />
      </div>
    </div>
  );
}
