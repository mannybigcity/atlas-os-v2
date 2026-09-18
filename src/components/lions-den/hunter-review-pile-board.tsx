"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  acceptAllHunterReviewItems,
  acceptHunterReviewItem,
  acceptSelectedHunterReviewItems,
  dismissHunterReviewItem,
} from "@/server/hunter/actions";
import { formatHunterGapLabel, hunterGapLabels } from "@/server/hunter/filters";
import type { HunterReviewItem } from "@/server/hunter/review";
import { prospectTelHref } from "@/lib/lions-den/prospect-places";
import { isTrialSampleHunterItem, trialSampleCopy } from "@/lib/lions-den/trial-samples";
import { SampleBadge } from "@/components/lions-den/sample-badge";
import { ConfirmSubmitButton } from "@/components/lions-den/confirm-submit-button";
import { LD_CHIP } from "@/lib/lions-den/desk-chips";

const BULK_ACCEPT_CONFIRM_COUNT = 8;

type HunterReviewPileBoardProps = {
  organizationId: string;
  items: HunterReviewItem[];
  pendingCount?: number;
  spanish: boolean;
};

function itemHasPublishedPhone(item: HunterReviewItem) {
  return Boolean(prospectTelHref(item.phone));
}

function bulkConfirmMessage(input: {
  count: number;
  noPhoneCount: number;
  spanish: boolean;
  all: boolean;
}) {
  const who = input.all
    ? input.spanish
      ? `¿Aceptar los ${input.count} hallazgos pendientes en Prospectos para este escritorio?`
      : `Accept all ${input.count} pending listings into Prospects for this desk?`
    : input.spanish
      ? `¿Aceptar ${input.count} hallazgos seleccionados en Prospectos para este escritorio?`
      : `Accept ${input.count} selected listings into Prospects for this desk?`;
  const contact = input.spanish
    ? "Atlas no enviará correos, llamadas ni SMS."
    : "Atlas will not email, call, or text anyone.";
  const phone = input.noPhoneCount
    ? input.spanish
      ? ` ${input.noPhoneCount} no tienen teléfono publicado; no serán prospectos para llamar. Atlas no inventa números.`
      : ` ${input.noPhoneCount} have no published phone and will not become Call prospects. Atlas will not invent a number.`
    : "";
  return `${who} ${contact}${phone}`;
}

export function HunterReviewPileBoard({
  organizationId,
  items,
  pendingCount,
  spanish,
}: HunterReviewPileBoardProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const visibleIds = useMemo(() => items.map((item) => item.id), [items]);
  const visibleIdSet = useMemo(() => new Set(visibleIds), [visibleIds]);
  const selectedVisible = selected.filter((id) => visibleIdSet.has(id));
  const selectedSet = useMemo(() => new Set(selectedVisible), [selectedVisible]);
  const allSelected = items.length > 0 && items.every((item) => selectedSet.has(item.id));
  const someSelected = selectedVisible.length > 0 && !allSelected;
  const selectedItems = items.filter((item) => selectedSet.has(item.id));
  const selectedNoPhone = selectedItems.filter((item) => !itemHasPublishedPhone(item)).length;
  const allNoPhone = items.filter((item) => !itemHasPublishedPhone(item)).length;
  const acceptAllCount = Math.max(pendingCount ?? items.length, items.length);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  function toggleAll(checked: boolean) {
    setSelected(checked ? visibleIds : []);
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((current) => {
      if (checked) return current.includes(id) ? current : [...current, id];
      return current.filter((value) => value !== id);
    });
  }

  const acceptSelectedConfirm =
    selectedVisible.length >= BULK_ACCEPT_CONFIRM_COUNT || selectedNoPhone > 0
      ? bulkConfirmMessage({
          count: selectedVisible.length,
          noPhoneCount: selectedNoPhone,
          spanish,
          all: false,
        })
      : null;

  return (
    <div className="mt-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-[#ece7d8] bg-[#fbfaf4] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm font-semibold text-[#071b42]">
          <input
            ref={selectAllRef}
            checked={allSelected}
            className="size-4 rounded border-[#d8c27a] accent-[#071b42]"
            onChange={(event) => toggleAll(event.target.checked)}
            type="checkbox"
          />
          {spanish ? "Seleccionar todos los visibles" : "Select all visible"}
        </label>
        <div className="flex flex-wrap gap-2">
          <form action={acceptSelectedHunterReviewItems}>
            <input name="organizationId" type="hidden" value={organizationId} />
            {selectedVisible.map((id) => (
              <input key={id} name="reviewItemId" type="hidden" value={id} />
            ))}
            {acceptSelectedConfirm ? (
              <ConfirmSubmitButton
                className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                confirmMessage={acceptSelectedConfirm}
                disabled={selectedVisible.length === 0}
              >
                {spanish ? "Aceptar seleccionados" : "Accept selected"}
              </ConfirmSubmitButton>
            ) : (
              <button
                className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                disabled={selectedVisible.length === 0}
                type="submit"
              >
                {spanish ? "Aceptar seleccionados" : "Accept selected"}
              </button>
            )}
          </form>
          <form action={acceptAllHunterReviewItems}>
            <input name="organizationId" type="hidden" value={organizationId} />
            <ConfirmSubmitButton
              className={LD_CHIP}
              confirmMessage={bulkConfirmMessage({
                count: acceptAllCount,
                noPhoneCount: allNoPhone,
                spanish,
                all: true,
              })}
            >
              {spanish ? "Aceptar todos" : "Accept all"}
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <div className="mt-2 divide-y divide-[#ece7d8]">
        {items.map((item) => (
          <article className="py-4" key={item.id}>
            <div className="flex items-start gap-3">
              <input
                aria-label={item.name}
                checked={selectedSet.has(item.id)}
                className="mt-1.5 size-4 shrink-0 rounded border-[#d8c27a] accent-[#071b42]"
                onChange={(event) => toggleOne(item.id, event.target.checked)}
                type="checkbox"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="flex flex-wrap items-center gap-2 font-semibold text-[#071b42]">
                    <span>{item.name}</span>
                    {isTrialSampleHunterItem(item) ? <SampleBadge label={trialSampleCopy(spanish).badge} /> : null}
                  </h3>
                  {prospectTelHref(item.phone) ? (
                    <p className="mt-1 text-sm font-medium text-[#071b42]">
                      <a className="underline decoration-[#d8c27a] underline-offset-4" href={prospectTelHref(item.phone) ?? undefined}>
                        {item.phone}
                      </a>
                    </p>
                  ) : null}
                  {item.formattedAddress ? (
                    <p className="mt-1 text-sm text-[#5c6578]">{item.formattedAddress}</p>
                  ) : null}
                  <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[#8a93a3]">
                    {(item.primaryType ?? (spanish ? "Negocio" : "Business")).replaceAll("_", " ")}
                    {item.businessStatus ? ` · ${item.businessStatus.replaceAll("_", " ")}` : ""}
                  </p>
                  {hunterGapLabels(item).length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {hunterGapLabels(item).map((label) => (
                        <span
                          className="rounded-full bg-[#fff8e6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#071b42]"
                          key={label}
                        >
                          {formatHunterGapLabel(label, spanish)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-2 text-xs font-medium text-[#8a6a12]">
                    {prospectTelHref(item.phone)
                      ? spanish
                        ? "Teléfono publicado por Google. Acepta para ponerlo en tu lista de llamadas."
                        : "Phone published by Google. Accept to put it on your call list."
                      : spanish
                        ? "Google no publicó teléfono aquí. Atlas no inventa números; puedes agregar uno después de aceptar."
                        : "Google published no phone for this listing. Atlas will not invent a number; you can add one after accepting."}
                  </p>
                  <p className="mt-2 text-xs text-[#8a93a3]" translate="no">
                    Google Maps · {item.searchQuery}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={acceptHunterReviewItem}>
                    <input name="organizationId" type="hidden" value={organizationId} />
                    <input name="reviewItemId" type="hidden" value={item.id} />
                    <button className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white" type="submit">
                      {spanish ? "Aceptar a Prospectos" : "Accept into Prospects"}
                    </button>
                  </form>
                  <form action={dismissHunterReviewItem}>
                    <input name="organizationId" type="hidden" value={organizationId} />
                    <input name="reviewItemId" type="hidden" value={item.id} />
                    <button className={LD_CHIP} type="submit">
                      {spanish ? "Omitir" : "Skip"}
                    </button>
                  </form>
                  {item.googleMapsUrl ? (
                    <a
                      className={LD_CHIP}
                      href={item.googleMapsUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {spanish ? "Verificar" : "Verify"}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
