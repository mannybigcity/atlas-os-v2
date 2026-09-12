import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { isAllowedDeskEmailAttachment } from "./desk-email-attachments.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("desk attachments allow a flyer or quote and reject junk", () => {
  assert.equal(isAllowedDeskEmailAttachment({ name: "quote.pdf", type: "application/pdf", size: 12_000 }), true);
  assert.equal(isAllowedDeskEmailAttachment({ name: "photo.jpg", type: "image/jpeg", size: 80_000 }), true);
  assert.equal(isAllowedDeskEmailAttachment({ name: "notes.txt", type: "text/plain", size: 400 }), true);
  assert.equal(isAllowedDeskEmailAttachment({ name: "virus.exe", type: "application/octet-stream", size: 400 }), false);
  assert.equal(isAllowedDeskEmailAttachment({ name: "huge.pdf", type: "application/pdf", size: 6 * 1024 * 1024 }), false);
  assert.equal(isAllowedDeskEmailAttachment({ name: "", type: "application/pdf", size: 10 }), false);
});

test("Email compose is white, prefills To, and has a paperclip", () => {
  const compose = readFileSync(join(root, "components/lions-den/desk-email-compose.tsx"), "utf8");
  const prospectPage = readFileSync(join(root, "app/client/prospects/[id]/page.tsx"), "utf8");
  const clientPage = readFileSync(join(root, "app/client/clients/[id]/page.tsx"), "utf8");
  const sender = readFileSync(join(root, "server/leads/email.ts"), "utf8");

  assert.match(compose, /bg-white/);
  assert.doesNotMatch(compose, /bg-\[#071b42\]/);
  assert.match(compose, /name="to"/);
  assert.match(compose, /defaultValue=\{toEmail \?\? ""\}/);
  assert.match(compose, /name="attachments"/);
  assert.match(compose, /Adjuntar/);
  assert.match(compose, /Attach/);
  assert.match(compose, /PaperclipIcon/);
  assert.match(prospectPage, /fillMissingOpportunityEmail/);
  assert.match(clientPage, /fillMissingOpportunityEmail/);
  assert.match(sender, /attachments/);
});
