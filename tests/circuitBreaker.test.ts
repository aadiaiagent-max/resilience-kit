import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CircuitBreaker } from "../src/circuitBreaker.js";
import { CircuitOpenError } from "../src/types.js";

describe("CircuitBreaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens after failureThreshold then half-opens after resetTimeoutMs", async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 1000,
    });

    expect(cb.getState()).toBe("closed");

    for (let i = 0; i < 3; i++) {
      await expect(
        cb.execute(async () => {
          throw new Error("downstream");
        }),
      ).rejects.toThrow("downstream");
    }

    expect(cb.getState()).toBe("open");
    expect(cb.getConsecutiveFailures()).toBe(3);

    // While open, calls are rejected without invoking fn.
    let invoked = false;
    await expect(
      cb.execute(async () => {
        invoked = true;
        return "nope";
      }),
    ).rejects.toBeInstanceOf(CircuitOpenError);
    expect(invoked).toBe(false);

    // Advance past resetTimeoutMs → half-open on next getState/execute.
    vi.advanceTimersByTime(1000);
    expect(cb.getState()).toBe("half-open");

    // Successful probe closes the circuit.
    const result = await cb.execute(async () => "recovered");
    expect(result).toBe("recovered");
    expect(cb.getState()).toBe("closed");
    expect(cb.getConsecutiveFailures()).toBe(0);
  });

  it("re-opens from half-open on probe failure", async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 500,
    });

    for (let i = 0; i < 2; i++) {
      await expect(
        cb.execute(async () => {
          throw new Error("down");
        }),
      ).rejects.toThrow("down");
    }
    expect(cb.getState()).toBe("open");

    vi.advanceTimersByTime(500);
    expect(cb.getState()).toBe("half-open");

    await expect(
      cb.execute(async () => {
        throw new Error("still-down");
      }),
    ).rejects.toThrow("still-down");

    expect(cb.getState()).toBe("open");
  });
});
