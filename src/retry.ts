import type { AsyncFn, RetryOptions } from "./types.js";

/**
 * Full-jitter exponential backoff delay for a given attempt (0-indexed).
 * Formula: random(0, min(maxMs, baseMs * 2^attempt))
 *
 * Full jitter (AWS Architecture Blog) prevents thundering-herd synchronisation
 * better than equal or decorrelated jitter for most client-side retry scenarios.
 */
export function computeDelayMs(
  attempt: number,
  baseMs: number,
  maxMs: number,
): number {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  return Math.floor(Math.random() * (exp + 1));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute `fn`, retrying on failure with exponential backoff + full jitter.
 *
 * @param fn       - Zero-arg function to invoke.
 * @param options  - Retry / backoff configuration.
 * @returns        - The successful result of `fn`.
 * @throws         - The last error if all attempts are exhausted, or an error
 *                   that `shouldRetry` rejects.
 */
export async function retry<T>(
  fn: AsyncFn<T>,
  options: RetryOptions = {},
): Promise<T> {
  const retries = options.retries ?? 3;
  const baseMs = options.baseMs ?? 100;
  const maxMs = options.maxMs ?? 10_000;
  const shouldRetry = options.shouldRetry ?? (() => true);

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= retries || !shouldRetry(error, attempt)) {
        throw error;
      }

      const delay = computeDelayMs(attempt, baseMs, maxMs);
      await sleep(delay);
    }
  }

  // Unreachable, but satisfies the type checker.
  throw lastError;
}
