export type StripeListPage<T> = {
  data: T[];
  hasMore: boolean;
  lastId: string | null;
};

export function retryDelayMs(status: number, retryAfterHeader: string | null, attempt: number) {
  if (status !== 429 && status < 500) {
    return 0;
  }

  const retryAfterSeconds = Number(retryAfterHeader);

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, 10_000);
  }

  return Math.min(250 * 2 ** attempt, 4_000);
}

export async function stripeGet<T>(input: {
  accessToken: string;
  path: string;
  query?: Record<string, string | number | undefined>;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxAttempts?: number;
}): Promise<T> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const sleep = input.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const maxAttempts = input.maxAttempts ?? 4;
  const url = new URL(`https://api.stripe.com${input.path}`);

  for (const [key, value] of Object.entries(input.query ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.append(key, String(value));
    }
  }

  let lastStatus = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    lastStatus = response.status;

    if (response.ok) {
      return (await response.json()) as T;
    }

    const delay = retryDelayMs(response.status, response.headers.get("retry-after"), attempt);

    if (delay === 0 || attempt === maxAttempts - 1) {
      throw new Error(`Stripe request failed (${response.status}) for ${input.path}.`);
    }

    await sleep(delay);
  }

  throw new Error(`Stripe request failed (${lastStatus}) for ${input.path}.`);
}

export function pageFromList<T extends { id?: string }>(payload: {
  data?: T[] | unknown[];
  has_more?: boolean;
}): StripeListPage<T> {
  const data = Array.isArray(payload.data) ? (payload.data as T[]) : [];

  return {
    data,
    hasMore: payload.has_more === true,
    lastId: data.length > 0 ? data[data.length - 1]?.id ?? null : null,
  };
}
