"use client";

import { useLayoutEffect } from "react";

export function RecoveryLinkRedirect() {
  useLayoutEffect(() => {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.slice(1));
    const type = url.searchParams.get("type") ?? hashParams.get("type");
    const code = url.searchParams.get("code");
    const tokenHash = url.searchParams.get("token_hash");
    const hasRecoveryTokens =
      type === "recovery" &&
      Boolean(hashParams.get("access_token")) &&
      Boolean(hashParams.get("refresh_token"));

    if (!hasRecoveryTokens && !(code && type === "recovery") && !(tokenHash && type === "recovery")) {
      return;
    }

    if (tokenHash && type === "recovery") {
      const confirmUrl = new URL("/auth/confirm", url.origin);
      confirmUrl.searchParams.set("token_hash", tokenHash);
      confirmUrl.searchParams.set("type", "recovery");
      confirmUrl.searchParams.set("next", "/reset-password");
      window.location.replace(confirmUrl.toString());
      return;
    }

    const callbackUrl = new URL("/auth/callback", url.origin);
    callbackUrl.searchParams.set("next", "/reset-password");

    if (code) {
      callbackUrl.searchParams.set("code", code);
    } else {
      callbackUrl.hash = url.hash;
    }

    window.location.replace(callbackUrl.toString());
  }, []);

  return null;
}
