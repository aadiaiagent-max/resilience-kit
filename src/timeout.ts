import { TimeoutError } from "./types.js";

/**
 * Race `promise` against a wall-clock timeout.
 *
 * @param promise - The promise to await.
 * @param ms      - Milliseconds before rejection with TimeoutError.
 * @returns       - The resolved value of `promise`.
 * @throws {TimeoutError} when the timer fires first.
 *
 * Note: the underlying work is not cancelled (promises are not abortable by
 * default). Pair with AbortController at the call site when cancellation is
 * required.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(ms));
    }, ms);

    // Avoid keeping the event loop alive solely for this timer (Node).
    if (typeof timer.unref === "function") {
      timer.unref();
    }

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
