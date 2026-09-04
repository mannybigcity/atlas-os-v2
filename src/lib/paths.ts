const exactAllowedRedirectPaths = new Set([
  "/",
  "/reset-password",
  "/set-password",
  "/starter",
]);

const allowedRedirectRoots = ["/client", "/clients", "/lions-den"];

function redirectPathBase(value: string) {
  const queryIndex = value.indexOf("?");
  return queryIndex >= 0 ? value.slice(0, queryIndex) : value;
}

function isAllowedRedirectPath(value: string) {
  const path = redirectPathBase(value);

  if (exactAllowedRedirectPaths.has(path)) {
    return true;
  }

  return allowedRedirectRoots.some(
    (root) => path === root || path.startsWith(`${root}/`),
  );
}

export function safeRedirectPath(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string") {
    return "/client";
  }

  if (isAllowedRedirectPath(value)) {
    return value;
  }

  return "/client";
}
