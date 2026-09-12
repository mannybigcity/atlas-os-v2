export const DESK_EMAIL_MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const DESK_EMAIL_MAX_ATTACHMENTS = 3;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "txt",
  "csv",
  "doc",
  "docx",
  "xls",
  "xlsx",
]);

export type DeskEmailAttachment = {
  filename: string;
  content: string;
  contentType: string;
};

function fileExtension(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? (parts.at(-1) ?? "") : "";
}

export function isAllowedDeskEmailAttachment(file: { name: string; type?: string; size: number }) {
  if (!file.name.trim() || file.size <= 0 || file.size > DESK_EMAIL_MAX_ATTACHMENT_BYTES) return false;
  const type = String(file.type ?? "").toLowerCase();
  if (type && ALLOWED_TYPES.has(type)) return true;
  return ALLOWED_EXTENSIONS.has(fileExtension(file.name));
}

export async function readDeskEmailAttachments(formData: FormData): Promise<
  { ok: true; attachments: DeskEmailAttachment[] } | { ok: false }
> {
  const files = formData
    .getAll("attachments")
    .filter((value): value is File => typeof File !== "undefined" && value instanceof File && value.size > 0);
  if (files.length === 0) return { ok: true, attachments: [] };
  if (files.length > DESK_EMAIL_MAX_ATTACHMENTS) return { ok: false };
  const attachments: DeskEmailAttachment[] = [];
  for (const file of files) {
    if (!isAllowedDeskEmailAttachment(file)) return { ok: false };
    const bytes = Buffer.from(await file.arrayBuffer());
    attachments.push({
      filename: file.name.slice(0, 180),
      content: bytes.toString("base64"),
      contentType: file.type || "application/octet-stream",
    });
  }
  return { ok: true, attachments };
}
