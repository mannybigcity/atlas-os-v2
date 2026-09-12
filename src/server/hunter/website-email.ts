import {
  extractBusinessEmails,
  isHttpWebsiteUrl,
  pickBestBusinessEmail,
} from "@/lib/lions-den/website-email";

const FETCH_LIMIT_BYTES = 400_000;

export async function findEmailOnBusinessWebsite(websiteUrl: string | null | undefined) {
  const url = isHttpWebsiteUrl(websiteUrl);
  if (!url) return null;

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(5_000),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "AtlasForEntrepreneurs/1.0 (+https://atlasforentrepreneurs.com)",
      },
    });
    if (!response.ok) return null;
    const contentType = String(response.headers.get("content-type") ?? "");
    if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) return null;
    const html = (await response.text()).slice(0, FETCH_LIMIT_BYTES);
    return pickBestBusinessEmail(extractBusinessEmails(html));
  } catch {
    return null;
  }
}
