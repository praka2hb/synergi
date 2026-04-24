/**
 * Shared OpenAI auth-failure guard.
 *
 * Purpose:
 * - Detect OpenAI authentication / account failures consistently
 * - Avoid spamming repeated upstream calls after a known-invalid key state
 * - Provide a safe, user-friendly message for graceful degradation
 */

export interface OpenAIGuardState {
  authFailed: boolean;
  lastFailureAt: number | null;
  failureCount: number;
  lastErrorMessage: string | null;
}

const state: OpenAIGuardState = {
  authFailed: false,
  lastFailureAt: null,
  failureCount: 0,
  lastErrorMessage: null,
};

const AUTH_FAILURE_PATTERNS = [
  /invalid api key/i,
  /incorrect api key/i,
  /invalid_api_key/i,
  /unauthorized/i,
  /authentication failed/i,
  /authentication error/i,
  /401\b/i,
  /forbidden/i,
  /insufficient permissions/i,
  /organization.*not found/i,
  /project.*not found/i,
  /api key.*not found/i,
  /you didn't provide an api key/i,
];

function safeStringify(value: unknown): string {
  try {
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function extractErrorText(error: unknown): string {
  if (!error) return "";

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    const anyError = error as Error & {
      cause?: unknown;
      responseBody?: unknown;
      statusCode?: unknown;
      data?: unknown;
    };

    return [
      anyError.message,
      safeStringify(anyError.cause),
      safeStringify(anyError.responseBody),
      safeStringify(anyError.statusCode),
      safeStringify(anyError.data),
    ]
      .filter(Boolean)
      .join(" | ");
  }

  return safeStringify(error);
}

export function isOpenAIAuthError(error: unknown): boolean {
  const text = extractErrorText(error);
  return AUTH_FAILURE_PATTERNS.some((pattern) => pattern.test(text));
}

export function markOpenAIAuthFailure(error: unknown): void {
  state.authFailed = true;
  state.lastFailureAt = Date.now();
  state.failureCount += 1;
  state.lastErrorMessage = extractErrorText(error) || "Unknown OpenAI auth error";
}

export function clearOpenAIAuthFailure(): void {
  state.authFailed = false;
  state.lastFailureAt = null;
  state.failureCount = 0;
  state.lastErrorMessage = null;
}

export function hasOpenAIAuthFailure(): boolean {
  return state.authFailed;
}

export function getOpenAIGuardState(): OpenAIGuardState {
  return { ...state };
}

export function getOpenAIUnavailableMessage(): string {
  return "Synergi's LLM provider is currently unavailable because the OpenAI API key is invalid or not authorized. Update OPENAI_API_KEY and restart the backend.";
}

export function guardOpenAIError(error: unknown): boolean {
  if (!isOpenAIAuthError(error)) {
    return false;
  }

  markOpenAIAuthFailure(error);
  return true;
}
