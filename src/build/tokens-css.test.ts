import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { generateTokensCss, type Tokens } from "./tokens-css.ts";

const json = readFileSync("design/losoft-tokens.json", "utf8");
const tokens = JSON.parse(json) as Tokens;

test("the committed tokens.css matches the design JSON", () => {
  const css = readFileSync("src/styles/tokens.css", "utf8");
  assert.equal(css, generateTokensCss(tokens), "run npm run tokens");
});

test("every colour token is defined in light and dark", () => {
  const css = generateTokensCss(tokens);
  for (const t of tokens.color.tokens) {
    assert.ok(css.includes(`--${t.name}: ${t.value.light};`), `${t.name} light`);
    assert.ok(css.includes(`--${t.name}: ${t.value.dark};`), `${t.name} dark`);
  }
});

test("fluid sizes, spacing and radii are emitted", () => {
  const css = generateTokensCss(tokens);
  assert.match(css, /--fs-display: clamp\(3rem, 1\.6rem \+ 5\.6vw, 6rem\);/);
  assert.match(css, /--touch: 44px;/);
  assert.match(css, /--radius-pill: 999px;/);
  assert.match(css, /\.t-h1 \{[^}]*font-size: var\(--fs-h1\);/);
});

test("dark applies by media query unless the theme is set to light", () => {
  const css = generateTokensCss(tokens);
  assert.match(
    css,
    /@media \(prefers-color-scheme: dark\) \{\n {2}:root:not\(\[data-theme="light"\]\)/,
  );
  assert.match(css, /:root\[data-theme="dark"\]/);
});
