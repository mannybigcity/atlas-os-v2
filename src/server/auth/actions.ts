"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/env";
import { safeRedirectPath } from "@/lib/paths";
import { createClient } from "@/lib/supabase/server";
import { getTrialProfile } from "@/server/trials/profile";
import {
  ensureTrialAccountForUser,
  ensureTrialWorkspaceForUser,
} from "@/server/trials/provision";
import { trialWorkspaceSetupHref } from "@/server/trials/workspace-redirect";
import { isTrialConfirmationRequest, isTrialSignupMetadata } from "@/server/trials/metadata";
import {
  ensureSampleDeskAccess,
  getSampleDeskSignInCredentials,
  provisionSampleDeskLoginUser,
  sampleDeskLoginUnavailableRedirect,
} from "@/server/auth/sample-desk";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const requestedNext = formData.get("next");
  const nextPath = safeRedirectPath(requestedNext);

  if (!email || !password) {
    redirect(`/login?error=missing_credentials&next=${encodeURIComponent(nextPath)}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=invalid_credentials&next=${encodeURIComponent(nextPath)}`);
  }

  if (data.user) {
    try {
      await ensureSampleDeskAccess(data.user.id, data.user.email ?? email);
    } catch (provisionError) {
      console.error("Atlas sample desk membership ensure failed", provisionError);
    }

    let trialProfile = null;
    try {
      trialProfile = await getTrialProfile(data.user.id);
    } catch (error) {
      console.error("Atlas trial profile guard failed", error);
    }

    if (!trialProfile && isTrialSignupMetadata(data.user.user_metadata)) {
      const provision = await ensureTrialAccountForUser(
        data.user.id,
        data.user.user_metadata,
        data.user.email ?? email,
      );

      if (!provision.ok) {
        redirect("/start-trial?error=profile_setup");
      }

      trialProfile = await getTrialProfile(data.user.id);
    }

    if (trialProfile) {
      if (new Date(trialProfile.trial_ends_at).getTime() <= Date.now()) {
        redirect("/pricing?trial=expired");
      }

      const workspace = await ensureTrialWorkspaceForUser({
        userId: data.user.id,
        businessName: trialProfile.business_name,
        email: data.user.email ?? email,
      });

      if (!workspace.ok) {
        redirect(trialWorkspaceSetupHref(workspace.error));
      }
    }
  }

  const signedInNext =
    typeof requestedNext !== "string" || requestedNext.length === 0
      ? "/client"
      : nextPath;

  redirect(signedInNext);
}

export async function signInToSampleDesk() {
  const credentials = getSampleDeskSignInCredentials();
  if (!credentials) {
    redirect(sampleDeskLoginUnavailableRedirect());
  }

  try {
    await provisionSampleDeskLoginUser();
  } catch (error) {
    console.error("Atlas sample desk provision failed", error);
    redirect(sampleDeskLoginUnavailableRedirect());
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    redirect(sampleDeskLoginUnavailableRedirect());
  }

  redirect("/client");
}

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect("/forgot-password?error=missing_email");
  }

  const requestHeaders = await headers();
  const origin = getSiteUrl(requestHeaders.get("origin"));
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?type=recovery&next=/reset-password`,
  });

  if (error) {
    console.error("Atlas password-reset email request failed", {
      code: error.code,
      status: error.status,
    });
    redirect("/forgot-password?error=delivery_failed");
  }

  redirect("/forgot-password?status=sent");
}

export async function confirmAuthLink(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const tokenHash = String(formData.get("tokenHash") ?? "");
  const type = String(formData.get("type") ?? "");
  const nextPath = safeRedirectPath(formData.get("next"));
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      redirect("/login?error=auth_callback_failed");
    }
  } else {
    if (!tokenHash || (type !== "invite" && type !== "recovery" && type !== "email")) {
      redirect("/login?error=auth_callback_failed");
    }

    const { error } =
      type === "invite"
        ? await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "invite",
          })
        : await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type === "email" ? "email" : "recovery",
          });

    if (error) {
      redirect("/login?error=auth_callback_failed");
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const shouldProvisionTrial =
    Boolean(user) &&
    (isTrialConfirmationRequest({ type, next: String(formData.get("next") ?? "") }) ||
      isTrialSignupMetadata(user?.user_metadata));

  if (shouldProvisionTrial && user) {
    const provision = await ensureTrialAccountForUser(user.id, user.user_metadata, user.email);

    if (!provision.ok) {
      redirect("/start-trial?error=profile_setup");
    }
  }

  redirect(nextPath);
}

function trialValue(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function startTrial(formData: FormData) {
  const fullName = trialValue(formData.get("fullName"), 160);
  const businessName = trialValue(formData.get("businessName"), 200);
  const email = trialValue(formData.get("email"), 320).toLowerCase();
  const phone = trialValue(formData.get("phone"), 40);
  const businessType = trialValue(formData.get("businessType"), 100);
  const primaryGrowthGoal = trialValue(formData.get("primaryGrowthGoal"), 1000);
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const consent = formData.get("consent") === "on";

  if (
    !fullName || !businessName || !email || !phone || !businessType ||
    !primaryGrowthGoal || !consent || !password || password !== confirmPassword
  ) {
    redirect("/start-trial?error=validation");
  }

  if (!passwordMeetsPolicy(password)) {
    redirect("/start-trial?error=weak_password");
  }

  const requestHeaders = await headers();
  const origin = getSiteUrl(requestHeaders.get("origin"));
  const supabase = await createClient();
  const consentAt = new Date().toISOString();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?type=email&next=/client%3Fstatus%3Dwelcome`,
      data: {
        full_name: fullName,
        business_name: businessName,
        email,
        phone,
        business_type: businessType,
        primary_growth_goal: primaryGrowthGoal,
        terms_accepted_at: consentAt,
        privacy_accepted_at: consentAt,
      },
    },
  });

  if (error) {
    console.error("Atlas trial signup failed", { code: error.code, status: error.status });
    const isDuplicate =
      error.code === "user_already_exists" ||
      error.code === "email_exists" ||
      /already registered|already exists/i.test(error.message ?? "");
    redirect(isDuplicate ? "/start-trial?error=account_exists" : "/start-trial?error=signup_failed");
  }

  redirect("/start-trial?status=check_email");
}

function passwordMeetsPolicy(password: string) {
  return (
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export async function completeInvitation(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || !confirmPassword) {
    redirect("/set-password?error=missing_password");
  }

  if (!passwordMeetsPolicy(password)) {
    redirect("/set-password?error=weak_password");
  }

  if (password !== confirmPassword) {
    redirect("/set-password?error=password_mismatch");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=invitation_expired");
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    redirect("/set-password?error=update_failed");
  }

  redirect("/client?status=welcome");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || !confirmPassword) {
    redirect("/reset-password?error=missing_password");
  }

  if (!passwordMeetsPolicy(password)) {
    redirect("/reset-password?error=weak_password");
  }

  if (password !== confirmPassword) {
    redirect("/reset-password?error=password_mismatch");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password?error=session_expired");
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    redirect("/reset-password?error=update_failed");
  }

  await supabase.auth.signOut();

  redirect("/login?status=password_updated");
}
