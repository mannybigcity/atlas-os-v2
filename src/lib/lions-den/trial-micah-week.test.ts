import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { inferTrialDeskMarket } from "./trial-desk-market.ts";
import {
  getTrialMicahSeedSlots,
  trialMicahBrandPrefill,
  trialMicahSeedSlots,
} from "./trial-micah-week.ts";
import { defaultMicahBrandKit, firstIncompleteMicahOnboardingIndex, prefillMicahBrandKit } from "./micah-starter-week.ts";
import { gradeKingdomCaption } from "../../server/content-studio/kingdom-social.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("SAMPLE MICAH week is seven paste-ready cards matched to pest work in Cypress", () => {
  const slots = getTrialMicahSeedSlots({
    businessName: "Cypress Pest Pros",
    businessType: "Contractor or home service",
  });
  assert.equal(slots.length, 7);
  assert.deepEqual(
    trialMicahSeedSlots(),
    [
      "trial-seed-week-d1",
      "trial-seed-week-d2",
      "trial-seed-week-d3",
      "trial-seed-week-d4",
      "trial-seed-week-d5",
      "trial-seed-week-d6",
      "trial-seed-week-d7",
    ],
  );
  assert.deepEqual(
    slots.map((item) => `${item.day}:${item.weekday}`),
    ["1:Monday", "2:Tuesday", "3:Wednesday", "4:Thursday", "5:Friday", "6:Saturday", "7:Sunday"],
  );
  for (const slot of slots) {
    assert.match(slot.dayLabel, /DAY \d · /);
    assert.match(slot.headline, /\S/);
    assert.doesNotMatch(slot.headline, /placeholder/i);
    assert.match(slot.caption, /SAMPLE draft for Cypress Pest Pros/);
    assert.match(slot.caption, /did not post/);
    assert.match(slot.callToAction, /book|call|save this/i);
    assert.match(slot.instagramCaption, /#/);
    assert.match(slot.linkedinCaption, /#/);
    assert.notEqual(slot.instagramCaption, slot.caption);
    assert.match(slot.imageSvg, /SAMPLE DRAFT/);
    assert.equal(slot.imageSvg.includes(slot.dayLabel), true);
    assert.doesNotMatch(slot.imageSvg, /atlas-logo|atlas-lion|<image href=/i);
    assert.doesNotMatch(`${slot.caption} ${slot.headline}`, /SIS|Phone AI is live|auto-post|blotato/i);
    const grade = gradeKingdomCaption({
      caption: slot.caption,
      instagramCaption: slot.instagramCaption,
      linkedinCaption: slot.linkedinCaption,
      demoLabeled: true,
    });
    assert.equal(grade.pass, true, `${slot.weekday}: ${grade.reasons.join(" ")}`);
  }
  assert.match(slots[0]?.headline ?? "", /pest check/i);
  assert.match(slots[4]?.headline ?? "", /pest check/i);
});

test("SAMPLE week copy follows HVAC vs retail instead of a generic placeholder", () => {
  const hvac = getTrialMicahSeedSlots({
    businessName: "Harbor HVAC",
    city: "Spring",
    businessType: "Contractor or home service",
  });
  const retail = getTrialMicahSeedSlots({
    businessName: "Midtown Print Shop",
    city: "Houston",
    businessType: "Retail or ecommerce",
  });
  assert.match(hvac[0]?.headline ?? "", /cooling check|HVAC/i);
  assert.match(hvac[0]?.caption ?? "", /Spring/);
  assert.match(retail[4]?.headline ?? "", /in-store pickup|featured/i);
  assert.notEqual(hvac[0]?.headline, retail[0]?.headline);
});

test("Brand Setup prefills audience and offer only when city exists", () => {
  const withCity = inferTrialDeskMarket({
    businessName: "Cypress Pest Pros",
    businessType: "Contractor or home service",
  });
  const filled = trialMicahBrandPrefill(withCity);
  assert.equal(filled.city, "Cypress");
  assert.match(String(filled.audience), /pest control/);
  assert.match(String(filled.weeklyOffer), /pest check/);
  const kit = prefillMicahBrandKit(defaultMicahBrandKit(), filled);
  assert.equal(kit.businessName, "Cypress Pest Pros");
  assert.equal(kit.city, "Cypress");
  assert.equal(firstIncompleteMicahOnboardingIndex(kit, false), 2);

  const noCity = trialMicahBrandPrefill(
    inferTrialDeskMarket({
      businessName: "Massive Action Maintenance",
      businessType: "Contractor or home service",
    }),
  );
  assert.equal(noCity.city, "");
  assert.equal(noCity.audience, "");
  assert.equal(noCity.weeklyOffer, "");
  const stuck = prefillMicahBrandKit(defaultMicahBrandKit(), noCity);
  assert.equal(firstIncompleteMicahOnboardingIndex(stuck, false), 0);
});

test("MICAH gallery Edit saves captions and never live-posts", () => {
  const gallery = readFileSync(join(root, "components/micah-week-gallery.tsx"), "utf8");
  const actions = readFileSync(join(root, "server/content-studio/actions.ts"), "utf8");
  const art = readFileSync(join(root, "server/content-studio/gallery-art.ts"), "utf8");
  const page = readFileSync(join(root, "app/client/micah/page.tsx"), "utf8");
  const studio = readFileSync(join(root, "components/client-content-studio.tsx"), "utf8");
  assert.match(gallery, /data-micah-control="edit"/);
  assert.match(gallery, /data-micah-control="save"/);
  assert.match(gallery, /data-micah-control="cancel"/);
  assert.match(gallery, /data-micah-caption="preview"/);
  assert.match(gallery, /\/api\/client\/micah\/caption/);
  assert.match(gallery, /data-micah-save-path="json-button"/);
  assert.doesNotMatch(gallery, /useActionState/);
  assert.doesNotMatch(gallery, /updateMicahGalleryCaption/);
  assert.doesNotMatch(
    gallery.slice(gallery.indexOf("data-micah-save-path"), gallery.indexOf("data-micah-save=\"success\"")),
    /<form|type="submit"/,
  );
  assert.match(gallery, /Copy caption/);
  assert.match(gallery, /Download file/);
  assert.doesNotMatch(gallery, /schedule this post|blotato|Phone AI is live/i);
  assert.match(page, /allowCaptionEdit=\{canShowMicahGalleryEdit\(primaryOrganization\)\}/);
  assert.doesNotMatch(page, /allowCaptionEdit=\{canEditBusinessProfile/);
  assert.match(actions, /export async function updateMicahGalleryCaption/);
  assert.match(actions, /persistMicahGalleryCaption/);
  const persist = readFileSync(join(root, "server/content-studio/gallery-caption-persist.ts"), "utf8");
  assert.match(persist, /update_micah_gallery_caption/);
  assert.match(persist, /writeMicahGalleryCaptionRow/);
  assert.match(persist, /isSisOrganization/);
  assert.match(persist, /sis_blocked/);
  assert.doesNotMatch(persist, /unstable_rethrow/);
  assert.doesNotMatch(persist, /revalidatePath/);
  assert.doesNotMatch(persist, /#draft-/);
  assert.doesNotMatch(persist, /redirect\(/);
  assert.doesNotMatch(actions, /status: "published"/);
  assert.doesNotMatch(actions, /blotato|schedule this post|Phone AI is live/i);
  assert.match(art, /galleryLogoForMicahDesk/);
  assert.match(art, /canShowMicahGalleryEdit/);
  assert.match(art, /if \(input.demoDesk\) return readOfficialAtlasLogoDataUri/);
  assert.match(studio, /galleryLogoForMicahDesk/);
  assert.doesNotMatch(studio, /brand.logoDataUri \|\| readOfficialAtlasLogoDataUri/);
});
