"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type RecoverySessionHandlerProps = {
  code?: string;
  nextPath?: string;
};

function safeClientRedirectPath(value: string | undefined) {
  if (
    value === "/reset-password" ||
    value === "/set-password" ||
    value === "/client" ||
    value === "/clients" ||
    value === "/lions-den"
  ) {
    return value;
  }

  return "/reset-password";
}

export function RecoverySessionHandler({
  code,
  nextPath,
}: RecoverySessionHandlerProps) {
  const [message, setMessage] = useState("Preparing recovery session...");

  useEffect(() => {
    async function handleRecoverySession() {
      const supabase = createClient();
      const redirectPath = safeClientRedirectPath(nextPath);

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setMessage("The reset link could not be verified. Redirecting...");
          window.location.replace("/login?error=auth_callback_failed");
          return;
        }

        window.location.replace(redirectPath);
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      if (!accessToken || !refreshToken || type !== "recovery") {
        window.location.replace("/login?error=missing_auth_code");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        setMessage("The reset link could not be verified. Redirecting...");
        window.location.replace("/login?error=auth_callback_failed");
        return;
      }

      window.location.replace("/reset-password");
    }

    void handleRecoverySession();
  }, [code, nextPath]);

  return <p>{message}</p>;
}
