import { beforeAll, test } from "bun:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cspMetaTag, cspProblems } from "./build/csp.ts";
import { loadSite, type SiteModule } from "./build/load-site.ts";
import { themeScriptHash } from "./build/theme-hash.ts";
import { UnsafeLinkError } from "./build/url-safety.ts";
import type { DocsConfig } from "./docs/config.ts";
import { buildDocPages, type DocPage } from "./docs/page.ts";

const config: DocsConfig = {
  repos: {
    api: {
      repo: "lorenzh/pulse-api",
      sha: "a".repeat(40),
      date: "2026-10-29T10:00:00Z",
      files: ["docs/index.md", "docs/install.md"],
    },
  },
};
const docs: DocPage[] = buildDocPages(
  config,
  new Map([
    ["api:docs/index.md", "# Overview\n\nSee [install](install.md) or [mail](mailto:a@b.c).\n"],
    ["api:docs/install.md", "# Install\n\nRun it.\n\n```sh\nbun install\n```\n"],
  ]),
);
// Kept in sync with ISLAND_ENTRIES in src/build/assets.ts (importing it would pull in esbuild).
const names = [
  "theme-toggle",
  "menu-toggle",
  "docs-nav",
  "copy-button",
  "network-canvas",
  "live-preview",
  "scroll-reveal",
  "heart-burst",
];
const assets = {
  css: "/assets/site.css",
  islands: Object.fromEntries(names.map((name) => [name, `/assets/${name}.js`])),
};

let site: SiteModule;
let pages: { file: string; content: string }[] = [];
beforeAll(async () => {
  site = await loadSite();
  pages = site.renderSite({ docs, assets }).filter((f) => f.file.endsWith(".html"));
});

test("every page carries the CSP first in <head> and passes the CSP check", () => {
  assert.deepEqual(
    pages.map((p) => p.file).sort((a, b) => a.localeCompare(b)),
    [
      "404.html",
      "docs/api/index.html",
      "docs/api/install/index.html",
      "docs/index.html",
      "hosted/index.html",
      "index.html",
    ],
  );
  assert.match(pages.find((p) => p.file === "docs/index.html")?.content ?? "", /copy-button/);
  for (const { file, content } of pages) {
    assert.deepEqual(cspProblems(file, content), [], file);
    assert.ok(content.startsWith(`<!doctype html><html lang="en"><head>${cspMetaTag()}`), file);
    const charset = content.indexOf("<meta charSet");
    assert.ok(charset !== -1 && charset < 1024, file);
    const inline = /<script>([\s\S]*?)<\/script>/.exec(content)?.[1] ?? "";
    const hash = `sha256-${createHash("sha256").update(inline).digest("base64")}`;
    assert.equal(hash, themeScriptHash(), file);
  }
});

test("an unsafe link on a page fails the build and names the dist file", () => {
  const bad = docs.map((d) =>
    d.file === "docs/index.md" ? { ...d, html: '<p><a href="javascript:x">x</a></p>' } : d,
  );
  assert.throws(
    () => site.renderSite({ docs: bad, assets }),
    (e: unknown) =>
      e instanceof Error &&
      e.name === UnsafeLinkError.name &&
      e.message ===
        'docs/api/index.html: unsafe link a href="javascript:x": only http:, https:, mailto: and in-site links are allowed',
  );
});
