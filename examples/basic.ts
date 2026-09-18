/**
 * Minimal walkthrough of every primitive in @aadiaiagent/resilience-kit.
 * Run: npm run example
 */
import {
  retry,
  CircuitBreaker,
  withTimeout,
  Bulkhead,
  CircuitOpenError,
  TimeoutError,
  BulkheadFullError,
} from "../src/index.js";

async function demoRetry(): Promise<void> {
  let attempts = 0;
  const value = await retry(
    async () => {
      attempts += 1;
      if (attempts < 2) throw new Error("transient");
      return `retry-ok after ${attempts} attempts`;
    },
    { retries: 3, baseMs: 10, maxMs: 50 },
  );
  console.log("retry:", value);
}

async function demoCircuit(): Promise<void> {
  const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 200 });

  for (let i = 0; i < 2; i++) {
    try {
      await cb.execute(async () => {
        throw new Error("downstream-5xx");
      });
    } catch {
      /* expected */
    }
  }
  console.log("circuit state after failures:", cb.getState()); // open

  try {
    await cb.execute(async () => "blocked");
  } catch (e) {
    console.log("circuit rejected:", e instanceof CircuitOpenError);
  }

  await new Promise((r) => setTimeout(r, 250));
  const recovered = await cb.execute(async () => "probe-ok");
  console.log("circuit after probe:", cb.getState(), recovered);
}

async function demoTimeout(): Promise<void> {
  try {
    await withTimeout(
      new Promise((r) => setTimeout(() => r("never"), 500)),
      50,
    );
  } catch (e) {
    console.log("timeout fired:", e instanceof TimeoutError);
  }
}

async function demoBulkhead(): Promise<void> {
  const bh = new Bulkhead({ maxConcurrent: 1 });
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });

  const held = bh.execute(async () => {
    await gate;
    return "held";
  });

  await Promise.resolve();
  try {
    await bh.execute(async () => "overflow");
  } catch (e) {
    console.log("bulkhead saturated:", e instanceof BulkheadFullError);
  }

  release();
  console.log("bulkhead released:", await held);
}

await demoRetry();
await demoCircuit();
await demoTimeout();
await demoBulkhead();
console.log("example complete");
