"use client";

import { useEffect, useRef, useState } from "react";
import { deleteSalesProspect } from "@/server/sales/actions";

type ProspectDeleteDialogProps = {
  prospectId: string;
  prospectName: string;
  returnTo: string;
};

export function ProspectDeleteDialog({
  prospectId,
  prospectName,
  returnTo,
}: ProspectDeleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
      return;
    }

    triggerRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-800 transition hover:bg-rose-100"
        onClick={() => setOpen(true)}
        type="button"
      >
        Delete
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div
            aria-labelledby={`delete-title-${prospectId}`}
            aria-modal="true"
            className="w-full max-w-xl rounded-[1.6rem] border border-slate-200 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.24)] outline-none"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
              }
            }}
            role="dialog"
            tabIndex={-1}
          >
            <form action={deleteSalesProspect} className="p-6">
              <input name="prospectId" type="hidden" value={prospectId} />
              <input name="confirmName" type="hidden" value={prospectName} />
              <input name="returnTo" type="hidden" value={returnTo} />

              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-700">
                Permanent delete
              </p>
              <h3
                className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950"
                id={`delete-title-${prospectId}`}
              >
                Delete {prospectName}?
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                This permanently removes the prospect and its related history from the current schema. There is no restore path.
              </p>
              <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                Confirmed target: <span className="font-semibold">{prospectName}</span>
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  ref={cancelRef}
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                  type="submit"
                >
                  Delete prospect
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
