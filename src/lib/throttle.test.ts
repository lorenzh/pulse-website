import { test } from "bun:test";
import assert from "node:assert/strict";
import { FRAME_MS, skipFrame } from "./throttle.ts";

test("a frame less than 33 ms after the last one is skipped", () => {
  assert.equal(FRAME_MS, 33);
  assert.equal(skipFrame(1000, 1000), true);
  assert.equal(skipFrame(1032, 1000), true);
});

test("a frame 33 ms or more after the last one is drawn", () => {
  assert.equal(skipFrame(1033, 1000), false);
  assert.equal(skipFrame(1100, 1000), false);
});
