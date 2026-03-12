"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { steps } from "./steps";
import { Sparkles } from "./sparkles";
import { saveIntakeAnswers } from "./actions";

type Props = {
  participantId: string;
  tripTitle: string;
  tripId: string;
};

export function IntakeQuestionnaire({ participantId, tripTitle, tripId }: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [animClass, setAnimClass] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const step = steps[currentStep];
  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps - 1;
  const hasAnswer = !!answers[step.id];

  const selectOption = useCallback(
    (value: string) => {
      setAnswers((prev) => ({ ...prev, [step.id]: value }));
      setError(null);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
    },
    [step.id]
  );

  const goNext = useCallback(async () => {
    if (!hasAnswer) return;

    // Cancel any in-flight transition timers (prevents rapid-click crash)
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (isLastStep) {
      setIsSubmitting(true);
      setError(null);
      try {
        await saveIntakeAnswers(participantId, answers);
        setIsSubmitting(false);
        router.push(`/trips/${tripId}`);
      } catch {
        setIsSubmitting(false);
        setError("Something went wrong saving your answers. Please try again.");
      }
      return;
    }

    setAnimClass("step-exit");
    const t1 = setTimeout(() => {
      setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
      setAnimClass("step-enter");
      const t2 = setTimeout(() => setAnimClass(null), 350);
      timers.current.push(t2);
    }, 350);
    timers.current.push(t1);
  }, [hasAnswer, isLastStep, participantId, answers, router, tripId, totalSteps]);

  const progressWidth = ((currentStep + 1) / totalSteps) * 100;
  const questionLabel = `${step.heading[0]}${step.heading[1]}`;

  return (
    <div className="min-h-dvh bg-neutral-950 flex items-center justify-center">
      <div className="intake-root w-full max-w-[430px] h-dvh sm:h-[932px] sm:rounded-3xl relative isolate">
        <div className="absolute inset-0 bg-[#015e3f] sm:rounded-3xl sm:overflow-hidden">
          <Sparkles />

          <div className="relative z-10 flex flex-col h-full p-5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {/* ── Liquid glass top panel ── */}
            <div className="liquid-glass rounded-3xl p-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => router.push(`/trips/${tripId}`)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white/80 text-sm hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                  aria-label="Close"
                >
                  &#10005;
                </button>
                <div
                  className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={currentStep + 1}
                  aria-valuemin={1}
                  aria-valuemax={totalSteps}
                  aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${progressWidth}%`,
                      background: "linear-gradient(to right, #e61359, #fa6614)",
                    }}
                  />
                </div>
                <span className="text-xs text-white/40 tabular-nums shrink-0">
                  {currentStep + 1}/{totalSteps}
                </span>
              </div>

              <h1 className="text-white text-2xl font-extrabold text-balance leading-tight">
                {questionLabel}
              </h1>
              <p className="text-white/50 text-sm mt-1">{step.subtitle}</p>
            </div>

            {/* Bug #7 fix: sr-only live region for step announcements instead of aria-live on main */}
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              Step {currentStep + 1} of {totalSteps}: {step.subtitle}
            </div>

            {/* ── Options ── */}
            <main className={cn("flex-1 flex flex-col justify-center py-6", animClass)}>
              <div
                className={cn(
                  "w-full",
                  step.columns === 2
                    ? "grid grid-cols-2 gap-3"
                    : "flex flex-col gap-3"
                )}
                role="radiogroup"
                aria-label={step.subtitle}
              >
                {step.options.map((opt) => {
                  const isSelected = answers[step.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => selectOption(opt.value)}
                      role="radio"
                      aria-checked={isSelected}
                      className={cn(
                        "option-card rounded-2xl px-5 py-4 text-left font-bold text-lg flex items-center gap-3 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none",
                        opt.spanFull && "col-span-2",
                        isSelected
                          ? "selected"
                          : "bg-white text-neutral-900"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                          isSelected
                            ? "border-white bg-white"
                            : "border-neutral-400"
                        )}
                      >
                        {isSelected && (
                          <span className="size-2.5 rounded-full bg-[#e61359]" />
                        )}
                      </span>
                      {opt.emoji && <span className="text-2xl">{opt.emoji}</span>}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </main>

            {/* ── Footer ── */}
            <footer className="pt-4 pb-2">
              {error && (
                <p className="text-red-300 text-sm text-center mb-3" role="alert">
                  {error}
                </p>
              )}
              <div className="flex justify-end">
                <button
                  onClick={goNext}
                  disabled={!hasAnswer || isSubmitting}
                  className="intake-btn rounded-full bg-[#fa6614] px-8 py-3 font-extrabold text-white text-lg -rotate-2 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  {isSubmitting
                    ? "Saving\u2026"
                    : isLastStep
                      ? "Finish"
                      : "Next"}
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
