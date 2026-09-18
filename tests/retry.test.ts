import { describe, it, expect, vi } from "vitest";
import { retry, computeDelayMs } from "../src/retry.js";

describe("retry", () => {
  it("succeeds after transient failures", async () => {
    let calls = 0;
    const result = await retry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error(`fail-${calls}`);
        return "ok";
      },
      { retries: 5, baseMs: 1, maxMs: 5 },
    );

    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("throws the last error when retries are exhausted", async () => {
    let calls = 0;
    await expect(
      retry(
        async () => {
          calls += 1;
          throw new Error(`fail-${calls}`);
        },
        { retries: 2, baseMs: 1, maxMs: 5 },
      ),
    ).rejects.toThrow("fail-3");
    expect(calls).toBe(3); // 1 initial + 2 retries
  });

  it("respects shouldRetry and stops early", async () => {
    let calls = 0;
    await expect(
      retry(
        async () => {
          calls += 1;
          throw new Error("fatal");
        },
        {
          retries: 5,
          baseMs: 1,
          maxMs: 5,
          shouldRetry: () => false,
        },
      ),
    ).rejects.toThrow("fatal");
    expect(calls).toBe(1);
  });

  it("computeDelayMs stays within [0, maxMs]", () => {
    for (let i = 0; i < 50; i++) {
      const d = computeDelayMs(i, 100, 1000);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1000);
    }
  });
});
