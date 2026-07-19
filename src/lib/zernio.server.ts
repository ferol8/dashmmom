// Server-only Zernio API client (READ-ONLY).
// Never import from client code — the ZERNIO_API_KEY must stay server-side.

const ZERNIO_BASE = "https://api.zernio.com/v1";

export interface ZernioOptions {
  query?: Record<string, string | number | undefined | null>;
  timeoutMs?: number;
}

export class ZernioError extends Error {
  constructor(
    public status: number,
    public body: string,
    public path: string,
  ) {
    super(`Zernio ${status} on ${path}: ${body.slice(0, 300)}`);
  }
}

const BACKOFF_MS = [2000, 3000, 5000, 9000];

function buildUrl(path: string, query?: ZernioOptions["query"]) {
  const url = new URL(`${ZERNIO_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function zernioGet<T = unknown>(
  path: string,
  opts: ZernioOptions = {},
): Promise<T> {
  const key = process.env.ZERNIO_API_KEY;
  if (!key) throw new Error("ZERNIO_API_KEY not configured");

  const url = buildUrl(path, opts.query);
  let lastErr: unknown;

  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        opts.timeoutMs ?? 30_000,
      );
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (res.ok) {
        return (await res.json()) as T;
      }

      const body = await res.text().catch(() => "");
      // Retry on 5xx and 429; fail fast on other 4xx
      if (res.status >= 500 || res.status === 429) {
        lastErr = new ZernioError(res.status, body, path);
      } else {
        throw new ZernioError(res.status, body, path);
      }
    } catch (err) {
      if (err instanceof ZernioError && err.status < 500 && err.status !== 429) {
        throw err;
      }
      lastErr = err;
    }

    const delay = BACKOFF_MS[attempt];
    if (delay === undefined) break;
    await new Promise((r) => setTimeout(r, delay));
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error(`Zernio failed after retries: ${path}`);
}

// ---------- Typed endpoint wrappers (read-only) ----------

export const zernio = {
  listAccounts: () =>
    zernioGet<{ data?: unknown[]; results?: unknown[] } | unknown[]>(
      "/accounts",
      { query: { platform: "instagram" } },
    ),

  getAccountHealth: (accountId: string) =>
    zernioGet<unknown>(`/accounts/${accountId}/health`),

  getDailyMetrics: (accountId: string, days = 180) =>
    zernioGet<unknown>("/analytics/daily-metrics", {
      query: { platform: "instagram", accountId, days },
    }),

  getBestTime: (accountId: string) =>
    zernioGet<unknown>("/analytics/best-time", {
      query: { platform: "instagram", accountId },
    }),

  getPostingFrequency: (accountId: string) =>
    zernioGet<unknown>("/analytics/posting-frequency", {
      query: { platform: "instagram", accountId },
    }),

  getContentDecay: (accountId: string) =>
    zernioGet<unknown>("/analytics/content-decay", {
      query: { platform: "instagram", accountId },
    }),

  listInboxComments: (accountId: string, limit = 500) =>
    zernioGet<unknown>("/inbox/comments", {
      query: { platform: "instagram", accountId, limit },
    }),

  getPostComments: (postId: string, accountId: string) =>
    zernioGet<unknown>(`/inbox/comments/${postId}`, {
      query: { accountId },
    }),

  getUsageStats: () => zernioGet<unknown>("/usage-stats"),

  getAccountInsights: (accountId: string) =>
    zernioGet<unknown>("/analytics/instagram/account-insights", {
      query: { accountId },
    }),

  getDemographics: (accountId: string) =>
    zernioGet<unknown>("/analytics/instagram/demographics", {
      query: { accountId },
    }),

  getFollowerHistory: (accountId: string) =>
    zernioGet<unknown>("/analytics/instagram/follower-history", {
      query: { accountId },
    }),

  listConversations: (accountId: string, limit = 200) =>
    zernioGet<unknown>("/inbox/conversations", {
      query: { platform: "instagram", accountId, limit },
    }),

  getConversationMessages: (conversationId: string, accountId: string) =>
    zernioGet<unknown>(`/inbox/conversations/${conversationId}/messages`, {
      query: { accountId },
    }),
};

// ---------- Helpers to unwrap common response shapes ----------

export function unwrapList<T = unknown>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
  }
  return [];
}

export function unwrapObj<T = Record<string, unknown>>(res: unknown): T {
  if (res && typeof res === "object" && !Array.isArray(res)) {
    const obj = res as Record<string, unknown>;
    if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
      return obj.data as T;
    }
    return obj as T;
  }
  return {} as T;
}