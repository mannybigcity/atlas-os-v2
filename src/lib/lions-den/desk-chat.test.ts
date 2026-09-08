import assert from "node:assert/strict";
import test from "node:test";
import {
  DESK_CHAT_FRESH_MS,
  freshDeskChatRequests,
  isFreshDeskChatTurn,
} from "./desk-chat.ts";

test("desk chat hides day-old HUNTER searches and keeps today's thread", () => {
  const now = Date.parse("2026-09-08T17:40:00.000Z");
  assert.equal(isFreshDeskChatTurn("2026-09-08T16:00:00.000Z", now), true);
  assert.equal(isFreshDeskChatTurn("2026-09-06T12:00:00.000Z", now), false);
  assert.equal(isFreshDeskChatTurn("not-a-date", now), false);

  const visible = freshDeskChatRequests(
    [
      { id: "old", createdAt: "2026-09-05T18:00:00.000Z", prompt: "find pest control in Cypress TX" },
      { id: "fresh", createdAt: new Date(now - 60 * 60 * 1000).toISOString(), prompt: "what is due today" },
    ],
    now,
  );
  assert.deepEqual(visible.map((item) => item.id), ["fresh"]);
  assert.equal(DESK_CHAT_FRESH_MS, 12 * 60 * 60 * 1000);
});
