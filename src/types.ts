/**
 * Shared types for resilience-kit primitives.
 */

/** A zero-arg async (or sync) function returning a value of type T. */
export type AsyncFn<T> = () => T | Promise<T>;

/** Options controlling retry behaviour with exponential backoff + full jitter. */
export interface RetryOptions {
  /** Maximum number of retry attempts after the initial call. Default: 3 */
  retries?: number;
  /** Base delay in milliseconds before the first retry. Default: 100 */
  baseMs?: number;
  /** Cap on the computed delay (before jitter). Default: 10_000 */
  maxMs?: number;
  /**
   * Predicate that decides whether a given error is retryable.
   * Defaults to always-true (retry every failure).
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/** Configuration for a CircuitBreaker instance. */
export interface CircuitBreakerOptions {
  /** Consecutive failures required to trip from closed → open. Default: 5 */
  failureThreshold?: number;
  /** Milliseconds to wait in open state before probing half-open. Default: 30_000 */
  resetTimeoutMs?: number;
}

/** Possible circuit breaker states. */
export type CircuitState = "closed" | "open" | "half-open";

/** Configuration for a Bulkhead concurrency limiter. */
export interface BulkheadOptions {
  /** Maximum number of concurrent executions. Required. */
  maxConcurrent: number;
}

/** Error thrown when withTimeout expires. */
export class TimeoutError extends Error {
  override readonly name = "TimeoutError";
  constructor(ms: number) {
    super(`Operation timed out after ${ms}ms`);
  }
}

/** Error thrown when the circuit is open and rejects calls. */
export class CircuitOpenError extends Error {
  override readonly name = "CircuitOpenError";
  constructor() {
    super("Circuit breaker is open");
  }
}

/** Error thrown when the bulkhead is at capacity. */
export class BulkheadFullError extends Error {
  override readonly name = "BulkheadFullError";
  constructor(maxConcurrent: number) {
    super(`Bulkhead saturated (maxConcurrent=${maxConcurrent})`);
  }
}
