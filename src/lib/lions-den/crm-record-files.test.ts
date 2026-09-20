import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  CRM_FILE_MAX_BYTES,
  CRM_FILES_BUCKET,
  crmFileContentType,
  crmFileLabelCopy,
  crmFileStoragePath,
  isAllowedCrmRecordFile,
  parseCrmFileLabel,
  parseCrmFileRecordTable,
  sanitizeCrmFileName,
} from "./crm-record-files.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const org = "11111111-1111-4111-8111-111111111111";
const record = "22222222-2222-4222-8222-222222222222";
const fileId = "33333333-3333-4333-8333-333333333333";

test("CRM files allow invoice types and reject junk or oversized files", () => {
  assert.equal(isAllowedCrmRecordFile({ name: "invoice.pdf", type: "application/pdf", size: 12_000 }), true);
  assert.equal(isAllowedCrmRecordFile({ name: "photo.PNG", type: "image/png", size: 80_000 }), true);
  assert.equal(isAllowedCrmRecordFile({ name: "scan.jpg", type: "image/jpeg", size: 80_000 }), true);
  assert.equal(isAllowedCrmRecordFile({ name: "scan.webp", type: "image/webp", size: 80_000 }), true);
  assert.equal(isAllowedCrmRecordFile({ name: "scope.doc", type: "application/msword", size: 40_000 }), true);
  assert.equal(
    isAllowedCrmRecordFile({
      name: "contract.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 40_000,
    }),
    true,
  );
  assert.equal(isAllowedCrmRecordFile({ name: "notes.txt", type: "text/plain", size: 400 }), false);
  assert.equal(isAllowedCrmRecordFile({ name: "virus.exe", type: "application/octet-stream", size: 400 }), false);
  assert.equal(isAllowedCrmRecordFile({ name: "virus.exe", type: "application/pdf", size: 400 }), false);
  assert.equal(isAllowedCrmRecordFile({ name: "huge.pdf", type: "application/pdf", size: CRM_FILE_MAX_BYTES + 1 }), false);
  assert.equal(isAllowedCrmRecordFile({ name: "", type: "application/pdf", size: 10 }), false);
});

test("storage path is org-scoped and cannot hop directories", () => {
  const path = crmFileStoragePath({
    organizationId: org,
    recordTable: "opportunity",
    recordId: record,
    fileId,
    fileName: "../../secret.pdf",
  });
  assert.equal(path.startsWith(`${org}/opportunity/${record}/${fileId}/`), true);
  assert.doesNotMatch(path, /\.\.\//);
  assert.equal(sanitizeCrmFileName("a/b\\c.pdf"), "abc.pdf");
  assert.equal(parseCrmFileRecordTable("sis_customer"), "sis_customer");
  assert.equal(parseCrmFileRecordTable("organizations"), null);
  assert.equal(parseCrmFileLabel("Invoice"), "invoice");
  assert.equal(crmFileLabelCopy("contract", true), "Contrato");
  assert.equal(crmFileContentType({ name: "x.pdf", type: "" }), "application/pdf");
});

test("contract: Files lives on client and prospect records, private, never emailed", () => {
  const actions = readFileSync(join(root, "server/crm-files/actions.ts"), "utf8");
  assert.match(actions, /export async function uploadCrmRecordFile/);
  assert.match(actions, /export async function deleteCrmRecordFile/);
  assert.match(actions, /export async function downloadCrmRecordFile/);
  assert.match(actions, /createSignedUrl/);
  assert.match(actions, /requireProspectOwner/);
  assert.match(actions, /isAllowedCrmRecordFile/);
  assert.doesNotMatch(actions, /sendLeadEmail|sendOwnerSms/);
  assert.match(actions, new RegExp(CRM_FILES_BUCKET));

  const queries = readFileSync(join(root, "server/crm-files/queries.ts"), "utf8");
  assert.match(queries, /\.eq\("organization_id", organizationId\)/);
  assert.match(queries, /\.eq\("record_table", recordTable\)/);

  const panel = readFileSync(join(root, "components/lions-den/crm-record-files.tsx"), "utf8");
  assert.match(panel, /data-crm-files/);
  assert.match(panel, /PaperclipIcon/);
  assert.match(panel, /Archivos/);
  assert.match(panel, /action=\{uploadCrmRecordFile\}/);
  assert.match(panel, /action=\{deleteCrmRecordFile\}/);
  assert.match(panel, /Sí, eliminar/);
  assert.doesNotMatch(panel, /sendLeadEmail/);

  for (const page of ["app/client/prospects/[id]/page.tsx", "app/client/clients/[id]/page.tsx"]) {
    const source = readFileSync(join(root, page), "utf8");
    assert.match(source, /<CrmRecordFiles/);
    assert.match(source, /<ClientProfileForm/);
  }
  const clientsPage = readFileSync(join(root, "app/client/clients/[id]/page.tsx"), "utf8");
  assert.match(clientsPage, /recordTable="sis_customer"/);
  assert.match(clientsPage, /recordTable="opportunity"/);

  const homepage = readFileSync(join(root, "components/atlas-homepage.tsx"), "utf8");
  assert.doesNotMatch(homepage, /CrmRecordFiles|crm-files|data-crm-files/);

  const migration = readFileSync(join(root, "../supabase/migrations/20260920010000_crm_record_files.sql"), "utf8");
  assert.match(migration, /create table if not exists public\.crm_record_files/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /organization_memberships/);
  assert.match(migration, /insert into storage\.buckets/);
  assert.match(migration, /values \('crm-files', 'crm-files', false, 10485760\)/);
  assert.match(migration, /public = false/);
  assert.match(migration, /storage\.foldername\(name\)\)\[1\]/);
  assert.doesNotMatch(migration, /for all to anon|to public/);

  const nextConfig = readFileSync(join(root, "../next.config.ts"), "utf8");
  assert.match(nextConfig, /bodySizeLimit:\s*"12mb"/);
});
