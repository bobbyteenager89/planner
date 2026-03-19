import { Resend } from "resend";

const resend = new Resend(process.env.AUTH_RESEND_KEY);
const BASE_URL =
  process.env.NEXTAUTH_URL || "https://planner-sooty-theta.vercel.app";

interface SendReminderParams {
  email: string;
  name: string | null;
  ownerName: string | null;
  tripTitle: string;
  destination: string | null;
  tripId: string;
}

export async function sendSurveyReminder(params: SendReminderParams) {
  const { email, name, ownerName, tripTitle, destination, tripId } = params;

  const subject = `Reminder: Share your preferences for ${destination || tripTitle}`;
  const link = `${BASE_URL}/trips/${tripId}/intake`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "Planner <onboarding@resend.dev>",
    to: email,
    subject,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="font-size: 20px; margin-bottom: 8px;">${subject}</h2>
        <p style="color: #57534e; font-size: 15px; line-height: 1.6;">
          Hi${name ? ` ${name}` : ""},<br><br>
          ${ownerName || "Your trip leader"} is planning a trip to ${destination || tripTitle} and would love your input.
          Click below to fill out a quick survey about your preferences.
        </p>
        <a href="${link}" style="display: inline-block; background: #D14F36; color: #F3EBE0; padding: 12px 24px; border-radius: 2px; text-decoration: none; font-size: 15px; font-weight: 700; margin-top: 16px; text-transform: uppercase; letter-spacing: 0.05em;">
          Fill Out Survey
        </a>
        <p style="color: #a8a29e; font-size: 13px; margin-top: 24px;">
          This is a friendly reminder. If you've already responded, you can ignore this email.
        </p>
      </div>
    `,
  });
}
