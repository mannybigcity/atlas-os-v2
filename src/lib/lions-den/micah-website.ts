import {
  emptyMicahBusinessFacts,
  extractFactsFromWebsiteHtml,
  htmlToVisibleText,
  isPublicWebsiteUrl,
  micahFactsReady,
  normalizeFactPhone,
  normalizeFactWebsite,
  parseMicahServiceList,
  retainPageSupportedFacts,
  type MicahBusinessFacts,
} from "./micah-business-facts.ts";

const FETCH_LIMIT_BYTES = 400_000;

export async function readPublicWebsiteHtml(
  website: string,
  fetchImpl: typeof fetch = fetch,
) {
  let current = isPublicWebsiteUrl(website);
  if (!current) return null;
  for (let hop = 0; hop < 3; hop += 1) {
    let response: Response;
    try {
      response = await fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(5_000),
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "AtlasForEntrepreneurs/1.0 (+https://atlasforentrepreneurs.com)",
        },
      });
    } catch {
      return null;
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      try {
        current = isPublicWebsiteUrl(new URL(location, current).toString());
      } catch {
        return null;
      }
      if (!current) return null;
      continue;
    }
    if (!response.ok) return null;
    const contentType = String(response.headers.get("content-type") ?? "");
    if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) return null;
    try {
      return (await response.text()).slice(0, FETCH_LIMIT_BYTES);
    } catch {
      return null;
    }
  }
  return null;
}

export type MicahFactResolution = {
  status: "ready" | "intake";
  facts: MicahBusinessFacts;
  message: string;
};

function mergeFacts(base: MicahBusinessFacts, extra: Partial<MicahBusinessFacts>): MicahBusinessFacts {
  return {
    businessName: base.businessName,
    city: base.city || extra.city || "",
    state: base.state || (base.city ? base.state : extra.state || ""),
    zipCode: base.zipCode,
    phone: base.phone || normalizeFactPhone(extra.phone) || "",
    website: base.website,
    services: base.services.length ? base.services : parseMicahServiceList((extra.services ?? []).join("\n")),
    offer: base.offer || extra.offer || "",
  };
}

export async function resolveMicahBusinessFacts(input: {
  base: MicahBusinessFacts;
  fetchImpl?: typeof fetch;
  completeFromPage?: (pageText: string) => Promise<Partial<MicahBusinessFacts> | null>;
}): Promise<MicahFactResolution> {
  const base = input.base;
  if (!base.businessName.trim()) {
    return {
      status: "intake",
      facts: base,
      message: "Add the business name, then list the services you actually sell. Nothing was posted.",
    };
  }
  if (micahFactsReady(base)) {
    return {
      status: "ready",
      facts: base,
      message: "Cards use only the services and offer you entered.",
    };
  }
  const website = normalizeFactWebsite(base.website);
  if (!website) {
    return {
      status: "intake",
      facts: base,
      message:
        "List what you sell, one service per line. MICAH will not invent services, prices, or reviews. Nothing was posted.",
    };
  }
  const html = await readPublicWebsiteHtml(website, input.fetchImpl);
  if (!html) {
    return {
      status: "intake",
      facts: { ...base, website },
      message:
        "MICAH couldn't read that website. List your services below and the cards will use those. Nothing was posted.",
    };
  }
  const pageText = htmlToVisibleText(html);
  let facts = mergeFacts(base, retainPageSupportedFacts(pageText, extractFactsFromWebsiteHtml(html, base.businessName)));
  if (!micahFactsReady(facts) && input.completeFromPage) {
    try {
      const completed = await input.completeFromPage(pageText);
      if (completed) {
        facts = mergeFacts(facts, retainPageSupportedFacts(pageText, completed));
      }
    } catch {
      // A missing or failed model leaves the intake. It does not invent cards.
    }
  }
  if (!micahFactsReady(facts)) {
    return {
      status: "intake",
      facts: { ...facts, website },
      message:
        "That page didn't name specific services MICAH can stand behind. List them below. Nothing was posted.",
    };
  }
  return {
    status: "ready",
    facts: { ...facts, website },
    message: "Cards use only services, location, phone, and prices found on your website or typed by you.",
  };
}

export function factsFromOwnerInput(input: {
  businessName?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
  website?: string | null;
  services?: string | null;
  offer?: string | null;
}): MicahBusinessFacts {
  const base = emptyMicahBusinessFacts();
  return {
    ...base,
    businessName: String(input.businessName ?? "").replace(/\s+/g, " ").trim().slice(0, 160),
    city: String(input.city ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
    state: String(input.state ?? "").trim().toUpperCase().slice(0, 2),
    zipCode: String(input.zipCode ?? "").trim().slice(0, 16),
    phone: normalizeFactPhone(input.phone),
    website: normalizeFactWebsite(input.website),
    services: parseMicahServiceList(input.services),
    offer: String(input.offer ?? "").replace(/\s+/g, " ").trim().slice(0, 160),
  };
}
