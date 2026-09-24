/**
 * Browser origins allowed to read the public SIS party calendar.
 * Shopify is an exact host match for this store (live domain and its
 * myshopify preview). A `*.myshopify.com` suffix would let any other shop call it.
 */
const HTTPS_EXACT_HOSTS = new Set([
  "atlasforentrepreneurs.com",
  "www.atlasforentrepreneurs.com",
  "siscustomcreations.com",
  "www.siscustomcreations.com",
  "i5mszs-hq.myshopify.com",
]);

export function allowedOrigin(origin: string) {
  try {
    const url = new URL(origin);
    const host = url.hostname;
    if (url.protocol === "http:" && (host === "localhost" || host === "127.0.0.1")) return true;
    if (url.protocol !== "https:") return false;
    if (HTTPS_EXACT_HOSTS.has(host)) return true;
    return host.endsWith(".netlify.app") || host.endsWith(".vercel.app") || host.endsWith(".github.io");
  } catch {
    return false;
  }
}
