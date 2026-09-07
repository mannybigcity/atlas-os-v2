import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  micahGalleryCaptionActionResult,
  micahGalleryCaptionReturnPath,
  micahGalleryCaptionReturnTo,
  planMicahGalleryCaptionSave,
  rethrowNextControlFlow,
  writeMicahGalleryCaptionRow,
} from "./gallery-caption-save.ts";
import { selectMicahWeekGallery } from "./gallery-art.ts";

function form(values: Record<string, string>) {
  return {
    get(name: string) {
      return values[name] ?? null;
    },
  };
}

test("trial owner save plan persists caption and never publishes", () => {
  const caption =
    "Monday in Cypress is won before 9am.\n\nPut the pest check on the calendar.\n\nCall to book this week's pest check.";
  const planned = planMicahGalleryCaptionSave({
    organization: { name: "Cypress Pest Pros Micah", slug: "cypress-pest-pros-micah-a5ddf6" },
    draft: {
      metadata: { week_pack: true, week_day: 1, no_live_post: true },
      status: "ready_for_review",
    },
    caption,
    editedAt: "2026-09-07T13:40:00.000Z",
  });
  assert.equal(planned.ok, true);
  if (!planned.ok) return;
  assert.equal(planned.patch.caption, caption);
  assert.equal(planned.patch.status, "ready_for_review");
  assert.equal(planned.patch.metadata.no_live_post, true);
  assert.equal(planned.patch.metadata.no_scheduler, true);
  assert.notEqual(planned.patch.status, "published");

  const gallery = selectMicahWeekGallery(
    [
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Day 1 · Monday · pest check",
        headline: "Monday pest check",
        caption: planned.patch.caption,
        supportingText: null,
        imageSvg: "<svg></svg>",
        imageUrl: null,
        metadata: planned.patch.metadata,
      },
    ],
    { demoDesk: false, logoDataUri: null },
  );
  assert.equal(gallery[0]?.caption, caption);
});

test("published drafts fall back to ready_for_review on owner save", () => {
  const planned = planMicahGalleryCaptionSave({
    organization: { name: "Cypress Pest Pros Micah", slug: "cypress-pest-pros-micah" },
    draft: { metadata: { week_pack: true }, status: "published" },
    caption: "Monday in Cypress is won before 9am.\n\nBook this week's pest check now.",
  });
  assert.equal(planned.ok, true);
  if (!planned.ok) return;
  assert.equal(planned.patch.status, "ready_for_review");
});

test("SIS and auto-post captions cannot be saved", () => {
  assert.deepEqual(
    planMicahGalleryCaptionSave({
      organization: {
        name: "SIS Custom Creations",
        slug: "sis-diy-big-complete-showcase",
      },
      draft: { metadata: { week_pack: true }, status: "ready_for_review" },
      caption: "Monday in Cypress is won before 9am.\n\nBook this week's pest check now.",
    }),
    { ok: false, reason: "sis_blocked" },
  );
  assert.deepEqual(
    planMicahGalleryCaptionSave({
      organization: { name: "Cypress Pest Pros Micah", slug: "cypress-pest-pros-micah" },
      draft: { metadata: { week_pack: true }, status: "ready_for_review" },
      caption: "Please auto-post this to Facebook with Blotato today.",
    }),
    { ok: false, reason: "edit_invalid" },
  );
  assert.deepEqual(
    planMicahGalleryCaptionSave({
      organization: { name: "Cypress Pest Pros Micah", slug: "cypress-pest-pros-micah" },
      draft: { metadata: { brand_setup: true }, status: "archived" },
      caption: "Monday in Cypress is won before 9am.\n\nBook this week's pest check now.",
    }),
    { ok: false, reason: "edit_missing" },
  );
});

test("RPC write counts as saved even when the returned caption is normalized", async () => {
  const saved = await writeMicahGalleryCaptionRow(
    [
      async () => ({
        error: null,
        caption: "Monday in Cypress is won before 9am.\n\nCall to book this week's pest check.",
      }),
    ],
    {
      organizationId: "org-1",
      draftId: "draft-1",
      caption: "Monday in Cypress is won before 9am.\n\nCall to book this week's pest check. ",
      status: "ready_for_review",
      metadata: { no_live_post: true },
    },
  );
  assert.equal(saved, true);
});

test("user-session RLS miss still saves through the admin writer", async () => {
  const caption = "Monday in Cypress is won before 9am.\n\nCall to book this week's pest check.";
  let adminWrote: string | null = null;
  const saved = await writeMicahGalleryCaptionRow(
    [
      async () => ({ error: "RLS blocked owner update", caption: null }),
      async (input) => {
        adminWrote = input.caption;
        return { error: null, caption: input.caption };
      },
    ],
    {
      organizationId: "org-1",
      draftId: "draft-1",
      caption,
      status: "ready_for_review",
      metadata: { no_live_post: true },
    },
  );
  assert.equal(saved, true);
  assert.equal(adminWrote, caption);
});

test("save return path keeps the trial workspace and never uses a hash", () => {
  const returnTo = micahGalleryCaptionReturnTo({
    previewOrg: "cypress-pest-pros-micah-a5ddf6",
    workspace: "cypress-pest-pros-micah-a5ddf6",
  });
  assert.equal(
    returnTo,
    "/client/micah?previewOrg=cypress-pest-pros-micah-a5ddf6&workspace=cypress-pest-pros-micah-a5ddf6",
  );
  const edited = micahGalleryCaptionReturnPath(
    form({ returnTo }),
    "edited",
  );
  assert.equal(
    edited,
    "/client/micah?previewOrg=cypress-pest-pros-micah-a5ddf6&workspace=cypress-pest-pros-micah-a5ddf6&content=edited",
  );
  assert.doesNotMatch(edited, /#/);
  assert.doesNotMatch(micahGalleryCaptionReturnPath(form({}), "edited"), /#/);
});

test("swallowed Next digest errors are the live blank-page crash", async () => {
  const digestError = Object.assign(new Error("NEXT_REDIRECT"), {
    digest: "NEXT_REDIRECT;replace;/login",
  });
  let thrown: unknown = null;
  try {
    rethrowNextControlFlow(digestError);
  } catch (error) {
    thrown = error;
  }
  assert.equal(thrown, digestError);
  rethrowNextControlFlow(new Error("regular write failure"));

  await assert.rejects(
    () =>
      writeMicahGalleryCaptionRow(
        [
          async () => {
            throw digestError;
          },
        ],
        {
          organizationId: "org-1",
          draftId: "draft-1",
          caption: "Monday in Cypress is won before 9am.\n\nCall to book this week's pest check.",
          status: "ready_for_review",
          metadata: { no_live_post: true },
        },
      ),
    (error) => error === digestError,
  );
});

test("save action never redirects and never swallows Next control-flow errors", () => {
  const actions = readFileSync(join(process.cwd(), "src/server/content-studio/actions.ts"), "utf8");
  const start = actions.indexOf("async function saveMicahGalleryCaption");
  assert.ok(start >= 0);
  const savePath = actions.slice(start);
  assert.match(savePath, /export async function updateMicahGalleryCaption/);
  assert.match(savePath, /_previousState: MicahDeskActionState/);
  assert.match(actions, /update_micah_gallery_caption/);
  assert.match(savePath, /rethrowNextControlFlow/);
  assert.match(savePath, /unstable_rethrow/);
  assert.doesNotMatch(savePath, /redirect\(/);
  assert.doesNotMatch(savePath, /#draft-/);
  assert.doesNotMatch(savePath, /try \{\s*clients\.push\(await createClient/);
  assert.doesNotMatch(savePath, /revalidatePath\("\/client"\)/);
  assert.match(actions, /sis_blocked/);
  assert.match(actions, /edit_unavailable/);
  assert.doesNotMatch(actions, /status: "published"/);

  const gallery = readFileSync(join(process.cwd(), "src/components/micah-week-gallery.tsx"), "utf8");
  assert.match(gallery, /useActionState/);
  assert.match(gallery, /data-micah-save="success"/);
  assert.match(gallery, /data-micah-save="error"/);
  assert.doesNotMatch(gallery, /action=\{updateMicahGalleryCaption\}/);

  const migration = readFileSync(
    join(process.cwd(), "supabase/migrations/20260907161500_update_micah_gallery_caption.sql"),
    "utf8",
  );
  assert.match(migration, /create or replace function public.update_micah_gallery_caption/);
  assert.match(migration, /security definer/);
  assert.match(migration, /sis-diy/);
  assert.match(migration, /ready_for_review/);
  assert.match(migration, /if v_status = 'published' then\s+v_status := 'ready_for_review'/);
  assert.doesNotMatch(migration, /v_status := 'published'/);
  assert.match(migration, /auth\.role\(\)/);
  assert.match(migration, /grant execute[\s\S]*authenticated/);
});

test("same-page save results never send the owner to a blank error URL", () => {
  assert.deepEqual(micahGalleryCaptionActionResult("edited"), {
    status: "success",
    error: null,
    message: "Caption saved in this gallery. Copy/Download only. Nothing was posted.",
  });
  assert.equal(micahGalleryCaptionActionResult("sis_blocked").status, "error");
  assert.equal(micahGalleryCaptionActionResult("edit_failed").status, "error");
  assert.match(String(micahGalleryCaptionActionResult("edit_failed").error), /Try again from this page/);
  assert.match(
    String(micahGalleryCaptionActionResult("edit_unavailable").error),
    /server write key is missing/,
  );
});
