import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, participants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.AUTH_RESEND_KEY);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tripId } = await params;
  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Verify ownership
  const [trip] = await db().select().from(trips).where(eq(trips.id, tripId));
  if (!trip || trip.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check if already invited
  const [existing] = await db()
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.tripId, tripId),
        eq(participants.email, email.toLowerCase())
      )
    );

  if (existing) {
    return NextResponse.json(
      { error: "Already invited" },
      { status: 400 }
    );
  }

  const inviteToken = randomBytes(32).toString("hex");
  const baseUrl = process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  await db().insert(participants).values({
    tripId,
    email: email.toLowerCase(),
    role: "participant",
    status: "invited",
    inviteToken,
  });

  // Send invite email
  try {
    await getResend().emails.send({
      from: process.env.EMAIL_FROM || "Planner <onboarding@resend.dev>",
      to: email.toLowerCase(),
      subject: `You're invited to plan: ${trip.title}`,
      html: `
        <h2>You've been invited to help plan a trip!</h2>
        <p><strong>${escapeHtml(session.user.name || session.user.email || "Someone")}</strong> invited you to help plan <strong>${escapeHtml(trip.title)}</strong>.</p>
        ${trip.destination ? `<p>Destination: ${escapeHtml(trip.destination)}</p>` : ""}
        <p><a href="${baseUrl}/invite/${inviteToken}">Click here to join and share your preferences</a></p>
      `,
    });
  } catch {
    // Email sending failed but participant was created — still ok
    console.error("Failed to send invite email");
  }

  return NextResponse.json({ ok: true });
}
