"use client";

import { useState } from "react";
import { reviewContentDraft } from "@/server/content-studio/actions";

export type MicahWeekGalleryCard = {
  id: string | null;
  day: number;
  weekday: string;
  dayLabel: string;
  title: string;
  headline: string;
  caption: string;
  imageSvg: string;
  demoLabeled: boolean;
};

type MicahWeekGalleryProps = {
  organizationId: string;
  canReview: boolean;
  spanish: boolean;
  cards: MicahWeekGalleryCard[];
};

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function captionForCopy(caption: string) {
  return caption.replace(/\s+/g, " ").trim();
}

function MicahDayCard({
  card,
  organizationId,
  canReview,
  spanish,
}: {
  card: MicahWeekGalleryCard;
  organizationId: string;
  canReview: boolean;
  spanish: boolean;
}) {
  const [caption, setCaption] = useState(card.caption);
  const [copied, setCopied] = useState(false);
  const source = svgDataUrl(card.imageSvg);
  const fileName = `micah-day-${card.day}-${card.weekday.toLowerCase()}.svg`;

  async function copyCaption() {
    const text = captionForCopy(caption);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article
      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
      id={card.id ? `draft-${card.id}` : `micah-day-${card.day}`}
    >
      <div className="bg-[#071b42]">
        {/* Generated SVG is assembled by our server from escaped fields. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={`${card.dayLabel}: ${card.headline}`}
          className="aspect-square w-full object-cover"
          src={source}
        />
      </div>

      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f5b932]">
          {card.dayLabel}
        </p>
        <h3 className="mt-2 text-lg font-bold text-slate-950">{card.title}</h3>
        {card.demoLabeled ? (
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#071b42]">
            DEMO
          </p>
        ) : null}

        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {spanish ? "Texto para copiar" : "Caption to copy"}
        </label>
        <textarea
          className="mt-2 min-h-28 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#071b42] focus:ring-4 focus:ring-[#fff8e6]"
          onChange={(event) => setCaption(event.target.value)}
          value={caption}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0c2b63]"
            onClick={() => void copyCaption()}
            type="button"
          >
            {copied
              ? spanish
                ? "Copiado"
                : "Copied"
              : spanish
                ? "Copiar texto"
                : "Copy caption"}
          </button>
          <a
            className="inline-flex rounded-full border border-[#071b42] bg-white px-4 py-2 text-sm font-semibold text-[#071b42] transition hover:bg-[#fff8e6]"
            download={fileName}
            href={source}
          >
            {spanish ? "Descargar archivo" : "Download file"}
          </a>
        </div>

        {canReview && card.id ? (
          <form action={reviewContentDraft} className="mt-4 space-y-3">
            <input name="organizationId" type="hidden" value={organizationId} />
            <input name="draftId" type="hidden" value={card.id} />
            <textarea
              className="min-h-20 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              name="note"
              placeholder={
                spanish
                  ? "Comentarios opcionales para Atlas y MICAH"
                  : "Optional feedback for Atlas and MICAH"
              }
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                name="decision"
                type="submit"
                value="approved"
              >
                {spanish ? "Conservar borrador" : "Keep this draft"}
              </button>
              <button
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                name="decision"
                type="submit"
                value="changes_requested"
              >
                {spanish ? "Solicitar cambios" : "Request changes"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </article>
  );
}

export function MicahWeekGallery({
  organizationId,
  canReview,
  spanish,
  cards,
}: MicahWeekGalleryProps) {
  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-2">
      {cards.map((card) => (
        <MicahDayCard
          canReview={canReview}
          card={card}
          key={card.id ?? `day-${card.day}`}
          organizationId={organizationId}
          spanish={spanish}
        />
      ))}
    </div>
  );
}
