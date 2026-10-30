import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  BumpError,
  commitDate,
  DOC_REPOS,
  docFilesFromTree,
  parseLsRemote,
  withRepo,
} from "./bump.ts";

const sha = "c".repeat(40);

test("parseLsRemote reads the main SHA", () => {
  assert.equal(parseLsRemote(`${sha}\trefs/heads/main\n`), sha);
  assert.throws(() => parseLsRemote(""), BumpError);
});

test("docFilesFromTree keeps docs/*.md and docs/channels/*.md, sorted", () => {
  const tree = {
    tree: [
      { path: "README.md", type: "blob" },
      { path: "docs", type: "tree" },
      { path: "docs/install.md", type: "blob" },
      { path: "docs/channels/email.md", type: "blob" },
      { path: "docs/channels/deep/x.md", type: "blob" },
      { path: "docs/img.png", type: "blob" },
      { path: "docs/index.md", type: "blob" },
    ],
  };
  assert.deepEqual(docFilesFromTree(tree), [
    "docs/channels/email.md",
    "docs/index.md",
    "docs/install.md",
  ]);
  assert.throws(() => docFilesFromTree({ tree: [], truncated: false }), /no docs/);
  assert.throws(() => docFilesFromTree({ tree: [], truncated: true }), /truncated/);
  assert.throws(() => docFilesFromTree(null), BumpError);
  assert.throws(() => docFilesFromTree({}), /no tree list/);
});

test("commitDate reads the committer date", () => {
  assert.equal(
    commitDate({ commit: { committer: { date: "2026-10-29T10:00:00Z" } } }),
    "2026-10-29T10:00:00Z",
  );
  assert.throws(() => commitDate({}), BumpError);
});

test("withRepo replaces one pin and keeps the sidebar order", () => {
  const entry = {
    repo: "lorenzh/pulse-kit",
    sha,
    date: "2026-10-29T10:00:00Z",
    files: ["docs/index.md"],
  };
  const start = withRepo(undefined, "kit", entry);
  const next = withRepo(start, "api", { ...entry, repo: DOC_REPOS.api ?? "" });
  assert.deepEqual(Object.keys(next.repos), ["api", "kit"]);
  assert.equal(
    withRepo(next, "kit", { ...entry, sha: "d".repeat(40) }).repos.kit?.sha,
    "d".repeat(40),
  );
});
