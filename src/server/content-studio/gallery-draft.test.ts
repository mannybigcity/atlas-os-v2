import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  buildMicahDraftCopy,
  buildMicahDraftSvg,
  buildMicahGalleryCaptionUpdate,
  buildMicahWeekPack,
  canShowMicahGalleryEdit,
  captionForClipboard,
  fitMicahCardHeadline,
  galleryLogoForMicahDesk,
  hireableMicahCardHeadline,
  isConcatenatedDemoCompanyCopy,
  micahSvgNeedsRefit,
  micahSvgTextRuns,
  parseMicahDemeanor,
  parseMicahGalleryCaptionEdit,
  readOfficialAtlasLogoDataUri,
  resolveMicahDemeanor,
  selectMicahWeekGallery,
  wrapMicahCardLines,
} from "./gallery-art.ts";
import {
  MICAH_GALLERY_IMAGE_MAX_BYTES,
  MICAH_GALLERY_IMAGE_URL_TTL_SECONDS,
  applyMicahGalleryImageChange,
  micahGalleryImageBytesMatch,
  planMicahGalleryImageChange,
  resolveMicahGalleryImageSource,
} from "./gallery-image.ts";
import { gradeKingdomWeek } from "./kingdom-social.ts";
import { presentLiveDeskDraft } from "../../lib/lions-den/live-desk.ts";

const IMAGE_ORG_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const IMAGE_DRAFT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

test("MICAH gallery drafts are navy/gold downloadable SVGs and never live posts", () => {
  const copy = buildMicahDraftCopy("Make a Facebook post and a flyer image for Labor Day");
  assert.equal(copy.headline, "Labor Day");
  assert.match(copy.caption, /did not publish/);
  assert.match(copy.title, /MICAH draft: Labor Day/);
  assert.doesNotMatch(copy.caption, /posted to Facebook or Instagram/i);

  const svg = buildMicahDraftSvg({
    headline: copy.headline,
    supportingText: copy.supportingText,
    logoDataUri: "data:image/png;base64,ZmFrZQ==",
  });
  assert.match(svg, /#071b42/);
  assert.match(svg, /#f5b932/);
  assert.match(svg, /Labor Day/);
  assert.match(svg, /data:image\/png;base64,ZmFrZQ==/);
  assert.match(svg, /DRAFT — download and post yourself/);
  assert.doesNotMatch(svg, /published to Facebook|posted live/i);
});

test("official circular-ready Atlas logo file is pasted as-is when present", () => {
  const logoPath = join(process.cwd(), "public/brand/atlas-logo.png");
  assert.equal(existsSync(logoPath), true);
  const dataUri = readOfficialAtlasLogoDataUri();
  assert.ok(dataUri);
  assert.match(String(dataUri), /^data:image\/png;base64,/);
  const svg = buildMicahDraftSvg({
    headline: "Labor Day special",
    supportingText: "Download this draft",
    logoDataUri: dataUri,
  });
  assert.match(svg, /<image href="data:image\/png;base64,/);
});

test("MICAH week pack is 7 navy/gold day-cards with copyable captions", () => {
  const cards = buildMicahWeekPack({
    prompt: "Make a week of posts for Labor Day",
    demeanor: "friendly_local",
    demoDesk: true,
    logoDataUri: "data:image/png;base64,ZmFrZQ==",
  });
  assert.equal(cards.length, 7);
  assert.deepEqual(
    cards.map((card) => `${card.day}:${card.weekday}`),
    [
      "1:Monday",
      "2:Tuesday",
      "3:Wednesday",
      "4:Thursday",
      "5:Friday",
      "6:Saturday",
      "7:Sunday",
    ],
  );
  assert.equal(cards.some((card) => /ABC Plumbing/.test(card.title)), true);
  assert.equal(cards.some((card) => /123 Catering/.test(card.title)), true);
  assert.equal(cards.some((card) => /XYZ Electric/.test(card.title)), true);
  for (const card of cards) {
    assert.match(card.dayLabel, /DAY \d/);
    assert.match(card.caption, /Sample draft/);
    assert.match(captionForClipboard(card.caption), /\n\n/);
    assert.doesNotMatch(card.caption, /SIS Custom Creations/i);
    assert.doesNotMatch(card.title, /\bDEMO\b/);
    assert.match(card.imageSvg, /#071b42/);
    assert.match(card.imageSvg, /#f5b932/);
    assert.match(card.imageSvg, /DAY \d/);
    assert.doesNotMatch(card.imageSvg, /from-blue-950|to-blue-700/);
    assert.equal(card.gradePass, true);
  }
  assert.equal(gradeKingdomWeek(cards).pass, true);
});

test("demeanor is parsed once and Faith is never the DEMO default", () => {
  assert.equal(parseMicahDemeanor("Friendly/local"), "friendly_local");
  assert.equal(parseMicahDemeanor("friendly_local"), "friendly_local");
  assert.equal(parseMicahDemeanor("Motivational please"), "motivational");
  assert.equal(parseMicahDemeanor("straight"), "straight");
  assert.equal(parseMicahDemeanor("comical"), "comical");
  assert.equal(parseMicahDemeanor("Faith"), "faith");

  const demoFaith = resolveMicahDemeanor({
    prompt: "Make a week. Faith.",
    demoDesk: true,
  });
  assert.equal(demoFaith.demeanor, null);
  assert.equal(demoFaith.blockedFaithOnDemo, true);

  const stored = resolveMicahDemeanor({
    prompt: "Make a week of posts",
    stored: "comical",
    demoDesk: true,
  });
  assert.equal(stored.demeanor, "comical");

  const unset = resolveMicahDemeanor({ prompt: "Make a week of posts" });
  assert.equal(unset.demeanor, null);

  const coerced = buildMicahWeekPack({
    prompt: "Make a week of posts. Faith.",
    demeanor: "faith",
    demoDesk: true,
  });
  assert.equal(coerced.every((card) => !/Grateful for/i.test(card.caption)), true);
  assert.equal(gradeKingdomWeek(coerced).pass, true);
});

test("empty non-demo gallery stays empty and ignores a stored brand kit", () => {
  const gallery = selectMicahWeekGallery(
    [
      {
        id: "brand-1",
        title: "MICAH brand kit",
        headline: "Brand setup",
        caption: "Stored brand setup for this workspace. MICAH does not post.",
        supportingText: "Voice, colors, and social handles.",
        imageSvg: null,
        imageUrl: "data:image/png;base64,ZmFrZQ==",
        metadata: { brand_setup: true, micah_demeanor: "straight" },
      },
    ],
    { demoDesk: false, logoDataUri: null },
  );
  assert.equal(gallery.length, 0);
});

test("week pack can use a client's colors without inventing a logo", () => {
  const cards = buildMicahWeekPack({
    prompt: "Week of posts for the shop",
    demeanor: "straight",
    primaryColor: "#123456",
    secondaryColor: "#abcdef",
    logoDataUri: null,
  });
  assert.equal(cards.length, 7);
  assert.match(cards[0]?.dayLabel ?? "", /MONDAY MOTIVATION/);
  assert.match(cards[1]?.dayLabel ?? "", /TIP TUESDAY/);
  assert.match(cards[0]?.imageSvg ?? "", /#123456/);
  assert.match(cards[0]?.imageSvg ?? "", /#abcdef/);
  assert.doesNotMatch(cards[0]?.imageSvg ?? "", /<image href="/);
});

test("client desks do not stamp the AFE lion; DEMO may still paste the official logo", () => {
  const official = readOfficialAtlasLogoDataUri();
  assert.equal(
    galleryLogoForMicahDesk({ demoDesk: false, brandLogo: null }),
    null,
  );
  assert.equal(
    galleryLogoForMicahDesk({ demoDesk: false, brandLogo: "data:image/png;base64,ZmFrZQ==" }),
    "data:image/png;base64,ZmFrZQ==",
  );
  assert.equal(
    galleryLogoForMicahDesk({ demoDesk: true, brandLogo: null }),
    official,
  );
  const source = readFileSync(join(process.cwd(), "src/server/content-studio/gallery-draft.ts"), "utf8");
  assert.match(source, /galleryLogoForMicahDesk/);
  assert.doesNotMatch(source, /readOfficialAtlasLogoDataUri\(\)/);
});

test("owner caption edits stay gallery-only and reject auto-post language", () => {
  const saved = parseMicahGalleryCaptionEdit(
    "Monday in Cypress is won before 9am.\n\nPut the pest check on the calendar.\n\nCall to book this week's pest check.\n\n#PestCheck #Cypress",
  );
  assert.ok(saved);
  assert.match(String(saved), /pest check/);
  assert.equal(parseMicahGalleryCaptionEdit("too short"), null);
  assert.equal(parseMicahGalleryCaptionEdit("Please auto-post this to Facebook with Blotato today."), null);
  assert.equal(parseMicahGalleryCaptionEdit("Schedule this post for Friday."), null);
});

test("trial owners can edit gallery captions; SIS cannot", () => {
  assert.equal(
    canShowMicahGalleryEdit({ name: "Cypress Pest Pros Micah", slug: "cypress-pest-pros-micah" }),
    true,
  );
  assert.equal(
    canShowMicahGalleryEdit({ name: "Sample desk", slug: "afe-crm-demo" }),
    true,
  );
  assert.equal(
    canShowMicahGalleryEdit({
      name: "SIS Custom Creations",
      slug: "sis-diy-big-complete-showcase",
    }),
    false,
  );
  assert.equal(canShowMicahGalleryEdit(null), false);
});

test("saved owner caption is what the gallery shows after reload and never publishes", () => {
  const nextCaption =
    "Monday in Cypress is won before 9am.\n\nPut the pest check on the calendar.\n\nCall to book this week's pest check.";
  const patch = buildMicahGalleryCaptionUpdate({
    metadata: {
      week_pack: true,
      week_day: 1,
      week_theme: "Monday Motivation",
      instagram_caption: "old Instagram SAMPLE",
      linkedin_caption: "old LinkedIn SAMPLE",
    },
    caption: nextCaption,
    status: "ready_for_review",
    editedAt: "2026-09-07T13:00:00.000Z",
  });
  assert.ok(patch);
  assert.equal(patch.caption, nextCaption);
  assert.equal(patch.status, "ready_for_review");
  assert.equal(patch.metadata.no_live_post, true);
  assert.equal(patch.metadata.no_scheduler, true);
  assert.equal(patch.metadata.owner_edited_at, "2026-09-07T13:00:00.000Z");
  assert.equal(patch.metadata.week_pack, true);
  assert.notEqual(patch.status, "published");

  const published = buildMicahGalleryCaptionUpdate({
    metadata: { week_pack: true, week_day: 2 },
    caption: nextCaption,
    status: "published",
    editedAt: "2026-09-07T13:00:00.000Z",
  });
  assert.equal(published?.status, "ready_for_review");
  assert.equal(published?.metadata.no_live_post, true);

  assert.equal(
    buildMicahGalleryCaptionUpdate({
      metadata: { week_pack: true },
      caption: "Please auto-post this to Facebook with Blotato today.",
    }),
    null,
  );

  const gallery = selectMicahWeekGallery(
    [
      {
        id: "draft-monday",
        title: "Day 1 · Monday · pest check",
        headline: "Monday pest check",
        caption: patch.caption,
        supportingText: null,
        imageSvg: "<svg></svg>",
        imageUrl: null,
        metadata: patch.metadata,
      },
    ],
    { demoDesk: false, logoDataUri: null },
  );
  assert.equal(gallery.length, 1);
  assert.equal(gallery[0]?.id, "draft-monday");
  assert.equal(gallery[0]?.caption, nextCaption);
});

test("day-board generate writes one week-pack slot from the prompt theme", () => {
  const source = readFileSync(join(process.cwd(), "src/server/content-studio/gallery-draft.ts"), "utf8");
  assert.match(source, /focusDayFromMicahPrompt/);
  assert.match(source, /pack.filter\(\(card\) => card.day === focusDay\)/);
  assert.match(source, /input.focusDay === undefined/);
  assert.match(source, /saved \$\{first\?\.theme/);
  assert.doesNotMatch(source, /schedule this post/i);
});

test("day-card SVG wraps and clamps headline so text stays inside the card", () => {
  const wrapped = wrapMicahCardLines(
    "ABC Plumbing, 123 Catering, and XYZ Electric plus more overflow bait for the navy card",
    22,
    3,
  );
  assert.equal(wrapped.length, 3);
  assert.equal(wrapped.every((line) => line.length <= 22), true);
  assert.match(wrapped[2] ?? "", /…$/);

  const fit = fitMicahCardHeadline(
    "ABC Plumbing, 123 Catering, and XYZ Electric · ABC Plumbing",
  );
  assert.ok(fit.lines.length >= 2);
  assert.equal(fit.lines.every((line) => line.length <= 36), true);
  assert.ok(fit.fontSize <= 54);

  const svg = buildMicahDraftSvg({
    headline: "ABC Plumbing, 123 Catering, and XYZ Electric · ABC Plumbing",
    supportingText: "Navy and gold Atlas draft. Download the file and post it yourself.",
    logoDataUri: "data:image/png;base64,ZmFrZQ==",
    dayLabel: "DAY 1 · MONDAY MOTIVATION",
  });
  assert.match(svg, /overflow="hidden"/);
  assert.match(svg, /<tspan x="540"/);
  assert.doesNotMatch(svg, /<text[^>]*fill="#ffffff"[^>]*>[^<]{28,}</);
  const runs = micahSvgTextRuns(svg);
  const body = runs.filter((run) => !/^(ATLAS|DRAFT\b|DAY \d)/i.test(run));
  assert.ok(body.length >= 2);
  assert.equal(body.every((run) => run.length <= 42), true);
  assert.equal(micahSvgNeedsRefit(svg), false);
});

test("sample desk week pack uses one hireable company per card, not a concatenated dump", () => {
  const cards = buildMicahWeekPack({
    prompt: "Week of posts for ABC Plumbing, 123 Catering, and XYZ Electric",
    demeanor: "straight",
    demoDesk: true,
  });
  assert.equal(cards.length, 7);
  const names = ["ABC Plumbing", "123 Catering", "XYZ Electric"] as const;
  for (const card of cards) {
    const hits = names.filter((name) => card.headline.includes(name));
    assert.equal(hits.length, 1, card.headline);
    assert.doesNotMatch(card.headline, /ABC Plumbing, 123 Catering/);
    assert.match(card.headline, /Monday Motivation|Tip Tuesday|Wisdom Wednesday|Throwback Thursday|Feature Friday|Community Saturday|Sunday Rest/);
    assert.match(card.imageSvg, /<tspan/);
    assert.match(card.imageSvg, /overflow="hidden"/);
    assert.match(card.caption, /Sample draft for /);
    assert.doesNotMatch(card.caption, /auto-post|Blotato|schedule this post/i);
  }
  assert.equal(cards.some((card) => card.headline.includes("ABC Plumbing")), true);
  assert.equal(cards.some((card) => card.headline.includes("123 Catering")), true);
  assert.equal(cards.some((card) => card.headline.includes("XYZ Electric")), true);
  assert.equal(
    hireableMicahCardHeadline({
      headline: "ABC Plumbing, 123 Catering, and XYZ Electric · ABC Plumbing",
      demoDesk: true,
      companyName: "ABC Plumbing",
      theme: "Monday Motivation",
    }),
    "Monday Motivation · ABC Plumbing",
  );
  assert.equal(isConcatenatedDemoCompanyCopy("Labor Day · ABC Plumbing"), false);
});

test("live desk week pack still uses the prompt theme and does not rewrite stored SVGs", () => {
  const cards = buildMicahWeekPack({
    prompt: "Make a week of posts for Labor Day",
    demeanor: "straight",
  });
  assert.match(cards[0]?.headline ?? "", /Monday Motivation · Labor Day/);
  assert.doesNotMatch(cards[0]?.headline ?? "", /ABC Plumbing/);
  assert.match(cards[0]?.imageSvg ?? "", /<tspan/);

  const stored = '<svg xmlns="http://www.w3.org/2000/svg"><text>Monday Motivation</text></svg>';
  const gallery = selectMicahWeekGallery(
    [
      {
        id: "live-1",
        title: "Day 1 · Monday · pest check",
        headline: "Monday Motivation",
        caption: "Monday in Cypress is won before 9am.",
        supportingText: "One tip.",
        imageSvg: stored,
        imageUrl: null,
        metadata: { week_pack: true, week_day: 1, week_theme: "Monday Motivation" },
      },
    ],
    { demoDesk: false, logoDataUri: null },
  );
  assert.equal(gallery[0]?.headline, "Monday Motivation");
  assert.equal(gallery[0]?.imageSvg, stored);
});

test("sample gallery refits overflowing concatenated day-card graphics", () => {
  const storedHeadline = "ABC Plumbing, 123 Catering, and XYZ Electric · ABC Plumbing";
  const gallery = selectMicahWeekGallery(
    [
      {
        id: "demo-1",
        title: "Day 1 · Monday · ABC Plumbing",
        headline: storedHeadline,
        caption:
          "Sample draft for ABC Plumbing. Download and post it yourself.\n\nMonday is here.\n\nCall or stop in to book it.\n\n#CrewHats #ABCPlumbing",
        supportingText: "crew hats and shop pride. Download and post it yourself.",
        imageSvg: `<svg xmlns="http://www.w3.org/2000/svg"><text fill="#ffffff" font-size="54">${storedHeadline}</text></svg>`,
        imageUrl: null,
        metadata: {
          week_pack: true,
          week_day: 1,
          week_theme: "Monday Motivation",
          company_name: "ABC Plumbing",
          demo_labeled: true,
        },
      },
    ],
    { demoDesk: true, logoDataUri: "data:image/png;base64,ZmFrZQ==" },
  );
  assert.equal(gallery[0]?.headline, "Monday Motivation · ABC Plumbing");
  assert.doesNotMatch(gallery[0]?.headline ?? "", /ABC Plumbing, 123 Catering/);
  assert.match(gallery[0]?.imageSvg ?? "", /<tspan/);
  assert.match(gallery[0]?.imageSvg ?? "", /overflow="hidden"/);
  assert.match(gallery[0]?.imageSvg ?? "", /Monday Motivation/);
  assert.doesNotMatch(
    gallery[0]?.imageSvg ?? "",
    /ABC Plumbing, 123 Catering, and XYZ Electric/,
  );
});

test("gallery card image clips to the navy square on mobile", () => {
  const gallery = readFileSync(join(process.cwd(), "src/components/micah-week-gallery.tsx"), "utf8");
  assert.match(gallery, /overflow-hidden bg-\[#071b42\]/);
  assert.match(gallery, /object-contain/);
  assert.doesNotMatch(gallery, /object-cover/);
});

test("AFE DEMO gallery shows 7 day-cards instead of the old blue placeholder boxes", () => {
  const gallery = selectMicahWeekGallery(
    [
      {
        id: "old-1",
        title: "DEMO DESK SAMPLE",
        headline: "DEMO hats for the crew",
        caption: "DEMO draft for ABC Plumbing. Do not publish.",
        supportingText: null,
        imageSvg: null,
        imageUrl: null,
        metadata: {},
      },
      {
        id: "old-2",
        title: "DEMO DESK SAMPLE",
        headline: "DEMO tasting night shirts",
        caption: "DEMO draft for 123 Catering. Do not publish.",
        supportingText: null,
        imageSvg: null,
        imageUrl: null,
        metadata: {},
      },
    ],
    { demoDesk: true, logoDataUri: "data:image/png;base64,ZmFrZQ==" },
  );
  assert.equal(gallery.length, 7);
  assert.equal(gallery.every((card) => Boolean(card.imageSvg)), true);
  assert.equal(gallery.every((card) => card.imageSvg.includes("#071b42")), true);
  assert.equal(gallery.every((card) => card.imageUrl === null), true);
  assert.equal(gallery.some((card) => card.headline === "DEMO hats for the crew"), false);
});

test("a gallery card keeps an uploaded image and a card without one stays on the SVG", () => {
  const storedSvg = '<svg xmlns="http://www.w3.org/2000/svg"><text>Thursday card</text></svg>';
  const storedPath = `crm-files/${IMAGE_ORG_ID}/micah/${IMAGE_DRAFT_ID}.png`;
  const withImage = selectMicahWeekGallery(
    [
      {
        id: IMAGE_DRAFT_ID,
        title: "Day 4 · Thursday · shop photo",
        headline: "Throwback Thursday",
        caption: "Thursday in the shop is the photo clients save.",
        supportingText: "Download this draft and post it yourself.",
        imageSvg: storedSvg,
        imageUrl: storedPath,
        metadata: { week_pack: true, week_day: 4, week_theme: "Throwback Thursday" },
      },
    ],
    { demoDesk: false, logoDataUri: null },
  );
  assert.equal(withImage.length, 1);
  assert.equal(withImage[0]?.imageUrl, storedPath);
  assert.equal(withImage[0]?.imageSvg, storedSvg);
  assert.equal(withImage[0]?.day, 4);
  assert.equal(withImage[0]?.weekday, "Thursday");

  const withoutImage = selectMicahWeekGallery(
    [
      {
        id: IMAGE_DRAFT_ID,
        title: "Day 4 · Thursday · shop photo",
        headline: "Throwback Thursday",
        caption: "Thursday in the shop is the photo clients save.",
        supportingText: "Download this draft and post it yourself.",
        imageSvg: storedSvg,
        imageUrl: null,
        metadata: { week_pack: true, week_day: 4, week_theme: "Throwback Thursday" },
      },
    ],
    { demoDesk: false, logoDataUri: null },
  );
  assert.equal(withoutImage[0]?.imageUrl, null);
  assert.equal(withoutImage[0]?.imageSvg, storedSvg);

  const generated = buildMicahWeekPack({
    prompt: "Week of posts for the shop",
    demeanor: "straight",
  });
  assert.equal(generated.every((card) => card.imageUrl === null), true);
});

test("gallery image storage paths resolve to a one-hour signed URL download name", () => {
  const storedPath = `crm-files/${IMAGE_ORG_ID}/micah/${IMAGE_DRAFT_ID}.png`;
  const storage = resolveMicahGalleryImageSource({
    imageUrl: storedPath,
    organizationId: IMAGE_ORG_ID,
    draftId: IMAGE_DRAFT_ID,
    day: 4,
    weekday: "Thursday",
  });
  assert.equal(storage.kind, "storage");
  if (storage.kind !== "storage") return;
  assert.equal(storage.bucket, "crm-files");
  assert.equal(storage.objectPath, `${IMAGE_ORG_ID}/micah/${IMAGE_DRAFT_ID}.png`);
  assert.equal(storage.downloadName, "micah-day-4-thursday.png");
  assert.equal(storage.expiresIn, MICAH_GALLERY_IMAGE_URL_TTL_SECONDS);
  assert.equal(storage.expiresIn, 3600);
  assert.doesNotMatch(storage.objectPath, /^crm-files\//);

  const jpeg = resolveMicahGalleryImageSource({
    imageUrl: `crm-files/${IMAGE_ORG_ID}/micah/${IMAGE_DRAFT_ID}.jpeg`,
    organizationId: IMAGE_ORG_ID,
    draftId: IMAGE_DRAFT_ID,
    day: 4,
    weekday: "Thursday",
  });
  assert.equal(jpeg.kind, "storage");
  if (jpeg.kind === "storage") {
    assert.equal(jpeg.downloadName, "micah-day-4-thursday.jpeg");
    assert.equal(jpeg.objectPath, `${IMAGE_ORG_ID}/micah/${IMAGE_DRAFT_ID}.jpeg`);
  }

  const https = resolveMicahGalleryImageSource({
    imageUrl: "https://cdn.example.com/cards/thursday.jpg?token=1",
    organizationId: IMAGE_ORG_ID,
    draftId: IMAGE_DRAFT_ID,
    day: 4,
    weekday: "Thursday",
  });
  assert.deepEqual(https, {
    kind: "https",
    href: "https://cdn.example.com/cards/thursday.jpg?token=1",
    downloadName: "micah-day-4-thursday.jpg",
  });

  assert.equal(
    resolveMicahGalleryImageSource({
      imageUrl: `crm-files/${IMAGE_DRAFT_ID}/micah/${IMAGE_ORG_ID}.png`,
      organizationId: IMAGE_ORG_ID,
      draftId: IMAGE_DRAFT_ID,
      day: 4,
      weekday: "Thursday",
    }).kind,
    "none",
  );
  assert.equal(
    resolveMicahGalleryImageSource({
      imageUrl: `crm-files/${IMAGE_ORG_ID}/micah/../${IMAGE_DRAFT_ID}.png`,
      organizationId: IMAGE_ORG_ID,
      draftId: IMAGE_DRAFT_ID,
      day: 4,
      weekday: "Thursday",
    }).kind,
    "none",
  );
  assert.equal(
    resolveMicahGalleryImageSource({
      imageUrl: `crm-files/${IMAGE_ORG_ID}/micah/${IMAGE_DRAFT_ID}.svg`,
      organizationId: IMAGE_ORG_ID,
      draftId: IMAGE_DRAFT_ID,
      day: 4,
      weekday: "Thursday",
    }).kind,
    "none",
  );
  assert.equal(
    resolveMicahGalleryImageSource({
      imageUrl: "http://cdn.example.com/card.png",
      organizationId: IMAGE_ORG_ID,
      draftId: IMAGE_DRAFT_ID,
      day: 4,
      weekday: "Thursday",
    }).kind,
    "none",
  );
});

test("daily MICAH job and caption save do not write image_url", () => {
  const daily = readFileSync(join(process.cwd(), "netlify/functions/daily-content-studio.mjs"), "utf8");
  const insertAt = daily.indexOf('supabaseRequest("organization_content_drafts"');
  assert.ok(insertAt > 0);
  const insert = daily.slice(insertAt, daily.indexOf("const draftId", insertAt));
  assert.match(insert, /method: "POST"/);
  assert.match(insert, /image_svg: svg/);
  assert.doesNotMatch(insert, /image_url/);
  assert.doesNotMatch(insert, /resolution=merge|on_conflict|method: "PATCH"/);

  const captionPersist = readFileSync(
    join(process.cwd(), "src/server/content-studio/gallery-caption-persist.ts"),
    "utf8",
  );
  const updateAt = captionPersist.indexOf(".update({");
  assert.ok(updateAt > 0);
  const update = captionPersist.slice(updateAt, updateAt + 280);
  assert.match(update, /caption: input\.caption/);
  assert.match(update, /status: input\.status/);
  assert.match(update, /metadata: input\.metadata/);
  assert.doesNotMatch(update, /image_url/);

  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260907161500_update_micah_gallery_caption.sql"),
    "utf8",
  );
  assert.doesNotMatch(sql, /image_url/);
  assert.match(sql, /set\s+caption = v_caption/i);

  const patch = buildMicahGalleryCaptionUpdate({
    metadata: { week_pack: true, week_day: 4 },
    caption: "Thursday in the shop is the photo clients save.\n\nBook this week's visit.",
    status: "approved",
    editedAt: "2026-10-08T15:00:00.000Z",
  });
  assert.ok(patch);
  assert.deepEqual(Object.keys(patch).sort(), ["caption", "metadata", "status"]);
  assert.equal(patch?.status, "approved");
  assert.equal("image_url" in (patch ?? {}), false);
});

test("a non-admin gallery image upload is refused before storage or a status change", async () => {
  const calls: string[] = [];
  const refused = await applyMicahGalleryImageChange({
    signedIn: true,
    isSuperAdmin: false,
    intent: "upload",
    organizationId: IMAGE_ORG_ID,
    draftId: IMAGE_DRAFT_ID,
    file: { name: "thursday.png", type: "image/png", size: PNG_BYTES.length, bytes: PNG_BYTES },
    loadDraft: async () => {
      calls.push("load");
      return { imageUrl: null };
    },
    upload: async () => {
      calls.push("upload");
      return { error: null };
    },
    remove: async () => {
      calls.push("remove");
      return { error: null };
    },
    saveImageUrl: async () => {
      calls.push("save");
      return { error: null };
    },
  });
  assert.equal(refused.status, "error");
  assert.match(refused.error ?? "", /Only an Atlas admin/);
  assert.deepEqual(calls, []);

  const signedOut = planMicahGalleryImageChange({
    signedIn: false,
    isSuperAdmin: false,
    intent: "upload",
    organizationId: IMAGE_ORG_ID,
    draftId: IMAGE_DRAFT_ID,
    draftFound: true,
    currentImageUrl: null,
    file: { name: "thursday.png", type: "image/png", size: PNG_BYTES.length },
  });
  assert.deepEqual(signedOut, { ok: false, reason: "signed_out" });

  const tooBig = planMicahGalleryImageChange({
    signedIn: true,
    isSuperAdmin: true,
    intent: "upload",
    organizationId: IMAGE_ORG_ID,
    draftId: IMAGE_DRAFT_ID,
    draftFound: true,
    currentImageUrl: null,
    file: { name: "thursday.png", type: "image/png", size: MICAH_GALLERY_IMAGE_MAX_BYTES + 1 },
  });
  assert.deepEqual(tooBig, { ok: false, reason: "invalid_file" });

  const webp = planMicahGalleryImageChange({
    signedIn: true,
    isSuperAdmin: true,
    intent: "upload",
    organizationId: IMAGE_ORG_ID,
    draftId: IMAGE_DRAFT_ID,
    draftFound: true,
    currentImageUrl: null,
    file: { name: "thursday.webp", type: "image/webp", size: 1200 },
  });
  assert.deepEqual(webp, { ok: false, reason: "invalid_file" });
  assert.equal(micahGalleryImageBytesMatch(PNG_BYTES, "png"), true);
  assert.equal(micahGalleryImageBytesMatch(JPEG_BYTES, "jpg"), true);
  assert.equal(micahGalleryImageBytesMatch(new Uint8Array([1, 2, 3, 4]), "png"), false);

  let savedUrl: string | null = "unset";
  const removed: string[] = [];
  const saved = await applyMicahGalleryImageChange({
    signedIn: true,
    isSuperAdmin: true,
    intent: "upload",
    organizationId: IMAGE_ORG_ID,
    draftId: IMAGE_DRAFT_ID,
    file: { name: "Thursday.PNG", type: "image/png", size: PNG_BYTES.length, bytes: PNG_BYTES },
    loadDraft: async () => ({
      imageUrl: `crm-files/${IMAGE_ORG_ID}/micah/${IMAGE_DRAFT_ID}.jpg`,
    }),
    upload: async (objectPath, _bytes, contentType) => {
      assert.equal(objectPath, `${IMAGE_ORG_ID}/micah/${IMAGE_DRAFT_ID}.png`);
      assert.equal(contentType, "image/png");
      return { error: null };
    },
    remove: async (objectPath) => {
      removed.push(objectPath);
      return { error: null };
    },
    saveImageUrl: async (imageUrl) => {
      savedUrl = imageUrl;
      return { error: null };
    },
  });
  assert.equal(saved.status, "success");
  assert.equal(savedUrl, `crm-files/${IMAGE_ORG_ID}/micah/${IMAGE_DRAFT_ID}.png`);
  assert.deepEqual(removed, [`${IMAGE_ORG_ID}/micah/${IMAGE_DRAFT_ID}.jpg`]);

  let cleared: string | null = "unset";
  const removedImage = await applyMicahGalleryImageChange({
    signedIn: true,
    isSuperAdmin: true,
    intent: "remove",
    organizationId: IMAGE_ORG_ID,
    draftId: IMAGE_DRAFT_ID,
    file: null,
    loadDraft: async () => ({
      imageUrl: `crm-files/${IMAGE_ORG_ID}/micah/${IMAGE_DRAFT_ID}.png`,
    }),
    upload: async () => {
      throw new Error("remove must not upload");
    },
    remove: async () => ({ error: null }),
    saveImageUrl: async (imageUrl) => {
      cleared = imageUrl;
      return { error: null };
    },
  });
  assert.equal(removedImage.status, "success");
  assert.equal(cleared, null);

  const approved = planMicahGalleryImageChange({
    signedIn: true,
    isSuperAdmin: true,
    intent: "upload",
    organizationId: IMAGE_ORG_ID,
    draftId: IMAGE_DRAFT_ID,
    draftFound: true,
    currentImageUrl: null,
    file: { name: "thursday.jpg", type: "image/jpeg", size: JPEG_BYTES.length },
  });
  assert.equal(approved.ok, true);
  if (approved.ok && approved.intent === "upload") {
    assert.equal(approved.storedPath, `crm-files/${IMAGE_ORG_ID}/micah/${IMAGE_DRAFT_ID}.jpg`);
    assert.equal("status" in approved, false);
    assert.notEqual(approved.storedPath.startsWith("https://"), true);
  }
});

test("uploaded card images stay outside the live-desk text sanitizer", () => {
  const imageUrl = `crm-files/${IMAGE_ORG_ID}/micah/${IMAGE_DRAFT_ID}.png`;
  const tricky = `${imageUrl}?note=sample-fake`;
  const storedDraft = {
    campaign: "SAMPLE week",
    title: "SAMPLE title",
    headline: "fake sample headline",
    caption: "This sample caption is fake and should be cleaned for the live desk view.",
    imageSvg: "<svg>sample fake card</svg>",
    imageUrl: tricky,
  };
  const draft = presentLiveDeskDraft(
    { name: "Harbor HVAC", slug: "harbor-hvac-trial" },
    storedDraft,
  );
  assert.equal(draft.imageUrl, tricky);
  assert.doesNotMatch(String(draft.imageSvg), /\bsample\b|\bfake\b/i);

  const liveDesk = readFileSync(join(process.cwd(), "src/lib/lions-den/live-desk.ts"), "utf8");
  const presenter = liveDesk.slice(
    liveDesk.indexOf("export function presentLiveDeskDraft"),
    liveDesk.indexOf("export function presentLiveDeskReviewItem"),
  );
  assert.match(presenter, /imageSvg/);
  assert.doesNotMatch(presenter, /imageUrl/);
});

test("gallery renders an uploaded image download and keeps image changes admin-only", () => {
  const gallery = readFileSync(join(process.cwd(), "src/components/micah-week-gallery.tsx"), "utf8");
  assert.match(gallery, /data-micah-card-image=\{uploadedImage \? "file" : "svg"\}/);
  assert.match(gallery, /aspect-square w-full object-contain/);
  assert.match(gallery, /imageDownloadUrl/);
  assert.match(gallery, /imageFileName/);
  assert.match(gallery, /Upload image/);
  assert.match(gallery, /Replace image/);
  assert.match(gallery, /Remove image/);
  assert.match(gallery, /\/api\/client\/micah\/image/);
  assert.match(gallery, /canUploadImage && card\.id/);
  assert.match(gallery, /download=\{fileName\}/);
  const controls = gallery.slice(
    gallery.indexOf('data-micah-image="controls"'),
    gallery.indexOf("canReview && card.id"),
  );
  assert.match(controls, /type="button"/);
  assert.doesNotMatch(controls, /<form|type="submit"/);

  const page = readFileSync(join(process.cwd(), "src/app/client/micah/page.tsx"), "utf8");
  assert.match(page, /canUploadImage=\{workspace\.isSuperAdmin\}/);

  const persist = readFileSync(
    join(process.cwd(), "src/server/content-studio/gallery-image-persist.ts"),
    "utf8",
  );
  const actorAt = persist.indexOf("micahGalleryImageActorDecision");
  const uploadAt = persist.indexOf(".upload(");
  const updateAt = persist.indexOf(".update({ image_url: imageUrl })");
  assert.ok(actorAt > 0 && uploadAt > actorAt && updateAt > actorAt);
  assert.match(persist, /if \(actor !== "allow"\) return micahGalleryImageActionResult\(actor\)/);
  assert.match(persist, /createSignedUrl\(\s*source\.objectPath,\s*source\.expiresIn,\s*\{\s*download: source\.downloadName/);
  assert.match(persist, /createClient\(/);
  assert.doesNotMatch(persist, /createAdminClient|getPublicUrl/);
  const imageUpdate = persist.slice(updateAt, updateAt + 80);
  assert.match(imageUpdate, /image_url: imageUrl/);
  assert.doesNotMatch(imageUpdate, /status/);
});
