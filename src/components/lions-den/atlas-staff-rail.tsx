"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { useSiteLanguage } from "@/components/language-switcher";
import { AtlasStaffPane } from "@/components/lions-den/atlas-staff-pane";
import { ATLAS_LION_SRC } from "@/lib/lions-den/atlas-brand";
import { MICAH_TALK_EVENT } from "@/lib/lions-den/micah-starter-week";
import type { SiteLanguage } from "@/lib/site-language";

type AtlasStaffRailProps = ComponentProps<typeof AtlasStaffPane> & {
  initialLanguage?: SiteLanguage;
};

const STORAGE_PREFIX = "lions-den-atlas-staff-rail:";

export function atlasStaffRailStorageKey(organizationId: string) {
  return `${STORAGE_PREFIX}${organizationId || "desk"}`;
}

export function AtlasStaffRail({
  initialLanguage = "en",
  organizationId,
  ...paneProps
}: AtlasStaffRailProps) {
  const language = useSiteLanguage(initialLanguage);
  const spanish = language === "es";
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  const expandRef = useRef<HTMLButtonElement>(null);
  const collapseRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<"collapse" | "expand" | null>(null);
  const expandLabel = spanish ? "Expandir Pregunta a Atlas" : "Expand Ask Atlas";
  const collapseLabel = spanish ? "Contraer Pregunta a Atlas" : "Collapse Ask Atlas";
  const railLabel = spanish ? "Pregunta a Atlas" : "Ask Atlas";
  const collapseText = spanish ? "Contraer" : "Collapse";

  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  useEffect(() => {
    // Preference lives in localStorage, so it can only be read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only preference
    setExpanded(window.localStorage.getItem(atlasStaffRailStorageKey(organizationId)) === "expanded");
  }, [organizationId]);

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const handle = window.setTimeout(() => {
      if (target === "expand") expandRef.current?.focus();
      else collapseRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [expanded]);

  useEffect(() => {
    function onMicahTalk() {
      const opening = !expandedRef.current;
      expandedRef.current = true;
      setExpanded(true);
      window.localStorage.setItem(atlasStaffRailStorageKey(organizationId), "expanded");
      window.setTimeout(() => {
        document.getElementById("atlas-staff-prompt")?.focus();
      }, opening ? 60 : 0);
    }
    window.addEventListener(MICAH_TALK_EVENT, onMicahTalk);
    return () => window.removeEventListener(MICAH_TALK_EVENT, onMicahTalk);
  }, [organizationId]);

  function writeExpanded(next: boolean) {
    expandedRef.current = next;
    pendingFocus.current = next ? "collapse" : "expand";
    setExpanded(next);
    window.localStorage.setItem(
      atlasStaffRailStorageKey(organizationId),
      next ? "expanded" : "collapsed",
    );
  }

  return (
    <aside
      aria-label={railLabel}
      className={`lions-den-hub-staff border-t border-[#d5d0c4] xl:border-t-0 xl:border-l ${
        expanded ? "bg-[#fbfaf4]" : "bg-[#071b42]"
      }`}
      data-staff={expanded ? "expanded" : "collapsed"}
    >
      <button
        aria-controls="atlas-staff-pane"
        aria-expanded={false}
        aria-label={expandLabel}
        className={
          expanded
            ? "hidden"
            : "flex min-h-11 w-full items-center justify-center gap-2 bg-transparent px-3 py-2 text-[#f5b932] xl:h-full xl:flex-col xl:justify-start xl:gap-3 xl:px-1 xl:py-4"
        }
        data-staff-toggle="expand"
        onClick={() => writeExpanded(true)}
        ref={expandRef}
        title={expandLabel}
        type="button"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[#f5b932] bg-black">
          <Image alt="" className="h-full w-full object-contain" height={64} src={ATLAS_LION_SRC} width={64} />
        </span>
        <span className="text-[11px] font-black uppercase tracking-[0.14em] xl:[writing-mode:vertical-rl]">
          {railLabel}
        </span>
        <span className="ml-auto xl:ml-0 xl:mt-auto">
          <RailChevron direction="left" />
        </span>
      </button>

      <div
        className={expanded ? "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col" : "hidden"}
        id="atlas-staff-pane"
        inert={expanded ? undefined : true}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#0a2a5c] bg-[#071b42] px-2 py-1.5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f5b932]">{railLabel}</p>
          <button
            aria-controls="atlas-staff-pane"
            aria-expanded={true}
            aria-label={collapseLabel}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-[#f5b932] px-3 text-xs font-semibold text-[#071b42] hover:bg-[#ffd266]"
            data-staff-toggle="collapse"
            onClick={() => writeExpanded(false)}
            ref={collapseRef}
            title={collapseLabel}
            type="button"
          >
            <span>{collapseText}</span>
            <RailChevron direction="right" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden [&>section]:min-h-0 [&>section]:flex-1">
          <AtlasStaffPane organizationId={organizationId} {...paneProps} />
        </div>
      </div>
    </aside>
  );
}

function RailChevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" className="shrink-0" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path
        d={direction === "left" ? "M14.5 6 8.5 12l6 6" : "M9.5 6 15.5 12l-6 6"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
