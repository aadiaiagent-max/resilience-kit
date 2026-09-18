import { describe, it, expect } from "vitest";
import { Bulkhead } from "../src/bulkhead.js";
import { BulkheadFullError } from "../src/types.js";

describe("Bulkhead", () => {
  it("rejects when saturated", async () => {
    const bh = new Bulkhead({ maxConcurrent: 2 });

    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });

    const hold = () =>
      bh.execute(async () => {
        await gate;
        return "done";
      });

    const p1 = hold();
    const p2 = hold();

    // Give microtasks a chance to increment inflight.
    await Promise.resolve();
    expect(bh.getInflight()).toBe(2);

    await expect(
      bh.execute(async () => "overflow"),
    ).rejects.toBeInstanceOf(BulkheadFullError);

    release();
    await expect(Promise.all([p1, p2])).resolves.toEqual(["done", "done"]);
    expect(bh.getInflight()).toBe(0);

    // Slot freed — subsequent call succeeds.
    await expect(bh.execute(async () => "ok")).resolves.toBe("ok");
  });

  it("rejects maxConcurrent < 1 at construction", () => {
    expect(() => new Bulkhead({ maxConcurrent: 0 })).toThrow(RangeError);
  });
});
