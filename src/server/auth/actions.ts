"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSiteUrl, isSuperAdminEmail } from "@/lib/env";
import { safeRedirectPath } from "@/lib/paths";
import { createClient } from "@/lib/supabase/server";

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

  if (typeof requestedNext !== "string" || requestedNext.length === 0) {
    redirect(isSuperAdminEmail(data.user.email) ? "/lions-den" : "/client");
  }

  redirect(nextPath);
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
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
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
  const tokenHash = String(formData.get("tokenHash") ?? "");
  const type = String(formData.get("type") ?? "");
  const nextPath = safeRedirectPath(formData.get("next"));

  if (!tokenHash || (type !== "invite" && type !== "recovery")) {
    redirect("/login?error=auth_callback_failed");
  }

  const supabase = await createClient();
  const { error } =
    type === "invite"
      ? await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        })
      : await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });

  if (error) {
    redirect("/login?error=auth_callback_failed");
  }

  redirect(nextPath);
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
