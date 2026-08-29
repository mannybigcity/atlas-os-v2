import "server-only";

import type Stripe from "stripe";
import { getSiteUrl } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import {
  isUsableCheckoutEmail,
  nextWorkspaceSlugCandidate,
  normalizeCheckoutEmail,
  workspaceNameFromCheckout,
  workspaceSlugFromIdentity,
} from "@/server/stripe/paid-workspace-identity";

const INVITE_REDIRECT_PATH = "/auth/confirm?type=invite&next=/set-password";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type PaidWorkspaceResult =
  | { status: "linked"; userId: string; organizationId: string; invited: boolean }
  | { status: "failed"; reason: "missing_email" };

export function emailFromCheckoutSession(session: Stripe.Checkout.Session) {
  return normalizeCheckoutEmail(session.customer_details?.email ?? session.customer_email);
}

export async function resolveCheckoutEmail(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const fromSession = emailFromCheckoutSession(session);
  if (fromSession && isUsableCheckoutEmail(fromSession)) return fromSession;

  const customerRef = session.customer;
  const customerId = typeof customerRef === "string" ? customerRef : customerRef?.id;
  if (!customerId) return fromSession;

  const customer = await stripe.customers.retrieve(customerId);
  if ("deleted" in customer && customer.deleted) return fromSession;
  return normalizeCheckoutEmail(customer.email) ?? fromSession;
}

export function workspaceDetailsFromCheckout(
  session: Stripe.Checkout.Session,
  email: string,
) {
  const customBusinessName = session.custom_fields?.find((field) => {
    const haystack = `${field.key} ${field.label?.custom ?? ""}`.toLowerCase();
    return /business|company|organization/.test(haystack);
  })?.text?.value;

  const name = workspaceNameFromCheckout({
    businessName: session.metadata?.business_name ?? customBusinessName,
    customerName: session.customer_details?.name,
    email,
  });

  return {
    name,
    slug: workspaceSlugFromIdentity({
      name,
      email,
      uniqueness: session.id,
    }),
  };
}

export async function provisionPaidAtlasWorkspace(input: {
  email: string | null;
  session: Stripe.Checkout.Session;
}): Promise<PaidWorkspaceResult> {
  const email = normalizeCheckoutEmail(input.email);
  if (!isUsableCheckoutEmail(email) || !email) {
    return { status: "failed", reason: "missing_email" };
  }

  const service = createServiceClient();
  const { userId, invited } = await findOrInvitePaidBuyer(service, email, input.session);
  const organizationId = await ensureOwnerWorkspace(service, {
    userId,
    email,
    session: input.session,
  });

  return { status: "linked", userId, organizationId, invited };
}

async function findOrInvitePaidBuyer(
  service: ServiceClient,
  email: string,
  session: Stripe.Checkout.Session,
) {
  const existingId = await findAuthUserIdByEmail(service, email);
  if (existingId) {
    return { userId: existingId, invited: false };
  }

  const details = workspaceDetailsFromCheckout(session, email);
  const invited = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${getSiteUrl()}${INVITE_REDIRECT_PATH}`,
    data: {
      full_name: session.customer_details?.name ?? details.name,
      business_name: details.name,
      email,
      source: "stripe_checkout",
    },
  });

  if (!invited.error && invited.data.user) {
    return { userId: invited.data.user.id, invited: true };
  }

  if (isExistingUserError(invited.error)) {
    const userId = await findAuthUserIdByEmail(service, email);
    if (userId) return { userId, invited: false };
  }

  throw new Error(invited.error?.message ?? "Could not create or find the buyer login.");
}

async function findAuthUserIdByEmail(service: ServiceClient, email: string) {
  const { data, error } = await service.rpc("find_auth_user_id_by_email", {
    p_email: email,
  });

  if (!error) {
    return typeof data === "string" && data.length > 0 ? data : null;
  }

  if (error.code !== "42883" && !/does not exist/i.test(error.message ?? "")) {
    throw error;
  }

  return findAuthUserIdByList(service, email);
}

async function findAuthUserIdByList(service: ServiceClient, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < 200) break;
  }

  return null;
}

async function ensureOwnerWorkspace(
  service: ServiceClient,
  input: { userId: string; email: string; session: Stripe.Checkout.Session },
) {
  const { data: memberships, error: membershipError } = await service
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (membershipError) throw membershipError;
  if (memberships?.[0]?.organization_id) {
    return memberships[0].organization_id as string;
  }

  const details = workspaceDetailsFromCheckout(input.session, input.email);
  const organizationId = await createUniqueOrganization(service, details.name, details.slug);
  const { error: insertMembershipError } = await service.from("organization_memberships").insert({
    organization_id: organizationId,
    user_id: input.userId,
    role: "owner",
  });

  if (insertMembershipError) {
    const raced = await service
      .from("organization_memberships")
      .select("organization_id")
      .eq("user_id", input.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (raced.data?.organization_id) return raced.data.organization_id as string;
    throw insertMembershipError;
  }

  return organizationId;
}

async function createUniqueOrganization(service: ServiceClient, name: string, desiredSlug: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = nextWorkspaceSlugCandidate(desiredSlug, attempt);
    const { data, error } = await service
      .from("organizations")
      .insert({ name, slug })
      .select("id")
      .single();

    if (!error && data?.id) return data.id as string;
    if (error?.code !== "23505") throw error ?? new Error("Could not create the buyer workspace.");
  }

  throw new Error("Could not allocate a unique workspace slug.");
}

function isExistingUserError(error: { message?: string; code?: string; status?: number } | null) {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "email_exists" ||
    error.status === 422 ||
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("already exists")
  );
}
