/**
 * Turning a failed API response into something a student can read.
 *
 * WHAT WAS WRONG
 *
 * Every failed request threw `new Error(\`${status}: ${body}\`)`, and around
 * thirty places in the app put `error.message` straight into a toast. So a
 * student who tried to sign up with an address they had already used was told:
 *
 *   Signup failed
 *   400: {"message":"Email already registered"}
 *
 * The sentence they needed was in there, wrapped in a status code and a JSON
 * envelope. That is the single most common way registration fails, and this is
 * what the app said about it.
 *
 * WHAT IT DOES NOW
 *
 * The Error carries the server's own sentence as its message, and keeps the
 * status and the raw body as properties for anyone debugging. Nothing at a
 * call site has to change: the same `error.message` now reads as English.
 *
 * WHEN THERE IS NO SENTENCE
 *
 * A proxy 502 returns an HTML page; a dropped connection returns nothing at
 * all. Neither must reach a toast - a wall of markup is worse than silence.
 * Those fall back to a plain line chosen from the status, which at least tells
 * the reader whether to try again or to sign in.
 */

/** Longest server sentence worth showing. Beyond this it is not a sentence. */
const MAX_MESSAGE = 200;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** The unparsed response body, kept for debugging - never shown. */
    readonly body: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** The line to show when the server did not provide a usable one. */
function fallbackForStatus(status: number): string {
  if (status === 401) return "Please sign in and try again.";
  if (status === 403) return "You do not have access to that.";
  if (status === 404) return "We could not find that.";
  if (status === 429) return "Too many attempts. Please wait a little and try again.";
  if (status >= 500) return "Something went wrong on our end. Please try again.";
  return "Something went wrong. Please try again.";
}

function usable(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // An HTML error page is not a message, however well-formed it is.
  if (trimmed.startsWith("<")) return null;
  return trimmed.slice(0, MAX_MESSAGE);
}

/**
 * Pull the human sentence out of an error response.
 *
 * Prefers `message`, which is what this API returns everywhere. `error` is the
 * secondary field on the rate-limit responses, and `errors[0].message` is the
 * shape Zod validation failures arrive in.
 */
export function messageFromBody(status: number, body: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return fallbackForStatus(status);
  }

  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;

    const direct = usable(record.message) ?? usable(record.error);
    if (direct) return direct;

    const first = Array.isArray(record.errors) ? record.errors[0] : null;
    if (first && typeof first === "object") {
      const nested = usable((first as Record<string, unknown>).message);
      if (nested) return nested;
    }
  }

  return fallbackForStatus(status);
}

export async function apiErrorFrom(res: Response): Promise<ApiError> {
  // Reading the body can itself fail on a dropped connection.
  const body = await res.text().catch(() => "");
  return new ApiError(res.status, messageFromBody(res.status, body), body);
}
