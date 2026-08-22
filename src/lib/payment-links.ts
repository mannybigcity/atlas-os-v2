const sprintPaymentLink = process.env.NEXT_PUBLIC_STRIPE_ATLAS_SPRINT_URL?.trim() ?? "";

export function getAtlasSprintPaymentLink() {
  if (!sprintPaymentLink) return null;

  try {
    const url = new URL(sprintPaymentLink);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
