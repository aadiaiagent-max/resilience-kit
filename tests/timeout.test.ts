import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withTimeout } from "../src/timeout.js";
import { TimeoutError } from "../src/types.js";

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects with TimeoutError when the promise is too slow", async () => {
    const slow = new Promise<string>((resolve) => {
      setTimeout(() => resolve("late"), 5000);
    });

    const pending = withTimeout(slow, 100);
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);

    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });

  it("resolves when the promise settles before the deadline", async () => {
    const fast = Promise.resolve("quick");
    await expect(withTimeout(fast, 1000)).resolves.toBe("quick");
  });

  it("propagates rejection from the underlying promise", async () => {
    const failing = Promise.reject(new Error("boom"));
    await expect(withTimeout(failing, 1000)).rejects.toThrow("boom");
  });
});
