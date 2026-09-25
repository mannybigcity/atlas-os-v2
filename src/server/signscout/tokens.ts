"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import { canManageSignScoutTokens } from "@/server/signscout/access";
import {
  SIGNSCOUT_ACTIVE_TOKEN_CAP,
  SIGNSCOUT_MIGRATION,
  generateSignScoutDeviceToken,
} from "@/server/signscout/contract";

export type SignScoutDeviceTokenView = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type SignScoutTokenList = {
  tokens: SignScoutDeviceTokenView[];
  setupRequired: boolean;
  migration: string;
};

export type SignScoutTokenCreateState = {
  token: string | null;
  error: string | null;
};

const LABEL_MAX = 80;

async function tokenAdminContext() {
  const workspace = await getClientWorkspaceContext("/client/settings");
  const organization = workspace.primaryOrganization;
  const allowed = canManageSignScoutTokens({
    organization,
    isSuperAdmin: workspace.isSuperAdmin,
    isClientPreview: workspace.isClientPreview,
    role: workspace.primaryMembership?.role ?? null,
  });
  if (!allowed || !organization) return null;
  return { userId: workspace.user.id, organizationId: organization.id };
}

export async function listSignScoutDeviceTokens(): Promise<SignScoutTokenList> {
  const admin = await tokenAdminContext();
  if (!admin) return { tokens: [], setupRequired: false, migration: SIGNSCOUT_MIGRATION };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_signscout_device_tokens")
    .select("id, label, created_at, last_used_at, revoked_at")
    .eq("organization_id", admin.organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    const missing = /does not exist|schema cache|could not find/i.test(error.message);
    return { tokens: [], setupRequired: missing, migration: SIGNSCOUT_MIGRATION };
  }

  const tokens = ((data ?? []) as Array<{
    id: string;
    label: string;
    created_at: string;
    last_used_at: string | null;
    revoked_at: string | null;
  }>).map((row) => ({
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  }));

  return { tokens, setupRequired: false, migration: SIGNSCOUT_MIGRATION };
}

export async function createSignScoutDeviceToken(
  _previous: SignScoutTokenCreateState,
  formData: FormData,
): Promise<SignScoutTokenCreateState> {
  const admin = await tokenAdminContext();
  if (!admin) return { token: null, error: "Only an Atlas For Entrepreneurs admin can create a SignScout token." };

  const postedOrg = String(formData.get("organizationId") ?? "").trim();
  if (postedOrg !== admin.organizationId) {
    return { token: null, error: "That desk cannot create a SignScout token." };
  }

  const label = String(formData.get("label") ?? "").trim();
  if (!label || label.length > LABEL_MAX) {
    return { token: null, error: "Name the device in 80 characters or fewer." };
  }

  try {
    const service = createServiceClient();
    const active = await service
      .from("organization_signscout_device_tokens")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", admin.organizationId)
      .is("revoked_at", null);
    if (active.error) {
      if (/does not exist|schema cache|could not find/i.test(active.error.message)) {
        return { token: null, error: `Apply ${SIGNSCOUT_MIGRATION} in the Supabase SQL editor first.` };
      }
      return { token: null, error: "The token could not be created." };
    }
    if ((active.count ?? 0) >= SIGNSCOUT_ACTIVE_TOKEN_CAP) {
      return { token: null, error: "Revoke an old device before creating another token." };
    }

    const generated = generateSignScoutDeviceToken();
    const inserted = await service.from("organization_signscout_device_tokens").insert({
      organization_id: admin.organizationId,
      label,
      token_hash: generated.tokenHash,
      created_by: admin.userId,
    });
    if (inserted.error) {
      return { token: null, error: "The token could not be created." };
    }

    revalidatePath("/client/settings");
    return { token: generated.token, error: null };
  } catch {
    return { token: null, error: "The token could not be created." };
  }
}

export async function revokeSignScoutDeviceToken(formData: FormData) {
  const admin = await tokenAdminContext();
  if (!admin) return;

  const postedOrg = String(formData.get("organizationId") ?? "").trim();
  const tokenId = String(formData.get("tokenId") ?? "").trim();
  if (postedOrg !== admin.organizationId || !/^[0-9a-f-]{36}$/i.test(tokenId)) return;

  try {
    const service = createServiceClient();
    await service
      .from("organization_signscout_device_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", tokenId)
      .eq("organization_id", admin.organizationId)
      .is("revoked_at", null);
  } catch {
    return;
  }

  revalidatePath("/client/settings");
}
