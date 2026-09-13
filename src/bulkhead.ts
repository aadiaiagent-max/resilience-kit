import type { AsyncFn, BulkheadOptions } from "./types.js";
import { BulkheadFullError } from "./types.js";

/**
 * Concurrency-limiting bulkhead (isolation pattern).
 *
 * Caps the number of in-flight executions. When saturated, new calls are
 * rejected immediately with BulkheadFullError rather than queued — fail-fast
 * isolation that protects both the caller and the shared resource pool.
 */
export class Bulkhead {
  private inflight = 0;
  private readonly maxConcurrent: number;

  constructor(options: BulkheadOptions) {
    if (options.maxConcurrent < 1) {
      throw new RangeError("maxConcurrent must be >= 1");
    }
    this.maxConcurrent = options.maxConcurrent;
  }

  /** Current number of in-flight executions. */
  getInflight(): number {
    return this.inflight;
  }

  /** Configured concurrency ceiling. */
  getMaxConcurrent(): number {
    return this.maxConcurrent;
  }

  /**
   * Run `fn` if a slot is available.
   * @throws {BulkheadFullError} when already at maxConcurrent.
   */
  async execute<T>(fn: AsyncFn<T>): Promise<T> {
    if (this.inflight >= this.maxConcurrent) {
      throw new BulkheadFullError(this.maxConcurrent);
    }

    this.inflight += 1;
    try {
      return await fn();
    } finally {
      this.inflight -= 1;
    }
  }
}
