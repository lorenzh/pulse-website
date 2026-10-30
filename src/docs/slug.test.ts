import { test } from "bun:test";
import assert from "node:assert/strict";
import { createSlugger, headingSlug } from "./slug.ts";

test("lower-cases, drops punctuation and joins words with dashes", () => {
  assert.equal(headingSlug("Quorum and incidents"), "quorum-and-incidents");
  assert.equal(headingSlug("With npm"), "with-npm");
  assert.equal(headingSlug("The `.env` file"), "the-env-file");
  assert.equal(headingSlug("GET /checks (list)"), "get-checks-list");
});

test("adds -1, -2 for duplicates", () => {
  const slug = createSlugger();
  assert.equal(slug("Example"), "example");
  assert.equal(slug("Example"), "example-1");
  assert.equal(slug("Example"), "example-2");
  assert.equal(slug("Example 1"), "example-1-1");
});
