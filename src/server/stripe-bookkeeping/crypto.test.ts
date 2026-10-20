import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { decryptSecret, encryptSecret } from "./crypto";

test("token ciphertext round-trips and does not contain the plaintext", () => {
  const key = randomBytes(32);
  const token = "rt_live_example_refresh_token";
  const ciphertext = encryptSecret(token, key);

  assert.equal(ciphertext.includes(token), false);
  assert.equal(decryptSecret(ciphertext, key), token);
  assert.throws(() => decryptSecret(ciphertext, randomBytes(32)));
});
