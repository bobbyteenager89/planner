"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function InviteForm({ tripId }: { tripId: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/trips/${tripId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setMessage("Invite sent!");
      setEmail("");
    } else {
      const data = await res.json();
      setMessage(data.error || "Failed to send invite");
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Invite Someone</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInvite} className="space-y-3">
          <Input
            type="email"
            placeholder="friend@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Invite"}
          </Button>
          {message && (
            <p className="text-center text-sm text-muted-foreground">
              {message}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
