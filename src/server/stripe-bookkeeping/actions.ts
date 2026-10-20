"use server";

import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/env";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import {
  isBookkeepingCategory,
  type CategoryMatchField,
  type CategoryMatchOperator,
} from "./categories";
import {
  assertOAuthConfigured,
  callbackUrl,
  isStripeBookkeepingEnabled,
  loadStripeBookkeepingConfig,
} from "./config";
import { revokeAndDelete, runOrganizationBackfill } from "./jobs";
import { buildStripeAppAuthorizeUrl, createOAuthState, hashOAuthState } from "./oauth";
import { createStripeAdminClient, insertOAuthState } from "./store";
import { createClient } from "@/lib/supabase/server";

function bookkeepingPath(previewOrg: string, status: string) {
  const params = new URLSearchParams();

  if (previewOrg) {
    params.set("previewOrg", previewOrg);
  }

  if (status) {
    params.set("stripe", status);
  }

  const query = params.toString();
  return query ? `/client/bookkeeping?${query}` : "/client/bookkeeping";
}

async function managedWorkspace() {
  const workspace = await getClientWorkspaceContext("/client/bookkeeping");
  const organization = workspace.primaryOrganization;
  const role = workspace.primaryMembership?.role;
  const canManage =
    !workspace.isClientPreview &&
    Boolean(organization) &&
    (role === "owner" || role === "admin");

  return { workspace, organization, canManage };
}

export async function beginStripeConnect() {
  const { workspace, organization, canManage } = await managedWorkspace();

  if (!isStripeBookkeepingEnabled()) {
    redirect(bookkeepingPath(workspace.previewOrgSlug, "disabled"));
  }

  if (!canManage || !organization) {
    redirect(bookkeepingPath(workspace.previewOrgSlug, "forbidden"));
  }

  const config = loadStripeBookkeepingConfig();
  assertOAuthConfigured(config);
  const state = createOAuthState();
  await insertOAuthState(createStripeAdminClient(), {
    organizationId: organization.id,
    userId: workspace.user.id,
    stateHash: hashOAuthState(state),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  redirect(
    buildStripeAppAuthorizeUrl({
      authorizeBaseUrl: config.authorizeBaseUrl,
      clientId: config.clientId,
      redirectUri: callbackUrl(getSiteUrl()),
      state,
    }),
  );
}

export async function syncStripeBookkeepingNow() {
  const { workspace, organization, canManage } = await managedWorkspace();

  if (!isStripeBookkeepingEnabled() || !canManage || !organization) {
    redirect(bookkeepingPath(workspace.previewOrgSlug, "forbidden"));
  }

  try {
    await runOrganizationBackfill(organization.id, 2);
  } catch {
    redirect(bookkeepingPath(workspace.previewOrgSlug, "sync_error"));
  }

  redirect(bookkeepingPath(workspace.previewOrgSlug, "synced"));
}

export async function disconnectStripeBookkeeping(formData: FormData) {
  const { workspace, organization, canManage } = await managedWorkspace();

  if (!isStripeBookkeepingEnabled() || !canManage || !organization) {
    redirect(bookkeepingPath(workspace.previewOrgSlug, "forbidden"));
  }

  if (String(formData.get("confirm") ?? "") !== "delete") {
    redirect(bookkeepingPath(workspace.previewOrgSlug, "confirm"));
  }

  const admin = createStripeAdminClient();
  const { data } = await admin
    .from("stripe_bookkeeping_connections")
    .select("stripe_account_id, livemode")
    .eq("organization_id", organization.id)
    .maybeSingle();
  const connection = data as { stripe_account_id: string; livemode: boolean } | null;

  if (!connection) {
    redirect(bookkeepingPath(workspace.previewOrgSlug, "disconnected"));
  }

  const result = await revokeAndDelete(
    admin,
    loadStripeBookkeepingConfig(),
    organization.id,
    connection.stripe_account_id,
    connection.livemode,
  );

  redirect(bookkeepingPath(workspace.previewOrgSlug, result.revoked ? "disconnected" : "disconnected_local"));
}

export async function saveCategoryRule(formData: FormData) {
  const { workspace, organization, canManage } = await managedWorkspace();

  if (!canManage || !organization || !isStripeBookkeepingEnabled()) {
    redirect(bookkeepingPath(workspace.previewOrgSlug, "forbidden"));
  }

  const matchField = String(formData.get("matchField") ?? "");
  const matchOperator = String(formData.get("matchOperator") ?? "");
  const matchValue = String(formData.get("matchValue") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const priority = Number(formData.get("priority") ?? 5);

  if (
    !isMatchField(matchField) ||
    !isMatchOperator(matchOperator) ||
    !isBookkeepingCategory(category) ||
    matchValue.length < 1 ||
    matchValue.length > 200 ||
    !Number.isInteger(priority) ||
    priority < 1 ||
    priority > 1000
  ) {
    redirect(bookkeepingPath(workspace.previewOrgSlug, "rule_invalid"));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("stripe_bookkeeping_category_rules").insert({
    organization_id: organization.id,
    priority,
    enabled: true,
    match_field: matchField,
    match_operator: matchOperator,
    match_value: matchValue,
    category,
    is_default: false,
    created_by: workspace.user.id,
  });

  redirect(bookkeepingPath(workspace.previewOrgSlug, error ? "rule_error" : "rule_saved"));
}

export async function setCategoryRuleEnabled(formData: FormData) {
  const { workspace, organization, canManage } = await managedWorkspace();

  if (!canManage || !organization) {
    redirect(bookkeepingPath(workspace.previewOrgSlug, "forbidden"));
  }

  const id = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    redirect(bookkeepingPath(workspace.previewOrgSlug, "rule_invalid"));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("stripe_bookkeeping_category_rules")
    .update({ enabled })
    .eq("id", id)
    .eq("organization_id", organization.id);

  redirect(bookkeepingPath(workspace.previewOrgSlug, error ? "rule_error" : "rule_saved"));
}

export async function deleteCategoryRule(formData: FormData) {
  const { workspace, organization, canManage } = await managedWorkspace();

  if (!canManage || !organization) {
    redirect(bookkeepingPath(workspace.previewOrgSlug, "forbidden"));
  }

  const id = String(formData.get("id") ?? "");

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    redirect(bookkeepingPath(workspace.previewOrgSlug, "rule_invalid"));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("stripe_bookkeeping_category_rules")
    .delete()
    .eq("id", id)
    .eq("organization_id", organization.id);

  redirect(bookkeepingPath(workspace.previewOrgSlug, error ? "rule_error" : "rule_saved"));
}

function isMatchField(value: string): value is CategoryMatchField {
  return value === "stripe_type" || value === "description" || value === "record_type";
}

function isMatchOperator(value: string): value is CategoryMatchOperator {
  return value === "equals" || value === "contains";
}
