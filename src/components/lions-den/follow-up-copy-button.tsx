"use client";

import { useEffect, useState } from "react";

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

type FollowUpCopyButtonProps = {
  text: string;
  spanish: boolean;
  className?: string;
};

/** Copies the draft so the owner can paste it anywhere: WhatsApp, Instagram DM, a web form. Nothing leaves the device. */
export function FollowUpCopyButton({ text, spanish, className }: FollowUpCopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [state]);

  const label =
    state === "copied"
      ? spanish
        ? "Copiado"
        : "Copied"
      : state === "failed"
        ? spanish
          ? "No se pudo copiar"
          : "Could not copy"
        : spanish
          ? "Copiar"
          : "Copy";

  return (
    <button
      aria-live="polite"
      className={
        className ??
        "inline-flex rounded-full border border-[#071b42] bg-white px-3 py-1.5 text-sm font-semibold text-[#071b42]"
      }
      data-followup-control="copy"
      onClick={async () => {
        const ok = await writeClipboard(text);
        setState(ok ? "copied" : "failed");
      }}
      type="button"
    >
      {label}
    </button>
  );
}
