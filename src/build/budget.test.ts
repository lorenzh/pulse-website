import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  evaluatePage,
  fontFilesByFamily,
  gzipBytes,
  parseBudget,
  scriptClosure,
} from "./budget.ts";

const budget = { htmlBytes: 2000, cssBytes: 2000, jsBytes: 2000, maxFontFilesPerFamily: 2 };
const css =
  '@font-face{font-family:"Space Grotesk";src:url(/f/a.woff2)}@font-face{font-family:"Mono";src:url(/f/m.woff2)}@font-face{font-family:"Mono";src:url(/f/mi.woff2)}';
const files: Record<string, string> = {
  "/a.css": css,
  "/js/x.js": 'import{a}from"./chunk-1.js";a();',
  "/js/chunk-1.js": "export const a=()=>1;",
};
const read = (p: string): string | undefined => files[p];

test("gzip size is smaller than the input for repetitive text", () => {
  assert.ok(gzipBytes("a".repeat(1000)) < 100);
});

test("script closure follows chunk imports", () => {
  const html = '<html><script type="module" src="/js/x.js"></script></html>';
  assert.deepEqual(scriptClosure(html, read), ["/js/x.js", "/js/chunk-1.js"]);
});

test("a page without islands ships 0 JS", () => {
  const html = '<html><head><link rel="stylesheet" href="/a.css"></head><body>x</body></html>';
  const result = evaluatePage(html, budget, read, () => 100);
  assert.equal(result.usage.jsBytes, 0);
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.usage.fontFiles, { "Space Grotesk": 1, Mono: 2 });
  assert.equal(result.usage.fontBytes, 300);
});

test("limits are enforced per page", () => {
  const html = '<html><head><link rel="stylesheet" href="/a.css"></head><body>x</body></html>';
  const tight = { ...budget, htmlBytes: 1, cssBytes: 1, maxFontFilesPerFamily: 1 };
  const result = evaluatePage(html, tight, read, () => 1);
  assert.equal(result.problems.length, 3);
  assert.match(result.problems.join("\n"), /Mono: 2 font files/);
});

test("font files are grouped by family", () => {
  assert.deepEqual(fontFilesByFamily(css).Mono, ["/f/m.woff2", "/f/mi.woff2"]);
});

test("budget.json is validated", () => {
  assert.deepEqual(parseBudget({ ...budget }), budget);
  assert.throws(() => parseBudget({ htmlBytes: 1 }), /cssBytes/);
});
