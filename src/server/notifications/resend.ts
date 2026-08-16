type EmailDeliveryResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: "not_configured" | "provider_error" };

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

function notificationRecipients() {
  // Support both recipient variable names so a configuration rename cannot
  // silently disable assessment notifications.
  const configuredRecipients =
    process.env.ATLAS_NOTIFICATION_EMAILS?.trim() ||
    process.env.ATLAS_NOTIFICATION_EMAIL?.trim() ||
    process.env.ATLAS_SUPER_ADMIN_EMAILS?.trim() ||
    "";

  const recipients = configuredRecipients
    .split(",")
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);

  if (recipients.length === 0 || recipients.some((address) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))) {
    return [];
  }

  return [...new Set(recipients)];
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

export async function sendAssessmentConfirmation(input: AssessmentNotification) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://atlasforentrepreneurs.com")
    .replace(/\/$/, "");
  const safeBusinessName = escapeHtml(input.businessName);
  const safeContactName = escapeHtml(input.contactName);

  const subject = `Atlas received your assessment: ${input.businessName}`;
  const text = [
    `Hi ${input.contactName},`,
    "",
    `We received the company snapshot for ${input.businessName}. Our team will review the answers and recommend the best starting point.`,
    "",
    `If the business is a fit, we will follow up with the next step, including a 7-day free trial review option.`,
    "",
    `Review the Atlas site: ${siteUrl}`,
    "",
    "Atlas For Entrepreneurs",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#081f49;max-width:680px;margin:auto">
      <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a57600">Company snapshot received</p>
      <h1 style="font-size:28px;margin:0 0 18px">Thanks, ${safeContactName}.</h1>
      <p>We received the company snapshot for <strong>${safeBusinessName}</strong>.</p>
      <p>Our team will review the answers and recommend the best starting point.</p>
      <p>If the business is a fit, we will follow up with the next step, including a 7-day free trial review option.</p>
      <p style="margin-top:26px"><a href="${siteUrl}" style="display:inline-block;background:#1455ad;color:white;text-decoration:none;padding:12px 18px;border-radius:24px">Visit Atlas For Entrepreneurs</a></p>
      <p style="font-size:12px;color:#607085;margin-top:24px">Assessment ID: ${escapeHtml(input.id)}</p>
    </div>
  `;

  return sendEmail({
    to: [input.contactEmail],
    subject,
    html,
    text,
    replyTo: process.env.ATLAS_NOTIFICATION_FROM?.trim(),
    idempotencyKey: `atlas-assessment-confirmation-${input.id}`,
  });
}
