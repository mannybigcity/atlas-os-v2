/** Desk chat is a working pane, not a log. Stale HUNTER searches should not sit for days. */
export const DESK_CHAT_FRESH_MS = 12 * 60 * 60 * 1000;

export function isFreshDeskChatTurn(createdAt: string | null | undefined, now = Date.now()) {
  const created = Date.parse(String(createdAt ?? ""));
  if (!Number.isFinite(created)) return false;
  return now - created <= DESK_CHAT_FRESH_MS;
}

export function freshDeskChatRequests<T extends { createdAt: string }>(
  requests: T[],
  now = Date.now(),
) {
  return requests.filter((item) => isFreshDeskChatTurn(item.createdAt, now));
}
