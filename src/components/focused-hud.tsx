"use client";

import { useEffect, useRef, type ReactNode } from "react";

type FocusedHudProps = {
  eyebrow: string;
  title: string;
  status?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function FocusedHud({
  children,
  eyebrow,
  footer,
  onClose,
  open,
  status,
  title,
}: FocusedHudProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    returnFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="focused-hud-layer" role="presentation">
      <button
        aria-label="Close focused detail"
        className="focused-hud-backdrop"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-labelledby="focused-hud-title"
        aria-modal="true"
        className="focused-hud"
        role="dialog"
      >
        <div className="focused-hud-header">
          <div>
            <p className="focused-hud-eyebrow">{eyebrow}</p>
            <h2 id="focused-hud-title">{title}</h2>
            {status ? <p className="focused-hud-status">{status}</p> : null}
          </div>
          <button
            aria-label="Close focused detail"
            className="focused-hud-close"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="focused-hud-body">{children}</div>
        {footer ? <div className="focused-hud-footer">{footer}</div> : null}
      </aside>
    </div>
  );
}
