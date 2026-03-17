import { Resend } from "resend";

const resend = new Resend(process.env.AUTH_RESEND_KEY);
const BASE_URL =
  process.env.NEXTAUTH_URL || "https://planner-sooty-theta.vercel.app";

interface SendParams {
  emails: Array<{ email: string; name: string | null }>;
  tripTitle: string;
  destination: string | null;
  tripId: string;
  version: number;
}

export async function sendItineraryReadyEmail(params: SendParams) {
  const { emails, tripTitle, destination, tripId, version } = params;
  const isRevision = version > 1;

  const subject = isRevision
    ? `Updated itinerary for ${destination || tripTitle} (v${version})`
    : `Your ${destination || tripTitle} trip itinerary is ready!`;

  const body = isRevision
    ? `The itinerary has been revised based on everyone's feedback. Take another look and react to the changes.`
    : `An itinerary has been generated for your trip. Check it out and share your reactions — your feedback helps shape the final plan.`;

  const link = `${BASE_URL}/trips/${tripId}`;

  for (const { email, name } of emails) {
    await resend.emails
      .send({
        from: process.env.EMAIL_FROM || "Planner <onboarding@resend.dev>",
        to: email,
        subject,
        html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
          <h2 style="font-size: 20px; margin-bottom: 8px;">${subject}</h2>
          <p style="color: #57534e; font-size: 15px; line-height: 1.6;">
            Hi${name ? ` ${name}` : ""},<br><br>
            ${body}
          </p>
          <a href="${link}" style="display: inline-block; background: #1c1917; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 500; margin-top: 16px;">
            View ${isRevision ? "Updated " : ""}Itinerary
          </a>
        </div>
      `,
      })
      .catch(() => {}); // individual email failures are non-critical
  }
}
