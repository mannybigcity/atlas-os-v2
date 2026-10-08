"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { reviewContentDraft } from "@/server/content-studio/actions";
import {
  initialMicahDeskActionState,
  type MicahDeskActionState,
} from "@/server/content-studio/desk-save";
import { LD_CHIP } from "@/lib/lions-den/desk-chips";

export type MicahWeekGalleryCard = {
  id: string | null;
  day: number;
  weekday: string;
  theme?: string;
  dayLabel: string;
  title: string;
  headline: string;
  caption: string;
  instagramCaption?: string;
  linkedinCaption?: string;
  imageSvg: string;
  imageUrl?: string | null;
  imageDownloadUrl?: string | null;
  imageFileName?: string | null;
  hasGalleryImage?: boolean;
  demoLabeled: boolean;
  gradePass?: boolean;
};

type MicahWeekGalleryProps = {
  organizationId: string;
  canReview: boolean;
  canUploadImage?: boolean;
  allowCaptionEdit?: boolean;
  returnTo?: string;
  spanish: boolean;
  cards: MicahWeekGalleryCard[];
};

type MicahImageActionResult = {
  status: "success" | "error";
  error: string | null;
  message: string | null;
};

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function browserImageHref(value: string | null | undefined) {
  const href = String(value ?? "").trim();
  if (!/^https?:\/\//i.test(href)) return null;
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return href;
  } catch {
    return null;
  }
}

function imageExtensionFromHref(href: string) {
  try {
    const extension = new URL(href).pathname.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
    if (extension === "png" || extension === "jpg" || extension === "jpeg") return extension;
  } catch {
    return "png";
  }
  return "png";
}

function captionForCopy(caption: string) {
  return caption
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function writeClipboard(text: string) {
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
}

function MicahDayCard({
  card,
  organizationId,
  canReview,
  canUploadImage,
  allowCaptionEdit,
  returnTo,
  spanish,
}: {
  card: MicahWeekGalleryCard;
  organizationId: string;
  canReview: boolean;
  canUploadImage: boolean;
  allowCaptionEdit: boolean;
  returnTo: string;
  spanish: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState(card.caption);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState<"facebook" | "instagram" | "linkedin" | null>(
    null,
  );
  const [saveState, setSaveState] = useState<MicahDeskActionState>(initialMicahDeskActionState);
  const [saving, setSaving] = useState(false);
  const [imageState, setImageState] = useState<MicahImageActionResult | null>(null);
  const [imagePending, setImagePending] = useState(false);

  useEffect(() => {
    setCaption(card.caption);
  }, [card.caption]);

  useEffect(() => {
    if (saveState.status === "success") {
      setEditing(false);
    }
  }, [saveState.status]);

  async function saveCaption() {
    if (!card.id) return;
    setSaving(true);
    try {
      const response = await fetch("/api/client/micah/caption", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          organizationId,
          draftId: card.id,
          caption,
        }),
      });
      const payload = (await response.json().catch(() => null)) as MicahDeskActionState | null;
      if (payload?.status === "success" || payload?.status === "error") {
        setSaveState(payload);
        return;
      }
      setSaveState({
        status: "error",
        error: "Caption was not saved. Try again from this page. Nothing was posted.",
        message: null,
      });
    } catch {
      setSaveState({
        status: "error",
        error: "Caption was not saved. Try again from this page. Nothing was posted.",
        message: null,
      });
    } finally {
      setSaving(false);
    }
  }
  const uploadedImage = browserImageHref(card.imageUrl);
  const downloadHref = browserImageHref(card.imageDownloadUrl) ?? uploadedImage;
  const source = uploadedImage ?? svgDataUrl(card.imageSvg);
  const fileName = uploadedImage
    ? card.imageFileName ||
      `micah-day-${card.day}-${card.weekday.toLowerCase()}.${imageExtensionFromHref(uploadedImage)}`
    : `micah-day-${card.day}-${card.weekday.toLowerCase()}.svg`;
  const canSave = allowCaptionEdit && Boolean(card.id);
  const hasStoredImage = Boolean(uploadedImage) || Boolean(card.hasGalleryImage);

  async function changeImage(intent: "upload" | "remove", file?: File | null) {
    if (!card.id || !canUploadImage) return;
    if (intent === "upload") {
      if (!file || file.size <= 0 || file.size > 10 * 1024 * 1024 || !/\.(png|jpe?g)$/i.test(file.name)) {
        setImageState({
          status: "error",
          error: spanish
            ? "Usa un PNG o JPEG de hasta 10 MB. No se publicó nada."
            : "Use a PNG or JPEG up to 10 MB. Nothing was posted.",
          message: null,
        });
        return;
      }
    }
    setImagePending(true);
    try {
      const body = new FormData();
      body.set("organizationId", organizationId);
      body.set("draftId", card.id);
      body.set("intent", intent);
      if (file) body.set("file", file);
      const response = await fetch("/api/client/micah/image", {
        method: "POST",
        credentials: "same-origin",
        body,
      });
      const payload = (await response.json().catch(() => null)) as MicahImageActionResult | null;
      if (payload?.status === "success" || payload?.status === "error") {
        setImageState(payload);
        if (payload.status === "success") router.refresh();
        return;
      }
      setImageState({
        status: "error",
        error: spanish
          ? "La imagen no se guardó. No se publicó nada."
          : "Image was not saved. Nothing was posted.",
        message: null,
      });
    } catch {
      setImageState({
        status: "error",
        error: spanish
          ? "La imagen no se guardó. No se publicó nada."
          : "Image was not saved. Nothing was posted.",
        message: null,
      });
    } finally {
      setImagePending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function copyVariant(
    value: string,
    which: "facebook" | "instagram" | "linkedin",
  ) {
    await writeClipboard(captionForCopy(value));
    setCopied(which);
    window.setTimeout(() => setCopied(null), 1600);
  }

  function cancelEdit() {
    setCaption(card.caption);
    setEditing(false);
  }

  const copyButtons = (
    <>
      <button
        className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0c2b63]"
        onClick={() => void copyVariant(caption, "facebook")}
        type="button"
      >
        {copied === "facebook"
          ? spanish
            ? "Copiado"
            : "Copied"
          : spanish
            ? "Copiar Facebook"
            : "Copy caption"}
      </button>
      {card.instagramCaption ? (
        <button
          className={LD_CHIP}
          onClick={() => void copyVariant(card.instagramCaption ?? "", "instagram")}
          type="button"
        >
          {copied === "instagram"
            ? spanish
              ? "Copiado"
              : "Copied"
            : spanish
              ? "Copiar Instagram"
              : "Copy Instagram"}
        </button>
      ) : null}
      {card.linkedinCaption ? (
        <button
          className={LD_CHIP}
          onClick={() => void copyVariant(card.linkedinCaption ?? "", "linkedin")}
          type="button"
        >
          {copied === "linkedin"
            ? spanish
              ? "Copiado"
              : "Copied"
            : spanish
              ? "Copiar LinkedIn"
              : "Copy LinkedIn"}
        </button>
      ) : null}
      <a
        className={`inline-flex ${LD_CHIP}`}
        download={fileName}
        href={downloadHref ?? source}
      >
        {spanish ? "Descargar archivo" : "Download file"}
      </a>
    </>
  );

  return (
    <article
      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
      id={card.id ? `draft-${card.id}` : `micah-day-${card.day}`}
    >
      <div className="overflow-hidden bg-[#071b42]">
        {/* Generated SVG is assembled by our server from escaped fields. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={`${card.dayLabel}: ${card.headline}`}
          className="aspect-square w-full object-contain"
          data-micah-card-image={uploadedImage ? "file" : "svg"}
          src={source}
        />
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f5b932]">
            {card.dayLabel}
          </p>
          {card.gradePass !== false ? (
            <span className="rounded-full bg-[#fff8e6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#071b42]">
              {spanish ? "Calificado" : "Graded"}
            </span>
          ) : null}
        </div>
        <h3 className="mt-2 text-lg font-bold text-slate-950">{card.title}</h3>

        {canSave ? (
          <div className="mt-4 space-y-3" data-micah-save-path="json-button">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {spanish
                ? "Facebook (gancho, valor, un llamado)"
                : "Facebook caption (hook, payoff, one CTA)"}
            </label>
            {editing ? (
              <textarea
                className="mt-2 min-h-36 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#071b42] focus:ring-4 focus:ring-[#fff8e6]"
                onChange={(event) => setCaption(event.target.value)}
                value={caption}
              />
            ) : (
              <p
                className="mt-2 min-h-36 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-950"
                data-micah-caption="preview"
              >
                {caption}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {copyButtons}
              {editing ? (
                <>
                  <button
                    className="rounded-full bg-[#f5b932] px-4 py-2 text-sm font-semibold text-[#071b42] transition hover:bg-[#ffd36a]"
                    data-micah-control="save"
                    disabled={saving}
                    onClick={() => void saveCaption()}
                    type="button"
                  >
                    {saving
                      ? spanish
                        ? "Guardando"
                        : "Saving"
                      : spanish
                        ? "Guardar pie de foto"
                        : "Save caption"}
                  </button>
                  <button
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    data-micah-control="cancel"
                    onClick={cancelEdit}
                    type="button"
                  >
                    {spanish ? "Cancelar" : "Cancel"}
                  </button>
                </>
              ) : (
                <button
                  className={LD_CHIP}
                  data-micah-control="edit"
                  onClick={() => setEditing(true)}
                  type="button"
                >
                  {spanish ? "Editar" : "Edit"}
                </button>
              )}
            </div>
            {saveState.status === "success" ? (
              <p className="text-xs leading-5 text-[#0b6b3a]" data-micah-save="success">
                {saveState.message}
              </p>
            ) : null}
            {saveState.status === "error" ? (
              <p className="text-xs leading-5 text-[#9b1c1c]" data-micah-save="error">
                {saveState.error}
              </p>
            ) : null}
            <p className="text-xs leading-5 text-[#5c6578]">
              {spanish
                ? "Editar, luego Guardar, deja el pie de foto en esta galería. Copiar / Descargar solamente. Nunca se publica solo."
                : "Edit, then Save, stores the caption in this gallery. Copy/Download only. Never auto-post."}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {spanish
                ? "Facebook (gancho, valor, un llamado)"
                : "Facebook caption (hook, payoff, one CTA)"}
            </p>
            <p
              className="min-h-36 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-950"
              data-micah-caption="preview"
            >
              {caption}
            </p>
            <div className="flex flex-wrap gap-2">{copyButtons}</div>
            <p className="text-xs leading-5 text-[#5c6578]">
              {spanish
                ? "Copiar / Descargar solamente. Nunca se publica solo."
                : "Copy/Download only. Never auto-post."}
            </p>
          </div>
        )}

        {canUploadImage && card.id ? (
          <div className="mt-4 space-y-2" data-micah-image="controls">
            <input
              accept="image/png,image/jpeg,.png,.jpg,.jpeg"
              className="sr-only"
              data-micah-image="file"
              onChange={(event) => void changeImage("upload", event.target.files?.[0] ?? null)}
              ref={fileInputRef}
              type="file"
            />
            <div className="flex flex-wrap gap-2">
              <button
                className={LD_CHIP}
                data-micah-image={hasStoredImage ? "replace" : "upload"}
                disabled={imagePending}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                {imagePending
                  ? spanish
                    ? "Guardando imagen"
                    : "Saving image"
                  : hasStoredImage
                    ? spanish
                      ? "Reemplazar imagen"
                      : "Replace image"
                    : spanish
                      ? "Subir imagen"
                      : "Upload image"}
              </button>
              {hasStoredImage ? (
                <button
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  data-micah-image="remove"
                  disabled={imagePending}
                  onClick={() => void changeImage("remove")}
                  type="button"
                >
                  {spanish ? "Quitar imagen" : "Remove image"}
                </button>
              ) : null}
            </div>
            {imageState?.status === "success" ? (
              <p className="text-xs leading-5 text-[#0b6b3a]" data-micah-image="success">
                {imageState.message}
              </p>
            ) : null}
            {imageState?.status === "error" ? (
              <p className="text-xs leading-5 text-[#9b1c1c]" data-micah-image="error">
                {imageState.error}
              </p>
            ) : null}
            <p className="text-xs leading-5 text-[#5c6578]">
              {spanish
                ? "PNG o JPEG, hasta 10 MB. No se publica."
                : "PNG or JPEG, up to 10 MB. Nothing is posted."}
            </p>
          </div>
        ) : null}

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
  canUploadImage,
  allowCaptionEdit,
  returnTo,
  spanish,
  cards,
}: MicahWeekGalleryProps) {
  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-2">
      {cards.map((card) => (
        <MicahDayCard
          allowCaptionEdit={allowCaptionEdit ?? canReview}
          canReview={canReview}
          canUploadImage={canUploadImage ?? false}
          card={card}
          key={card.id ?? `day-${card.day}`}
          organizationId={organizationId}
          returnTo={returnTo || "/client/micah"}
          spanish={spanish}
        />
      ))}
    </div>
  );
}
