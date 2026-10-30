import { test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hoverOutsideMedia } from "./hover-scan.ts";

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

test("sections use --section-space and have no separator", () => {
  const components = readFileSync("src/styles/components.css", "utf8");
  const tokensCss = readFileSync("src/styles/tokens.css", "utf8");
  assert.match(tokensCss, /--section-space: clamp\(64px, 8vw, 128px\);/);
  assert.match(tokensCss, /--ease: cubic-bezier\(0\.2, 0, 0, 1\);/);
  assert.match(components, /main > section \{\s*padding: calc\(var\(--section-space\) \/ 2\)/);
  assert.doesNotMatch(components, /\.band\s*\{/);
});

test("reduced motion switches off every animation and transition", () => {
  const base = readFileSync("src/styles/base.css", "utf8");
  const block = base.slice(base.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(block, /animation: none !important/);
  assert.match(block, /transition: none !important/);
});
