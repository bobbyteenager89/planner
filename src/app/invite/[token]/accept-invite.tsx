"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AcceptInvite({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const [inputEmail, setInputEmail] = useState(email);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("resend", {
      email: inputEmail,
      callbackUrl: `/api/invite/accept?token=${token}`,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        Sign in to share your preferences
      </p>
      <Input
        type="email"
        value={inputEmail}
        onChange={(e) => setInputEmail(e.target.value)}
        required
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending link..." : "Sign in with email"}
      </Button>
    </form>
  );
}
