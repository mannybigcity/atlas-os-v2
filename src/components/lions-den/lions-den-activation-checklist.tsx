"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  activationChecklistCopy,
  activationChecklistProgress,
  activationDismissedStorageKey,
  activationMicahStorageKey,
  type ActivationChecklistStepId,
} from "@/lib/lions-den/activation-checklist";

type ChecklistDraft = {
  metadata?: Record<string, unknown> | null;
  title?: string | null;
  headline?: string | null;
  campaign?: string | null;
};

type LionsDenActivationChecklistProps = {
  organizationId: string;
  spanish: boolean;
  sampleWalkthrough?: boolean;
  hunterHref: string;
  prospectsHref: string;
  micahHref: string;
  pendingCount: number;
  acceptedCount: number;
  foundCount?: number;
  drafts: ChecklistDraft[];
};

export function markMicahActivationOpened(organizationId: string) {
  if (!organizationId || typeof window === "undefined") return;
  window.localStorage.setItem(activationMicahStorageKey(organizationId), "1");
}

export function MicahActivationMarker({ organizationId }: { organizationId: string }) {
  useEffect(() => {
    markMicahActivationOpened(organizationId);
  }, [organizationId]);
  return null;
}

export function LionsDenActivationChecklist({
  organizationId,
  spanish,
  sampleWalkthrough = false,
  hunterHref,
  prospectsHref,
  micahHref,
  pendingCount,
  acceptedCount,
  foundCount,
  drafts,
}: LionsDenActivationChecklistProps) {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [openedMicah, setOpenedMicah] = useState(false);
  const copy = activationChecklistCopy({ spanish, sampleWalkthrough });

  useEffect(() => {
    setDismissed(window.localStorage.getItem(activationDismissedStorageKey(organizationId)) === "1");
    setOpenedMicah(window.localStorage.getItem(activationMicahStorageKey(organizationId)) === "1");
    setReady(true);
  }, [organizationId]);

  const progress = activationChecklistProgress({
    pendingCount,
    acceptedCount,
    foundCount,
    drafts,
    openedMicah,
  });

  if (!ready || dismissed) return null;

  const steps: Array<{
    id: ActivationChecklistStepId;
    href: string;
    done: boolean;
  }> = [
    { id: "find10", href: hunterHref, done: progress.find10 },
    { id: "accept1", href: progress.accept1 ? prospectsHref : hunterHref, done: progress.accept1 },
    { id: "micah", href: micahHref, done: progress.micah },
  ];

  function hide() {
    window.localStorage.setItem(activationDismissedStorageKey(organizationId), "1");
    setDismissed(true);
  }

  return (
    <section
      aria-label={copy.title}
      className="rounded-md border border-[#d5d0c4] bg-white px-2.5 py-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a12]">
              {copy.eyebrow}
            </p>
            {sampleWalkthrough ? (
              <span className="rounded-full bg-[#fff8e6] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-[#8a6a12]">
                {copy.sampleBadge}
              </span>
            ) : null}
            <span className="text-[10px] font-semibold text-[#5c6578]">
              {progress.completed}/{progress.total}
            </span>
          </div>
          <h2 className="mt-0.5 font-[family-name:var(--font-display)] text-base leading-5 text-[#071b42]">
            {copy.title}
          </h2>
          <p className="mt-0.5 text-[11px] leading-4 text-[#33415c]">
            {progress.allDone ? copy.doneHint : copy.hint}
          </p>
        </div>
        <button
          aria-label={copy.hideAria}
          className="shrink-0 rounded border border-[#d5d0c4] bg-[#fbfaf4] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5c6578]"
          onClick={hide}
          type="button"
        >
          {copy.hide}
        </button>
      </div>
      <ol className="mt-2 grid gap-1 sm:grid-cols-3">
        {steps.map((step, index) => {
          const item = copy.steps[step.id];
          return (
            <li key={step.id}>
              <Link
                className={`flex h-full items-start gap-2 rounded-md border px-2 py-1.5 ${
                  step.done
                    ? "border-[#071b42] bg-[#071b42] text-white"
                    : "border-[#ece7d8] bg-[#fffdf6] text-[#071b42] hover:border-[#d8c27a]"
                }`}
                href={step.href}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${
                    step.done ? "bg-[#f5b932] text-[#071b42]" : "border border-[#d8c27a] bg-white text-[#8a6a12]"
                  }`}
                >
                  {step.done ? "✓" : index + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[11px] font-semibold ${step.done ? "text-white" : "text-[#071b42]"}`}>
                    {item.label}
                  </span>
                  <span className={`mt-0.5 block text-[10px] leading-4 ${step.done ? "text-[#f5b932]" : "text-[#5c6578]"}`}>
                    {step.done ? item.done : item.detail}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
