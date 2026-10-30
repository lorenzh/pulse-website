import { afterAll, beforeAll, test } from "bun:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DocsFetchError, type FetchLike, loadDocFile, rawUrl } from "./fetch.ts";

const sha = "a".repeat(40);
const source = { repo: "lorenzh/pulse-api", sha, path: "docs/install.md" };
let dir = "";

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "docs-fetch-"));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

function fake(status: number, body: string, calls: string[]): FetchLike {
  return async (url) => {
    calls.push(url);
    return { status, text: async () => body };
  };
}

test("builds the raw URL from repo, sha and path", () => {
  assert.equal(
    rawUrl(source),
    `https://raw.githubusercontent.com/lorenzh/pulse-api/${sha}/docs/install.md`,
  );
});

test("fetches once, then reads the cache", async () => {
  const calls: string[] = [];
  const first = await loadDocFile(source, {
    fetch: fake(200, "# Install\n", calls),
    cacheDir: dir,
  });
  const second = await loadDocFile(source, { fetch: fake(500, "", calls), cacheDir: dir });
  assert.equal(first, "# Install\n");
  assert.equal(second, "# Install\n");
  assert.equal(calls.length, 1);
  const cached = await readFile(
    path.join(dir, "lorenzh__pulse-api", sha, "docs", "install.md"),
    "utf8",
  );
  assert.equal(cached, "# Install\n");
});

test("fails on a non-200 answer", async () => {
  await assert.rejects(
    loadDocFile(
      { ...source, path: "docs/missing.md" },
      { fetch: fake(404, "x", []), cacheDir: dir },
    ),
    /answered 404/,
  );
});

test("fails on an empty file and does not cache it", async () => {
  const empty = { ...source, path: "docs/empty.md" };
  await assert.rejects(
    loadDocFile(empty, { fetch: fake(200, " \n", []), cacheDir: dir }),
    DocsFetchError,
  );
  await assert.rejects(readFile(path.join(dir, "lorenzh__pulse-api", sha, "docs", "empty.md")));
});

test("fails on a bad SHA before any request", async () => {
  const calls: string[] = [];
  await assert.rejects(
    loadDocFile({ ...source, sha: "main" }, { fetch: fake(200, "x", calls), cacheDir: dir }),
    /40-character/,
  );
  assert.equal(calls.length, 0);
});

test("wraps a network failure", async () => {
  const failing: FetchLike = async () => {
    throw new Error("offline");
  };
  await assert.rejects(
    loadDocFile({ ...source, path: "docs/net.md" }, { fetch: failing, cacheDir: dir }),
    /failed/,
  );
});
