import { test } from "bun:test";
import assert from "node:assert/strict";
import { UnsafeLinkError, unsafeRefs } from "../build/url-safety.ts";
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

// One fixture per unsafe link: marked 18.1.2 turns each into a link or image token (checked with
// the unsafe-link check removed). Control characters need the angle-bracket destination form.
const UNSAFE_FIXTURES: [markdown: string, href: string][] = [
  ["[x](javascript:alert(1))", "javascript:alert(1)"],
  ["[y](JaVaScRiPt:alert(1))", "JaVaScRiPt:alert(1)"],
  ["[z](data:text/html,<script>alert(1)</script>)", "data:text/html,<script>alert(1)</script>"],
  ["[w]( javascript:alert(1))", "javascript:alert(1)"],
  ["![i](javascript:alert(1))", "javascript:alert(1)"],
  ["[r][a]\n\n[a]: javascript:alert(1)", "javascript:alert(1)"],
  ["<javascript:alert(1)>", "javascript:alert(1)"],
  ["[c](<\u0001javascript:alert(1)>)", "\u0001javascript:alert(1)"],
  ["[t](<java\tscript:alert(1)>)", "java\tscript:alert(1)"],
];

for (const [markdown, href] of UNSAFE_FIXTURES) {
  test(`an unsafe link fails the build: ${JSON.stringify(markdown)}`, () => {
    const source = { "api:docs/index.md": `# Overview\n\n${markdown}\n` };
    assert.throws(
      () => buildDocPages(config, sources(source)),
      (e: unknown) =>
        e instanceof UnsafeLinkError &&
        e.message.startsWith(
          `lorenzh/pulse-api docs/index.md: unsafe link ${JSON.stringify(href)}:`,
        ),
    );
  });
}

test("control characters are escaped in the error", () => {
  const source = { "api:docs/index.md": "# O\n\n[c](<\u0001javascript:alert(1)>)\n" };
  assert.throws(() => buildDocPages(config, sources(source)), /unsafe link "\\u0001javascript/);
  const tab = { "api:docs/index.md": "# O\n\n[t](<java\tscript:alert(1)>)\n" };
  assert.throws(() => buildDocPages(config, sources(tab)), /unsafe link "java\\tscript/);
});

test("https, mailto, relative and fragment links still build", () => {
  const source = {
    "api:docs/index.md":
      "# Overview\n\n[a](https://x.test/) [b](mailto:a@b.c) [c](install.md) [d](#overview)\n",
  };
  const html = buildDocPages(config, sources(source))[0]?.html ?? "";
  assert.match(html, /href="https:\/\/x\.test\/"/);
  assert.match(html, /href="mailto:a@b\.c"/);
  assert.match(html, /href="\/docs\/api\/install\/"/);
  assert.match(html, /href="#overview"/);
  assert.deepEqual(unsafeRefs(html), []);
});
