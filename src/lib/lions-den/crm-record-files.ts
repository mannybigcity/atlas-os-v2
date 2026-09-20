/**
 * Files stored on a Lion's Den prospect or client record.
 * Pure helpers: no I/O, no email, no cross-org paths.
 */

export const CRM_FILES_BUCKET = "crm-files";
export const CRM_FILE_MAX_BYTES = 10 * 1024 * 1024;

export const CRM_FILE_RECORD_TABLES = ["opportunity", "sis_customer"] as const;
export type CrmFileRecordTable = (typeof CRM_FILE_RECORD_TABLES)[number];

export const CRM_FILE_LABELS = ["invoice", "contract", "other"] as const;
export type CrmFileLabel = (typeof CRM_FILE_LABELS)[number];

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "webp", "doc", "docx"]);

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCrmFileUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export function parseCrmFileRecordTable(value: unknown): CrmFileRecordTable | null {
  const table = String(value ?? "").trim();
  return (CRM_FILE_RECORD_TABLES as readonly string[]).includes(table)
    ? (table as CrmFileRecordTable)
    : null;
}

export function parseCrmFileLabel(value: unknown): CrmFileLabel {
  const label = String(value ?? "").trim().toLowerCase();
  return (CRM_FILE_LABELS as readonly string[]).includes(label) ? (label as CrmFileLabel) : "other";
}

export function crmFileLabelCopy(label: CrmFileLabel, spanish: boolean) {
  switch (label) {
    case "invoice":
      return spanish ? "Factura" : "Invoice";
    case "contract":
      return spanish ? "Contrato" : "Contract";
    default:
      return spanish ? "Otro" : "Other";
  }
}

function fileExtension(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? (parts.at(-1) ?? "") : "";
}

export function isAllowedCrmRecordFile(file: { name: string; type?: string; size: number }) {
  if (!file.name.trim() || file.size <= 0 || file.size > CRM_FILE_MAX_BYTES) return false;
  if (!ALLOWED_EXTENSIONS.has(fileExtension(file.name))) return false;
  const type = String(file.type ?? "").toLowerCase();
  return !type || ALLOWED_TYPES.has(type);
}

export function crmFileContentType(file: { name: string; type?: string }) {
  const type = String(file.type ?? "").toLowerCase();
  if (ALLOWED_TYPES.has(type)) return type;
  return CONTENT_TYPE_BY_EXTENSION[fileExtension(file.name)] ?? "application/octet-stream";
}

/** Safe path segment. No slashes, no parent hops. */
export function sanitizeCrmFileName(name: string) {
  const trimmed = name.trim().slice(0, 180);
  const cleaned = trimmed.replace(/[/\\]+/g, "").replace(/[^\w.\- ()[\]]+/g, "_");
  const base = cleaned.replace(/^\.+/, "").trim();
  return base || "file";
}

export function crmFileStoragePath(input: {
  organizationId: string;
  recordTable: CrmFileRecordTable;
  recordId: string;
  fileId: string;
  fileName: string;
}) {
  const fileName = sanitizeCrmFileName(input.fileName);
  return `${input.organizationId}/${input.recordTable}/${input.recordId}/${input.fileId}/${fileName}`;
}

export function formatCrmFileBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const CRM_FILE_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/png,image/jpeg,image/webp";
