import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  AFE_OPERATOR_DESK_NAME,
  AFE_OPERATOR_DESK_SLUG,
  isGuestClientPreview,
  SAMPLE_DESK_DISPLAY_NAME,
} from "../../lib/client-portal/identity.ts";
import { bookkeepingRequestedPreviewSlug, bookkeepingStripeAccess } from "./access.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const trial = {
  id: "org-trial",
  name: "Atlas Bookkeeping Webhook Test",
  slug: "atlas-bookkeeping-webhook-test-ffb88c",
};
const operator = {
  id: "org-afe",
  name: AFE_OPERATOR_DESK_NAME,
  slug: AFE_OPERATOR_DESK_SLUG,
};
const sis = {
  id: "org-sis",
  name: "SIS Custom Creations",
  slug: "sis-diy-big-complete-showcase",
};
const sample = {
  id: "org-sample",
  name: SAMPLE_DESK_DISPLAY_NAME,
  slug: "afe-crm-demo",
};
const qtime = {
  id: "org-qtime",
  name: "QTime Productions",
  slug: "qtime-productions",
};

function manager(organization: { id: string }, role: "owner" | "admin" | "member", id = `member-${organization.id}`) {
  return { id, role, organization: { id: organization.id } };
}

test("a guest-client desk is still classified as one, which used to force bookkeeping viewer mode", () => {
  assert.equal(isGuestClientPreview(trial), true);
  assert.equal(isGuestClientPreview(qtime), true);
  assert.equal(isGuestClientPreview(operator), false);
  assert.equal(isGuestClientPreview(sis), false);
  assert.equal(isGuestClientPreview(sample), false);
});

test("owner and admin of a customer or trial desk can connect Stripe on that desk", () => {
  for (const organization of [trial, qtime]) {
    for (const role of ["owner", "admin"] as const) {
      const access = bookkeepingStripeAccess({
        enabled: true,
        organization,
        memberships: [manager(organization, role)],
      });

      assert.equal(access.viewerMode, false, `${organization.slug} ${role} viewer`);
      assert.equal(access.canManage, true, `${organization.slug} ${role} manage`);
      assert.equal(access.organizationId, organization.id);
    }
  }
});

test("a trial owner with no previewOrg connects their own organization, not Lion's Den", () => {
  const access = bookkeepingStripeAccess({
    enabled: true,
    organization: trial,
    memberships: [manager(operator, "owner"), manager(trial, "owner")],
    requestedPreviewOrgSlug: bookkeepingRequestedPreviewSlug({
      isSuperAdmin: false,
      previewOrg: trial.slug,
    }),
  });

  assert.equal(bookkeepingRequestedPreviewSlug({ isSuperAdmin: false, previewOrg: trial.slug }), "");
  assert.equal(access.viewerMode, false);
  assert.equal(access.canManage, true);
  assert.equal(access.organizationId, trial.id);
  assert.notEqual(access.organizationId, operator.id);
});

test("previewing someone else's customer desk stays viewer-only and cannot connect", () => {
  const pinned = bookkeepingStripeAccess({
    enabled: true,
    organization: trial,
    memberships: [manager(trial, "owner", `operator-${trial.id}`)],
    requestedPreviewOrgSlug: trial.slug,
  });
  assert.equal(pinned.viewerMode, true);
  assert.equal(pinned.canManage, false);
  assert.equal(pinned.organizationId, null);

  const realOwnerInPreview = bookkeepingStripeAccess({
    enabled: true,
    organization: trial,
    memberships: [manager(trial, "owner"), manager(operator, "owner")],
    requestedPreviewOrgSlug: trial.slug,
    clientView: false,
  });
  assert.equal(realOwnerInPreview.viewerMode, true);
  assert.equal(realOwnerInPreview.canManage, false);
  assert.equal(realOwnerInPreview.organizationId, null);

  const clientView = bookkeepingStripeAccess({
    enabled: true,
    organization: trial,
    memberships: [manager(trial, "owner")],
    clientView: true,
  });
  assert.equal(clientView.viewerMode, true);
  assert.equal(clientView.canManage, false);
  assert.equal(clientView.organizationId, null);
});

test("a preview request must not attach Stripe to Lion's Den when the desks differ", () => {
  const access = bookkeepingStripeAccess({
    enabled: true,
    organization: operator,
    memberships: [manager(operator, "owner")],
    requestedPreviewOrgSlug: trial.slug,
    postedOrganizationId: trial.id,
  });

  assert.equal(access.viewerMode, true);
  assert.equal(access.canManage, false);
  assert.equal(access.organizationId, null);
});

test("a posted organization id that is not the resolved desk is refused", () => {
  const access = bookkeepingStripeAccess({
    enabled: true,
    organization: trial,
    memberships: [manager(trial, "owner")],
    postedOrganizationId: operator.id,
  });

  assert.equal(access.canManage, false);
  assert.equal(access.organizationId, null);
});

test("operator, SIS, and sample owners keep manage access and are not guest viewers", () => {
  for (const organization of [operator, sis, sample]) {
    const access = bookkeepingStripeAccess({
      enabled: true,
      organization,
      memberships: [manager(organization, "owner", `operator-${organization.id}`)],
      readOnly: true,
    });

    assert.equal(access.viewerMode, false, organization.slug);
    assert.equal(access.canManage, true, organization.slug);
    assert.equal(access.organizationId, organization.id);
  }
});

test("SIS and the operator desk are not mixed when a preview names the other one", () => {
  const sisScreen = bookkeepingStripeAccess({
    enabled: true,
    organization: sis,
    memberships: [manager(sis, "owner")],
    requestedPreviewOrgSlug: operator.slug,
  });
  const operatorScreen = bookkeepingStripeAccess({
    enabled: true,
    organization: operator,
    memberships: [manager(operator, "owner")],
    requestedPreviewOrgSlug: sis.slug,
  });

  assert.equal(sisScreen.organizationId, null);
  assert.equal(operatorScreen.organizationId, null);
});

test("opening the operator or SIS desk by its own slug still allows that owner to connect", () => {
  const operatorOwnSlug = bookkeepingStripeAccess({
    enabled: true,
    organization: operator,
    memberships: [manager(operator, "admin")],
    requestedPreviewOrgSlug: operator.slug,
  });
  const sisOwnSlug = bookkeepingStripeAccess({
    enabled: true,
    organization: sis,
    memberships: [manager(sis, "owner")],
    requestedPreviewOrgSlug: sis.slug,
  });

  assert.equal(operatorOwnSlug.canManage, true);
  assert.equal(operatorOwnSlug.organizationId, operator.id);
  assert.equal(sisOwnSlug.canManage, true);
  assert.equal(sisOwnSlug.organizationId, sis.id);
});

test("sample desk owner still connects, and a sample member does not become a viewer", () => {
  const owner = bookkeepingStripeAccess({
    enabled: true,
    organization: sample,
    memberships: [manager(sample, "owner")],
  });
  const member = bookkeepingStripeAccess({
    enabled: true,
    organization: sample,
    memberships: [manager(sample, "member")],
  });

  assert.equal(owner.viewerMode, false);
  assert.equal(owner.canManage, true);
  assert.equal(owner.organizationId, sample.id);
  assert.equal(member.viewerMode, false);
  assert.equal(member.canManage, false);
  assert.equal(member.organizationId, null);
});

test("a trial member and an expired trial owner still cannot connect", () => {
  const member = bookkeepingStripeAccess({
    enabled: true,
    organization: trial,
    memberships: [manager(trial, "member")],
  });
  const expiredOwner = bookkeepingStripeAccess({
    enabled: true,
    organization: trial,
    memberships: [manager(trial, "owner")],
    readOnly: true,
  });

  assert.equal(member.viewerMode, true);
  assert.equal(member.canManage, false);
  assert.equal(expiredOwner.viewerMode, true);
  assert.equal(expiredOwner.canManage, false);
  assert.equal(expiredOwner.organizationId, null);
});

test("bookkeeping turned off does not mark a trial owner as a viewer", () => {
  const access = bookkeepingStripeAccess({
    enabled: false,
    organization: trial,
    memberships: [manager(trial, "owner")],
  });

  assert.equal(access.viewerMode, false);
  assert.equal(access.canManage, false);
  assert.equal(access.organizationId, null);
});

test("the bookkeeping screen and connect action use desk access instead of guest-client preview", () => {
  const page = readFileSync(join(root, "src/app/client/bookkeeping/page.tsx"), "utf8");
  const actions = readFileSync(join(root, "src/server/stripe-bookkeeping/actions.ts"), "utf8");
  const desk = readFileSync(join(root, "src/components/bookkeeping-desk.tsx"), "utf8");

  assert.match(page, /bookkeepingStripeAccess/);
  assert.match(page, /bookkeepingRequestedPreviewSlug/);
  assert.doesNotMatch(page, /!workspace\.isClientPreview/);
  assert.match(actions, /getClientWorkspaceContext\("\/client\/bookkeeping"\)/);
  assert.doesNotMatch(actions, /getClientWorkspaceContext\(\s*"\/client\/bookkeeping"\s*,/);
  assert.doesNotMatch(actions, /!workspace\.isClientPreview/);
  assert.match(actions, /organizationId: organization\.id/);
  assert.match(desk, /name="organizationId"/);
  assert.match(desk, /Connect Stripe/);
  assert.match(desk, /Viewer mode cannot connect a Stripe account/);
});
