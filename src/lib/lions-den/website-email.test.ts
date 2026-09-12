import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  extractBusinessEmails,
  isHttpWebsiteUrl,
  pickBestBusinessEmail,
} from "./website-email.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("HUNTER website scrape prefers a real business inbox and ignores junk", () => {
  const html = `
    <a href="mailto:info@katypest.com">Email us</a>
    Contact webmaster@wixpress.com or noreply@katypest.com
    Reach the owner at hello@katypest.com
  `;
  const emails = extractBusinessEmails(html);
  assert.deepEqual([...emails].sort(), ["hello@katypest.com", "info@katypest.com"]);
  assert.equal(pickBestBusinessEmail(emails), "info@katypest.com");
  assert.equal(pickBestBusinessEmail(["hello@katypest.com", "info@katypest.com"]), "info@katypest.com");
  assert.equal(pickBestBusinessEmail(["owner@katypest.com"]), "owner@katypest.com");
  assert.equal(pickBestBusinessEmail([]), null);
  assert.equal(isHttpWebsiteUrl("https://katypest.com/"), "https://katypest.com/");
  assert.equal(isHttpWebsiteUrl("javascript:alert(1)"), null);
});

test("desk Email and Text stay blue with white type and a pointer, and clients open", () => {
  const controls = readFileSync(join(root, "components/lions-den/prospect-controls.tsx"), "utf8");
  const clients = readFileSync(join(root, "components/lions-den/lions-den-clients.tsx"), "utf8");
  const compose = readFileSync(join(root, "components/lions-den/desk-email-compose.tsx"), "utf8");

  assert.match(controls, /data-prospect-contact/);
  assert.match(controls, /cursor-pointer/);
  assert.match(controls, /bg-\[#1246a0\]/);
  assert.match(controls, /!text-white/);
  assert.match(controls, /DeskEmailCompose/);
  assert.match(controls, /WhatsApp/);
  assert.match(controls, /prospectWhatsAppHref/);
  assert.match(controls, /DeskContactButton/);
  assert.match(controls, /Each tap is saved on Activity/);
  assert.match(clients, /data-client-row/);
  assert.match(clients, /cursor-pointer/);
  assert.match(clients, /clientHref/);
  assert.match(clients, /ProspectContactActions/);
  assert.match(compose, /data-desk-email-compose/);
  assert.match(compose, /Your login email/);
  assert.match(compose, /Tu correo de acceso/);
});

test("every desk opens a client record for edit, call, and Atlas email", () => {
  const page = readFileSync(join(root, "app/client/clients/[id]/page.tsx"), "utf8");
  const list = readFileSync(join(root, "app/client/clients/page.tsx"), "utf8");
  const actions = readFileSync(join(root, "server/sis-workspace/actions.ts"), "utf8");
  const detail = readFileSync(join(root, "components/lions-den/lions-den-prospect-detail.tsx"), "utf8");
  assert.match(page, /data-client-editor/);
  assert.match(page, /ProspectContactActions/);
  assert.match(page, /updateSisCustomer/);
  assert.match(page, /getOrganizationOpportunity/);
  assert.match(page, /getSisCustomer/);
  assert.match(page, /variant="client"/);
  assert.match(page, /fromEmail: workspace.user.email/);
  assert.doesNotMatch(page, /if \(!isSisOrganization\(organization\)\)/);
  assert.doesNotMatch(list, /\/client\/prospects\/\$\{customer\.id\}/);
  assert.match(detail, /variant === "client"/);
  assert.match(detail, /data-prospect-history/);
  assert.match(detail, /data-last-contact/);
  assert.match(page, /sisDeskActivityLines/);
  assert.match(page, /data-prospect-history/);
  assert.match(actions, /prospect", "updated"/);
});

test("Call and WhatsApp write a contacted event the salesman started", () => {
  const contact = readFileSync(join(root, "server/opportunities/desk-contact-actions.ts"), "utf8");
  const email = readFileSync(join(root, "server/opportunities/desk-email-actions.ts"), "utf8");
  const button = readFileSync(join(root, "components/lions-den/desk-contact-button.tsx"), "utf8");
  assert.match(contact, /event_type: "contacted"/);
  assert.match(contact, /deskContactStamp/);
  assert.match(contact, /last_desk_contact/);
  assert.doesNotMatch(contact, /redirect\(href\)/);
  assert.doesNotMatch(contact, /twilio/i);
  assert.match(email, /event_type: "contacted"/);
  assert.match(email, /last_desk_contact: stamp/);
  assert.match(button, /^"use client";/);
  assert.match(button, /window\.location\.assign\(href\)/);
  assert.match(button, /window\.open\(href/);
});
