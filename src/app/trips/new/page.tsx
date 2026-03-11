"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function NewTripPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        destination: form.get("destination") || null,
        startDate: form.get("startDate") || null,
        endDate: form.get("endDate") || null,
      }),
    });

    if (res.ok) {
      const { id } = await res.json();
      router.push(`/trips/${id}`);
    } else {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold tracking-tight">
            Plan a New Trip
          </h1>
          <p className="text-sm text-muted-foreground">
            Start with the basics — you can figure out the rest with AI.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Trip name</Label>
              <Input
                id="title"
                name="title"
                placeholder="Spring Break 2026"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">
                Destination{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="destination"
                name="destination"
                placeholder="Tulum, Mexico"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  Start date{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">
                  End date{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input id="endDate" name="endDate" type="date" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Trip"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
