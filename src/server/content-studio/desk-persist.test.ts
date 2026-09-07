import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { micahDeskActionResult, readMicahDeskIntent } from "./desk-save.ts";

function readRepo(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("desk intent defaults to build and only save is explicit", () => {
  const build = new FormData();
  assert.equal(readMicahDeskIntent(build), "build");
  build.set("intent", "build");
  assert.equal(readMicahDeskIntent(build), "build");
  const save = new FormData();
  save.set("intent", "save");
  assert.equal(readMicahDeskIntent(save), "save");
  assert.equal(readMicahDeskIntent({ intent: "save" }), "save");
  assert.equal(readMicahDeskIntent({ intent: "other" }), "build");
});

test("desk persist results stay on the page and never live-post", () => {
  assert.deepEqual(micahDeskActionResult("signed_out"), {
    status: "error",
    error: "Sign in to save this desk. Nothing was posted.",
    message: null,
  });
  assert.equal(micahDeskActionResult("sis_blocked").status, "error");
  assert.equal(micahDeskActionResult("saved").status, "success");
  assert.match(String(micahDeskActionResult("saved").message), /Nothing was posted/);
  assert.match(String(micahDeskActionResult("built").message), /Nothing was posted/);
  assert.match(String(micahDeskActionResult("failed").error), /Stay on this page/);
  assert.doesNotMatch(
    JSON.stringify([
      micahDeskActionResult("saved"),
      micahDeskActionResult("built"),
      micahDeskActionResult("failed"),
    ]),
    /blotato|schedule this post|auto-post this/i,
  );
});

test("week desk uses a JSON button path and never a form POST to /client/micah", () => {
  const desk = readRepo("src/components/micah-week-desk.tsx");
  const persist = readRepo("src/server/content-studio/desk-persist.ts");
  const save = readRepo("src/server/content-studio/desk-save.ts");
  const route = readRepo("src/app/api/client/micah/desk/route.ts");
  const actions = readRepo("src/server/content-studio/actions.ts");

  assert.match(desk, /data-micah-desk-path="json-button"/);
  assert.match(desk, /\/api\/client\/micah\/desk/);
  assert.match(desk, /data-micah-desk-control="build"/);
  assert.match(desk, /data-micah-desk-control="save"/);
  assert.match(desk, /data-micah-desk-control="generate"/);
  assert.match(desk, /data-micah-desk=\{state\.status\}/);
  assert.match(desk, /onKeyDownCapture=\{blockDeskEnterSubmit\}/);
  assert.match(desk, /type="button"/);
  assert.doesNotMatch(desk, /<form/);
  assert.doesNotMatch(desk, /type="submit"/);
  assert.doesNotMatch(desk, /useActionState/);
  assert.doesNotMatch(desk, /formAction=/);
  assert.doesNotMatch(desk, /buildMicahWeekFromDesk/);
  assert.doesNotMatch(desk, /saveMicahBrandSetup/);
  assert.doesNotMatch(desk, /encType="multipart\/form-data"/);

  assert.match(save, /Stay on this page/);
  assert.match(persist, /persistMicahDesk/);
  assert.match(persist, /getUser/);
  assert.match(persist, /isSisOrganization/);
  assert.match(persist, /sis_blocked/);
  assert.match(persist, /createMicahGalleryDraft/);
  assert.doesNotMatch(persist, /requireUser/);
  assert.doesNotMatch(persist, /redirect\(/);
  assert.doesNotMatch(persist, /revalidatePath/);
  assert.doesNotMatch(persist, /unstable_rethrow/);
  assert.doesNotMatch(persist, /status: "published"/);

  assert.match(route, /persistMicahDesk/);
  assert.match(route, /Response\.json/);
  assert.doesNotMatch(route, /redirect\(/);

  assert.match(actions, /persistMicahDesk/);
  assert.match(actions, /export async function buildMicahWeekFromDesk/);
  assert.match(actions, /export async function saveMicahBrandSetup/);
  assert.doesNotMatch(actions, /initialMicahDeskActionState/);
  assert.doesNotMatch(actions, /export type \{ MicahDeskActionState \}/);
  assert.doesNotMatch(actions, /export \{/);
  assert.match(desk, /@\/server\/content-studio\/desk-save/);
});

test("caption Save stays a JSON button and is not re-wrapped in a form", () => {
  const gallery = readRepo("src/components/micah-week-gallery.tsx");
  const captionEditor = gallery.slice(
    gallery.indexOf('data-micah-save-path="json-button"'),
    gallery.indexOf('data-micah-save="success"'),
  );
  assert.match(gallery, /\/api\/client\/micah\/caption/);
  assert.match(gallery, /data-micah-save-path="json-button"/);
  assert.match(captionEditor, /type="button"/);
  assert.doesNotMatch(captionEditor, /type="submit"/);
  assert.doesNotMatch(captionEditor, /<form/);
  assert.doesNotMatch(gallery, /useActionState/);
  assert.doesNotMatch(gallery, /updateMicahGalleryCaption/);
  assert.match(gallery, /@\/server\/content-studio\/desk-save/);
});
