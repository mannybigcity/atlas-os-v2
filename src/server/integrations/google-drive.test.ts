import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

import { driveNameInFolderQuery, readGoogleDriveCredentials, signGoogleServiceAccountJwt } from "./google-drive.ts";

test("Drive credentials stay empty unless server env is set", () => {
  assert.equal(readGoogleDriveCredentials(() => ""), null);
  const refresh = readGoogleDriveCredentials((name) => {
    if (name === "GOOGLE_DRIVE_CLIENT_ID") return "client";
    if (name === "GOOGLE_DRIVE_CLIENT_SECRET") return "secret";
    if (name === "GOOGLE_DRIVE_REFRESH_TOKEN") return "refresh";
    if (name === "GOOGLE_DRIVE_CLIENT_EMAIL") return "bot@example.com";
    if (name === "GOOGLE_DRIVE_PRIVATE_KEY") return "not-used";
    return "";
  });
  assert.equal(refresh?.kind, "refresh_token");

  const account = readGoogleDriveCredentials((name) => {
    if (name === "GOOGLE_DRIVE_CLIENT_EMAIL") return "bot@example.com";
    if (name === "GOOGLE_DRIVE_PRIVATE_KEY") return "line1\\nline2";
    return "";
  });
  assert.equal(account?.kind, "service_account");
  if (account?.kind === "service_account") assert.match(account.privateKey, /line1\nline2/);
});

test("Drive file query escapes quotes and stays inside one folder", () => {
  assert.equal(
    driveNameInFolderQuery("cos-heartbeat.json", "folder-1"),
    "name = 'cos-heartbeat.json' and 'folder-1' in parents and trashed = false",
  );
  assert.match(driveNameInFolderQuery("a'b.md", "folder"), /name = 'a\\'b\.md'/);
});

test("service account assertion is a signed JWT and does not echo the private key", () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const jwt = signGoogleServiceAccountJwt({
    clientEmail: "bot@example.com",
    privateKey: pem,
    nowSeconds: 1_700_000_000,
  });
  const [header, payload, signature] = jwt.split(".");
  assert.equal(Boolean(header && payload && signature), true);
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  assert.equal(claims.iss, "bot@example.com");
  assert.equal(claims.scope, "https://www.googleapis.com/auth/drive");
  assert.doesNotMatch(jwt, /BEGIN PRIVATE KEY/);
});
