import assert from "node:assert/strict";
import { test } from "node:test";
import { DocsConfigError, parseDocsConfig, stringifyDocsConfig } from "./config.ts";

const good = {
  repos: {
    api: {
      repo: "lorenzh/pulse-api",
      sha: "a".repeat(40),
      date: "2026-10-29T10:00:00Z",
      files: ["docs/index.md", "docs/install.md"],
    },
  },
};

test("accepts a valid config", () => {
  assert.deepEqual(parseDocsConfig(good), good);
});

test("rejects bad shapes with a clear message", () => {
  const cases: [unknown, RegExp][] = [
    [null, /"repos" object/],
    [{ repos: {} }, /no repos/],
    [{ repos: { API: good.repos.api } }, /lower-case letters/],
    [{ repos: { api: { ...good.repos.api, repo: "nope" } } }, /owner\/name/],
    [{ repos: { api: { ...good.repos.api, sha: "main" } } }, /40 lower-case hex/],
    [{ repos: { api: { ...good.repos.api, date: "later" } } }, /ISO date/],
    [{ repos: { api: { ...good.repos.api, files: [] } } }, /non-empty/],
    [{ repos: { api: { ...good.repos.api, files: ["README.md"] } } }, /docs\/\*\.md/],
    [{ repos: { api: { ...good.repos.api, files: ["docs/a.md", "docs/a.md"] } } }, /twice/],
    [{ repos: { api: 1 } }, /must be an object/],
  ];
  for (const [input, message] of cases) {
    assert.throws(
      () => parseDocsConfig(input),
      (e) => e instanceof DocsConfigError && message.test(e.message),
    );
  }
});

test("stringify is stable, one line per file, and parses back", () => {
  const text = stringifyDocsConfig(good);
  assert.match(text, /^\{\n {2}"repos": \{\n {4}"api": \{/);
  assert.match(text, /\n {8}"docs\/index\.md",\n {8}"docs\/install\.md"\n/);
  assert.deepEqual(parseDocsConfig(JSON.parse(text)), good);
  assert.equal(stringifyDocsConfig(parseDocsConfig(JSON.parse(text))), text);
});
