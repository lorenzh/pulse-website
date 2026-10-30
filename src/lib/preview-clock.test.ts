import { test } from "bun:test";
import assert from "node:assert/strict";
import { type PreviewClock, tick } from "./preview-clock.ts";

test("the counter ticks every second and the state changes every 4 s", () => {
  let clock: PreviewClock = { ago: 0, active: 0 };
  const seen: PreviewClock[] = [];
  for (let i = 0; i < 8; i++) {
    clock = tick(clock, 2);
    seen.push(clock);
  }
  assert.deepEqual(
    seen.map((c) => [c.ago, c.active]),
    [
      [1, 0],
      [2, 0],
      [3, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [0, 0],
    ],
  );
});
