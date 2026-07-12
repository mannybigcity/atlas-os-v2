const allowedRedirectPaths = new Set(["/", "/client", "/lions-den"]);

export function safeRedirectPath(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string") {
    return "/client";
  }

  if (allowedRedirectPaths.has(value)) {
    return value;
  }

  return "/client";
}
