const exactAllowedRedirectPaths = new Set([
  "/",
  "/reset-password",
  "/set-password",
]);

const allowedRedirectRoots = ["/client", "/lions-den"];

function isAllowedRedirectPath(value: string) {
  if (exactAllowedRedirectPaths.has(value)) {
    return true;
  }

  return allowedRedirectRoots.some(
    (root) => value === root || value.startsWith(`${root}/`),
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
