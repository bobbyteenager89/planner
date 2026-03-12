import { notFound } from "next/navigation";
import { IntakeQuestionnaire } from "../[id]/intake/intake-questionnaire";

/**
 * Demo page — renders the intake questionnaire without auth.
 * Dev-only: returns 404 in production.
 */
export default function IntakeDemoPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <IntakeQuestionnaire
      participantId="demo-participant"
      tripTitle="Demo Trip"
      tripId="demo"
    />
  );
}
