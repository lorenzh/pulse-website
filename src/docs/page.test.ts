import { test } from "bun:test";
import assert from "node:assert/strict";
import type { DocsConfig } from "./config.ts";
import { buildDocPages, DocPageError, formatUpdated } from "./page.ts";

const file = (name: string) => `docs/${name}.md`;
const config: DocsConfig = {
  repos: {
    api: {
      repo: "lorenzh/pulse-api",
      sha: "a".repeat(40),
      date: "2026-10-29T10:00:00Z",
      files: [file("index"), file("install"), file("concepts")],
    },
  },
};

const sources = (extra: Record<string, string> = {}) =>
  new Map(
    Object.entries({
      "api:docs/index.md": "# Overview\n\nSee [install](install.md#with-npm).\n",
      "api:docs/install.md": "# Install\n\nRun it.\n\n## With npm\n\n[local](#with-npm)\n",
      "api:docs/concepts.md":
        "# Concepts\n\nBack to [the index](index.md) and [agents](../AGENTS.md).\n",
      ...extra,
    }),
  );

// nav.ts maps the real files, so the test config uses real nav entries only.
test("builds a page per file with URLs, links and metadata", () => {
  const pages = buildDocPages(config, sources());
  assert.deepEqual(
    pages.map((p) => p.url),
    ["/docs/api/", "/docs/api/install/", "/docs/api/concepts/"],
  );
  const overview = pages[0];
  assert.match(overview?.html ?? "", /href="\/docs\/api\/install\/#with-npm"/);
  assert.equal(overview?.label, "Overview");
  assert.equal(overview?.editUrl, "https://github.com/lorenzh/pulse-api/edit/main/docs/index.md");
  assert.equal(
    overview?.sourceUrl,
    `https://github.com/lorenzh/pulse-api/blob/${"a".repeat(40)}/docs/index.md`,
  );
  assert.match(pages[2]?.html ?? "", /blob\/a{40}\/AGENTS\.md" rel="noopener"/);
});

test("a dangling anchor fails the build", () => {
  assert.throws(
    () => buildDocPages(config, sources({ "api:docs/index.md": "# O\n\n[x](install.md#nope)\n" })),
    /missing heading/,
  );
});

test("a missing source or title fails", () => {
  const missing = sources();
  missing.delete("api:docs/concepts.md");
  assert.throws(() => buildDocPages(config, missing), DocPageError);
  assert.throws(
    () => buildDocPages(config, sources({ "api:docs/index.md": "no title\n" })),
    /no "# " title/,
  );
});

test("the updated date is written in full", () => {
  assert.equal(formatUpdated("2026-10-29T23:59:00Z"), "29 October 2026");
});
