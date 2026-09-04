import { FOUNDER_MAILBOX_EMAIL } from "@/lib/client-portal/identity";

type EmailDeliveryResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: "not_configured" | "provider_error" };

type TrialSignupNotification = {
  businessName: string;
  fullName: string;
  email: string;
  phone: string;
  businessType: string;
  primaryGrowthGoal: string;
  submittedAt: string;
  emailConfirmed: boolean;
  userId?: string | null;
};

type AssessmentNotification = {
  id: string;
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  businessDescription: string;
  idealCustomer: string;
  biggestChallenge: string;
  ninetyDayGoal: string;
  improvementTiming: string;
  website: string | null;
  socialMedia: string | null;
  createdAt: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseEmailList(value: string) {
  const recipients = value
    .split(",")
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);

  if (recipients.length === 0 || recipients.some((address) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))) {
    return [];
  }

  return [...new Set(recipients)];
}

function notificationRecipients() {
  return parseEmailList(process.env.ATLAS_NOTIFICATION_EMAILS ?? "");
}

function trialSignupRecipients() {
  const override = parseEmailList(process.env.TRIAL_SIGNUP_NOTIFY_EMAIL ?? "");
  if (override.length > 0) {
    return override;
  }

  return [FOUNDER_MAILBOX_EMAIL];
}

async function sendEmail(input: {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  idempotencyKey: string;
  to?: string[];
}): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ATLAS_NOTIFICATION_FROM?.trim();
  const to = input.to ?? notificationRecipients();

  if (!apiKey || !from || to.length === 0) {
    console.info("Atlas email notification skipped because Resend is not configured");
    return { sent: false, reason: "not_configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(8_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const providerMessage = await response.text();
      console.error("Atlas email notification failed", {
        status: response.status,
        providerMessage: providerMessage.slice(0, 500),
      });
      return { sent: false, reason: "provider_error" };
    }

    const result = (await response.json()) as { id?: string };
    return { sent: true, id: result.id ?? null };
  } catch (error) {
    console.error("Atlas email notification failed", {
      message: error instanceof Error ? error.message : "Unknown email error",
    });
    return { sent: false, reason: "provider_error" };
  }
}

export async function sendAssessmentNotification(input: AssessmentNotification) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://atlasforentrepreneurs.com")
    .replace(/\/$/, "");
  const safe = Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, escapeHtml(String(value ?? "Not provided"))]),
  ) as Record<keyof AssessmentNotification, string>;

  const subject = `New Atlas assessment: ${input.businessName}`;
  const text = [
    "A new business assessment was submitted.",
    "",
    `Business: ${input.businessName}`,
    `Contact: ${input.contactName}`,
    `Email: ${input.contactEmail}`,
    `Phone: ${input.contactPhone}`,
    `Website: ${input.website ?? "Not provided"}`,
    `Social media: ${input.socialMedia ?? "Not provided"}`,
    `Challenge: ${input.biggestChallenge}`,
    `90-day goal: ${input.ninetyDayGoal}`,
    `Timing: ${input.improvementTiming}`,
    "",
    `Business description: ${input.businessDescription}`,
    `Ideal customer: ${input.idealCustomer}`,
    "",
    `Review in The Lion's Den: ${siteUrl}/lions-den`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#081f49;max-width:680px;margin:auto">
      <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a57600">New business assessment</p>
      <h1 style="font-size:28px;margin:0 0 18px">${safe.businessName}</h1>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:7px 12px 7px 0;font-weight:bold">Contact</td><td>${safe.contactName}</td></tr>
        <tr><td style="padding:7px 12px 7px 0;font-weight:bold">Email</td><td><a href="mailto:${safe.contactEmail}">${safe.contactEmail}</a></td></tr>
        <tr><td style="padding:7px 12px 7px 0;font-weight:bold">Phone</td><td>${safe.contactPhone}</td></tr>
        <tr><td style="padding:7px 12px 7px 0;font-weight:bold">Website</td><td>${safe.website}</td></tr>
        <tr><td style="padding:7px 12px 7px 0;font-weight:bold">Social media</td><td>${safe.socialMedia}</td></tr>
        <tr><td style="padding:7px 12px 7px 0;font-weight:bold">Timing</td><td>${safe.improvementTiming}</td></tr>
      </table>
      <hr style="border:0;border-top:1px solid #d9e1ec;margin:22px 0">
      <h2 style="font-size:18px">Biggest challenge</h2>
      <p>${safe.biggestChallenge}</p>
      <h2 style="font-size:18px">90-day goal</h2>
      <p>${safe.ninetyDayGoal}</p>
      <h2 style="font-size:18px">About the business</h2>
      <p>${safe.businessDescription}</p>
      <h2 style="font-size:18px">Ideal customer</h2>
      <p>${safe.idealCustomer}</p>
      <p style="margin-top:26px"><a href="${siteUrl}/lions-den" style="display:inline-block;background:#1455ad;color:white;text-decoration:none;padding:12px 18px;border-radius:24px">Review in The Lion's Den</a></p>
      <p style="font-size:12px;color:#607085;margin-top:24px">Assessment ID: ${safe.id} | ${safe.createdAt}</p>
    </div>
  `;

  return sendEmail({
    subject,
    html,
    text,
    replyTo: input.contactEmail,
    idempotencyKey: `atlas-assessment-${input.id}`,
  });
}

function trialSignupIdempotencyKey(input: TrialSignupNotification, stage: "signup" | "confirmed") {
  const identity = input.userId?.trim() || input.email;
  return `atlas-trial-${stage}-${identity}`;
}

export async function sendTrialSignupNotification(input: TrialSignupNotification) {
  const statusNote = input.emailConfirmed
    ? "Email confirmed. 7-day trial workspace is live."
    : "7-day trial signup submitted. Email confirmation is still pending.";

  const subject = input.emailConfirmed
    ? `Trial confirmed — workspace live: ${input.businessName}`
    : `New Atlas trial: ${input.businessName}`;

  const text = [
    input.emailConfirmed ? "A new Atlas trial account is live." : "A new Atlas 7-day trial signup was submitted.",
    "",
    `Business: ${input.businessName}`,
    `Owner: ${input.fullName}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone}`,
    `Business type: ${input.businessType}`,
    `Growth goal: ${input.primaryGrowthGoal}`,
    `Submitted: ${input.submittedAt}`,
    "",
    statusNote,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#081f49;max-width:680px;margin:auto">
      <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a57600">
        ${input.emailConfirmed ? "Trial confirmed" : "New trial signup"}
      </p>
      <h1 style="font-size:24px;margin:0 0 18px">${escapeHtml(input.businessName)}</h1>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:7px 12px 7px 0;font-weight:bold">Owner</td><td>${escapeHtml(input.fullName)}</td></tr>
        <tr><td style="padding:7px 12px 7px 0;font-weight:bold">Email</td><td><a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a></td></tr>
        <tr><td style="padding:7px 12px 7px 0;font-weight:bold">Phone</td><td>${escapeHtml(input.phone)}</td></tr>
        <tr><td style="padding:7px 12px 7px 0;font-weight:bold">Business type</td><td>${escapeHtml(input.businessType)}</td></tr>
        <tr><td style="padding:7px 12px 7px 0;font-weight:bold">Growth goal</td><td>${escapeHtml(input.primaryGrowthGoal)}</td></tr>
        <tr><td style="padding:7px 12px 7px 0;font-weight:bold">Submitted</td><td>${escapeHtml(input.submittedAt)}</td></tr>
      </table>
      <p style="margin-top:22px">${escapeHtml(statusNote)}</p>
    </div>
  `;

  return sendEmail({
    subject,
    html,
    text,
    replyTo: input.email,
    to: trialSignupRecipients(),
    idempotencyKey: trialSignupIdempotencyKey(input, input.emailConfirmed ? "confirmed" : "signup"),
  });
}
