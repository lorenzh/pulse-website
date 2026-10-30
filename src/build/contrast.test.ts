import { test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { blend, contrastRatio, parseColour, type Rgba } from "./contrast.ts";
import type { Tokens } from "./tokens-css.ts";

const tokens = JSON.parse(readFileSync("design/losoft-tokens.json", "utf8")) as Tokens;

function colour(name: string, theme: "light" | "dark"): Rgba {
  const token = tokens.color.tokens.find((t) => t.name === name);
  assert.ok(token, name);
  return parseColour(token.value[theme]);
}

test("contrast of black on white is 21", () => {
  assert.equal(Math.round(contrastRatio(parseColour("#000000"), parseColour("#ffffff"))), 21);
  assert.throws(() => parseColour("red"), /unsupported/);
});

test("worst case over the canvas: text stays >= 4.5:1 where every canvas layer overlaps", () => {
  for (const theme of ["light", "dark"] as const) {
    const bg = colour("bg", theme);
    // Worst case: link, node and a pulse of either colour painted over each other.
    for (const pulse of ["net-pulse", "net-pulse2"]) {
      const stacked = [
        colour("net-line", theme),
        colour("net-node", theme),
        colour(pulse, theme),
      ].reduce((under, layer) => blend(layer, under), bg);
      for (const text of ["text", "lead", "muted", "accent-text"]) {
        const ratio = contrastRatio(colour(text, theme), stacked);
        assert.ok(ratio >= 4.5, `${theme} ${text} on ${pulse}: ${ratio.toFixed(2)}`);
      }
    }
  }
});

test("outline button: the label is readable at every frame in both themes", () => {
  for (const theme of ["light", "dark"] as const) {
    // At rest and while the curtain moves, each glyph is --text on --bg or --on-strong on --accent.
    const rest = contrastRatio(colour("text", theme), colour("bg", theme));
    const covered = contrastRatio(colour("on-strong", theme), colour("accent", theme));
    assert.ok(rest >= 4.5, `${theme} text on bg ${rest.toFixed(2)}`);
    assert.ok(covered >= 4.5, `${theme} on-strong on accent ${covered.toFixed(2)}`);
  }
});
