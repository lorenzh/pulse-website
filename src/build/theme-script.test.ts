import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { themeScriptHash } from "./theme-hash.ts";
import { THEME_SCRIPT } from "./theme-script.ts";

function run(stored: string | null | "throws"): {
  attrs: Record<string, string>;
  classes: string[];
} {
  const attrs: Record<string, string> = {};
  const classes: string[] = [];
  const sandbox = {
    document: {
      documentElement: {
        classList: { add: (c: string) => classes.push(c) },
        setAttribute: (k: string, v: string) => {
          attrs[k] = v;
        },
      },
    },
    localStorage: {
      getItem: (): string | null => {
        if (stored === "throws") throw new Error("blocked");
        return stored;
      },
    },
  };
  // eslint-disable-next-line sonarjs/code-eval -- runs our own constant script in a vm sandbox with fake globals
  runInNewContext(THEME_SCRIPT, sandbox);
  return { attrs, classes };
}

test("a stored dark or light choice is applied before paint", () => {
  assert.deepEqual(run("dark").attrs, { "data-theme": "dark" });
  assert.deepEqual(run("light").attrs, { "data-theme": "light" });
});

test("nothing stored, an unknown value or blocked storage leave the media query in charge", () => {
  assert.deepEqual(run(null).attrs, {});
  assert.deepEqual(run("purple").attrs, {});
  const blocked = run("throws");
  assert.deepEqual(blocked.attrs, {});
  assert.deepEqual(blocked.classes, ["js"]);
});

test("the script hash is stable for the fixed script", () => {
  assert.match(themeScriptHash(), /^sha256-[A-Za-z0-9+/]{43}=$/);
  assert.equal(themeScriptHash(), themeScriptHash());
});
