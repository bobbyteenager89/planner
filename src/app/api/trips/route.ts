import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trips, participants } from "@/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, destination, startDate, endDate } = body;

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const [trip] = await db()
    .insert(trips)
    .values({
      ownerId: session.user.id,
      title: title.trim(),
      destination: destination?.trim() || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: "draft",
    })
    .returning({ id: trips.id });

  // Add owner as participant
  await db().insert(participants).values({
    tripId: trip.id,
    userId: session.user.id,
    email: session.user.email!,
    name: session.user.name || null,
    role: "owner",
    status: "completed",
  });

  return NextResponse.json({ id: trip.id });
}
