import { test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildIslands, buildStatic } from "./assets.ts";
import { hoverOutsideMedia, sectionBorderRules } from "./hover-scan.ts";
import { loadSite } from "./load-site.ts";

test("a :hover rule inside @media (hover: hover) passes, outside it is reported", () => {
  const css = "a:hover{x:1}@media (hover:hover){b:hover{x:1}}@media (min-width:1px){c:hover{x:2}}";
  assert.deepEqual(hoverOutsideMedia(css), ["a:hover", "c:hover"]);
});

test("nested media blocks and comments are handled", () => {
  const css =
    "/* a:hover */ @media (hover: hover) { @media (min-width: 1px) { .x:hover { y: 1 } } }";
  assert.deepEqual(hoverOutsideMedia(css), []);
});

test("every :hover selector of the site stylesheets sits inside a hover media block", () => {
  for (const file of ["base", "components", "docs"]) {
    const css = readFileSync(`src/styles/${file}.css`, "utf8");
    assert.deepEqual(hoverOutsideMedia(css), [], file);
  }
});

test("a border on a section subject is reported, borders inside sections are not", () => {
  const css =
    "main>section{padding:1px}.band{border-top:1px solid red}.band .row{border-bottom:1px solid}" +
    "#faq,.x{border:0}section+section{border-bottom:1px solid}.hero{border-top:none}";
  assert.deepEqual(sectionBorderRules(css, [".band", "#faq", ".hero"]), [
    ".band",
    "section+section",
  ]);
});

// Builds the stylesheet and islands as `bun run build` does, renders Home and Hosted with them,
// and checks the built CSS against the sections those pages actually render.
test("built CSS: no border between top-level sections, every :hover inside hover media", async () => {
  const dist = await mkdtemp(path.join(tmpdir(), "css-"));
  try {
    const assets = {
      css: await buildStatic(process.cwd(), dist),
      islands: await buildIslands(process.cwd(), dist),
    };
    const site = await loadSite();
    const pages = site
      .renderSite({ docs: [], assets })
      .filter((f) => f.file === "index.html" || f.file === "hosted/index.html");
    assert.equal(pages.length, 2);
    const marks = new Set<string>();
    for (const page of pages) {
      const main = page.content.slice(page.content.indexOf("<main"));
      for (const [, attrs = ""] of main.matchAll(/<section([^>]*)>/g)) {
        for (const cls of /class="([^"]*)"/.exec(attrs)?.[1]?.split(/\s+/) ?? [])
          marks.add(`.${cls}`);
        const id = /id="([^"]*)"/.exec(attrs)?.[1];
        if (id) marks.add(`#${id}`);
      }
    }
    assert.ok(marks.has(".band"), "Home and Hosted render .band sections");
    const css = await readFile(path.join(dist, assets.css), "utf8");
    assert.deepEqual(sectionBorderRules(css, [...marks]), []);
    assert.deepEqual(hoverOutsideMedia(css), []);
  } finally {
    await rm(dist, { recursive: true, force: true });
  }
});

test("sections use --section-space", () => {
  const components = readFileSync("src/styles/components.css", "utf8");
  const tokensCss = readFileSync("src/styles/tokens.css", "utf8");
  assert.match(tokensCss, /--section-space: clamp\(64px, 8vw, 128px\);/);
  assert.match(tokensCss, /--ease: cubic-bezier\(0\.2, 0, 0, 1\);/);
  assert.match(components, /main > section \{\s*padding: calc\(var\(--section-space\) \/ 2\)/);
});

test("reduced motion switches off every animation and transition", () => {
  const base = readFileSync("src/styles/base.css", "utf8");
  const block = base.slice(base.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(block, /animation: none !important/);
  assert.match(block, /transition: none !important/);
});
