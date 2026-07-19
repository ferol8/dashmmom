// Server-only Anthropic Messages API client with prompt caching + retry.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5-20250929"; // latest Sonnet at time of build

const BACKOFF_MS = [2000, 3000, 5000, 9000];

type CachedTextBlock = {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
};

export interface AnthropicMessagesInput {
  system: string; // top-level system prompt
  cachedContext: string; // large stable context (cache_control ephemeral)
  userInstruction: string; // per-call instruction + discards (NOT cached)
  maxTokens?: number;
}

export interface AnthropicResult {
  text: string;
  raw: unknown;
}

export async function anthropicGenerate(
  input: AnthropicMessagesInput,
): Promise<AnthropicResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");

  const contentBlocks: CachedTextBlock[] = [
    {
      type: "text",
      text: input.cachedContext,
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text: input.userInstruction,
    },
  ];

  const body = {
    model: MODEL,
    max_tokens: input.maxTokens ?? 16000,
    system: input.system,
    messages: [
      {
        role: "user",
        content: contentBlocks,
      },
    ],
  };

  let lastErr: unknown;
  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = (await res.json()) as {
          content?: Array<{ type: string; text?: string }>;
        };
        const text =
          json.content
            ?.filter((b) => b.type === "text")
            .map((b) => b.text ?? "")
            .join("") ?? "";
        return { text, raw: json };
      }

      const errBody = await res.text().catch(() => "");
      // Retry on 5xx (incl 529 Overloaded) and 429
      if (res.status >= 500 || res.status === 429) {
        lastErr = new Error(`Anthropic ${res.status}: ${errBody.slice(0, 300)}`);
      } else {
        throw new Error(`Anthropic ${res.status}: ${errBody.slice(0, 500)}`);
      }
    } catch (err) {
      lastErr = err;
    }

    const delay = BACKOFF_MS[attempt];
    if (delay === undefined) break;
    await new Promise((r) => setTimeout(r, delay));
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error("Anthropic failed after retries");
}

// Extract the first JSON object from the assistant's text response.
export function parseJsonFromText<T = unknown>(text: string): T {
  const trimmed = text.trim();
  // Try direct parse first
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Find outermost object
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in response");
  }
  return JSON.parse(trimmed.slice(start, end + 1)) as T;
}