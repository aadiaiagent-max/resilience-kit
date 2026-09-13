import type { AsyncFn, CircuitBreakerOptions, CircuitState } from "./types.js";
import { CircuitOpenError } from "./types.js";

/**
 * Classic three-state circuit breaker (closed → open → half-open → closed).
 *
 * Designed for protecting downstream dependencies: after `failureThreshold`
 * consecutive failures the circuit trips open and rejects calls for
 * `resetTimeoutMs`. A single probe is then allowed in half-open; success
 * closes the circuit, failure re-opens it.
 */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private openedAt = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
  }

  /** Current circuit state. Transitions open → half-open lazily on read/execute. */
  getState(): CircuitState {
    this.maybeTransitionToHalfOpen();
    return this.state;
  }

  /** Number of consecutive failures recorded in the current closed/half-open window. */
  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  /**
   * Run `fn` through the circuit.
   * @throws {CircuitOpenError} when the circuit is open.
   */
  async execute<T>(fn: AsyncFn<T>): Promise<T> {
    this.maybeTransitionToHalfOpen();

    if (this.state === "open") {
      throw new CircuitOpenError();
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private maybeTransitionToHalfOpen(): void {
    if (
      this.state === "open" &&
      Date.now() - this.openedAt >= this.resetTimeoutMs
    ) {
      this.state = "half-open";
    }
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.consecutiveFailures += 1;

    if (
      this.state === "half-open" ||
      this.consecutiveFailures >= this.failureThreshold
    ) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }
}
