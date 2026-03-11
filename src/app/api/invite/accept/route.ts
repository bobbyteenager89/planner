import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const [participant] = await db()
    .select()
    .from(participants)
    .where(eq(participants.inviteToken, token));

  if (!participant) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Link user to participant record and clear token
  await db()
    .update(participants)
    .set({
      userId: session.user.id,
      inviteToken: null,
      status: "in_progress",
    })
    .where(eq(participants.id, participant.id));

  return NextResponse.redirect(
    new URL(`/trips/${participant.tripId}/intake`, req.url)
  );
}
