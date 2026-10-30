import assert from "node:assert/strict";
import { test } from "node:test";
import { effectiveTheme, isTheme, otherTheme, themeLabel } from "./theme.ts";

test("an explicit data-theme wins over the system preference", () => {
  assert.equal(effectiveTheme("light", true), "light");
  assert.equal(effectiveTheme("dark", false), "dark");
});

test("without a valid attribute the system preference decides", () => {
  assert.equal(effectiveTheme(null, true), "dark");
  assert.equal(effectiveTheme(undefined, false), "light");
  assert.equal(effectiveTheme("blue", true), "dark");
});

test("toggle and label", () => {
  assert.equal(otherTheme("dark"), "light");
  assert.equal(otherTheme("light"), "dark");
  assert.equal(themeLabel("dark"), "Switch to light theme");
  assert.equal(themeLabel("light"), "Switch to dark theme");
  assert.ok(isTheme("dark") && !isTheme("x"));
});
