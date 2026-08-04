"use client";

import { useState } from "react";
import { FocusedHud } from "@/components/focused-hud";
import type { AtlasHudTarget } from "@/lib/hud-targets";

export function SurfaceTargetHud({ target }: { target: AtlasHudTarget | null }) {
  const [open, setOpen] = useState(Boolean(target));

  if (!target) return null;

  return (
    <FocusedHud
      eyebrow={target.eyebrow}
      footer={
        <p className="focused-hud-boundary">
          This HUD only focuses an existing Atlas surface. It does not send
          messages, trigger payments, publish, or change records.
        </p>
      }
      onClose={() => {
        setOpen(false);
        window.history.replaceState({}, "", window.location.pathname);
      }}
      open={open}
      status={target.status}
      title={target.title}
    >
      <div className="focused-hud-detail">
        <p className="focused-hud-description">{target.description}</p>
        <a className="focused-hud-link" href={target.href}>
          {target.linkLabel} <span aria-hidden="true">→</span>
        </a>
      </div>
    </FocusedHud>
  );
}
