"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GenerateView } from "./generate-view";
import { ItineraryView } from "./itinerary-view";

export function TripContent({
  tripId,
  tripStatus,
  isOwner,
  completedCount,
  tripDays,
  viewerStatus,
}: {
  tripId: string;
  tripStatus: string;
  isOwner: boolean;
  completedCount: number;
  tripDays: number;
  viewerStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(tripStatus);

  const handleGenerateComplete = () => {
    setStatus("reviewing");
    router.refresh();
  };

  const handleRegenerate = () => {
    setStatus("generating");
  };

  // Draft / Onboarding — owner only
  if ((status === "draft" || status === "onboarding") && isOwner) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {status === "draft" ? "Ready to start planning your trip?" : "Onboarding in progress"}
            </p>
            <Link href={`/trips/${tripId}/onboard`}>
              <Button>{status === "draft" ? "Start Planning" : "Continue Planning"}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Intake — different views for owner vs participant
  if (status === "intake") {
    if (isOwner) {
      return (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {completedCount === 0
                    ? "Waiting for participants to complete their intake."
                    : `${completedCount} participant${completedCount > 1 ? "s" : ""} completed intake.`}
                </p>
              </div>
              {completedCount > 0 && (
                <GenerateView
                  tripId={tripId}
                  tripDays={tripDays}
                  onComplete={handleGenerateComplete}
                />
              )}
            </div>
          </CardContent>
        </Card>
      );
    }
    // Participant view
    if (viewerStatus === "completed") {
      return (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              You&apos;ve completed your intake. Waiting for others...
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Share your travel preferences.</p>
            <Link href={`/trips/${tripId}/intake`}>
              <Button>Complete Your Intake</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generating
  if (status === "generating") {
    if (isOwner) {
      return (
        <GenerateView
          tripId={tripId}
          tripDays={tripDays}
          onComplete={handleGenerateComplete}
        />
      );
    }
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Your itinerary is being created...</p>
        </CardContent>
      </Card>
    );
  }

  // Reviewing
  if (status === "reviewing") {
    return (
      <ItineraryView
        tripId={tripId}
        isOwner={isOwner}
        onRegenerate={handleRegenerate}
      />
    );
  }

  // Finalized (placeholder for Phase 5)
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">Trip finalized.</p>
      </CardContent>
    </Card>
  );
}
