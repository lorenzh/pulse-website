import { test } from "bun:test";
import assert from "node:assert/strict";
import { isSafeRef, isSafeUrl, UnsafeLinkError, unsafeRefs, urlScheme } from "./url-safety.ts";

const UNSAFE_URLS = [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  " javascript:alert(1)",
  "\u0001javascript:alert(1)",
  "java\tscript:alert(1)",
  "java\nscript:x",
  "data:text/html,<script>alert(1)</script>",
  "DATA:text/html,x",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
  "tel:+41000",
  // eslint-disable-next-line sonarjs/no-clear-text-protocols -- a scheme fixture, never fetched
  "ftp://x",
  "foo:bar",
  "blob:https://x/y",
  "java\u0001script:x",
  "foo bar:x",
  "&#106;avascript:x",
];

const SAFE_URLS = [
  "https://github.com/x",
  // eslint-disable-next-line sonarjs/no-clear-text-protocols -- a scheme fixture, never fetched
  "HTTP://x",
  "HTTPS://x",
  "mailto:a@b.c",
  "MAILTO:a@b.c",
  "install.md#with-npm",
  "../AGENTS.md",
  "/docs/",
  "#main",
  "?q=1",
  "//github.com/x",
  "./a:b.md",
  "/a:b",
  "",
  " https://x \n",
];

test("unsafe schemes are rejected, in any case and with controls or whitespace", () => {
  for (const url of UNSAFE_URLS) assert.equal(isSafeUrl(url), false, JSON.stringify(url));
});

test("http, https, mailto and in-site links are accepted", () => {
  for (const url of SAFE_URLS) assert.equal(isSafeUrl(url), true, JSON.stringify(url));
});

test("the scheme is the lowercased text before a first colon that precedes / ? #", () => {
  assert.equal(urlScheme("HTTPS://x"), "https");
  assert.equal(urlScheme("/a:b"), undefined);
  assert.equal(urlScheme("a?b:c"), undefined);
  assert.equal(urlScheme("a#b:c"), undefined);
  assert.equal(urlScheme("plain"), undefined);
  assert.equal(urlScheme("\u0000 Java\tScript:x "), "javascript");
});

test("srcset candidates are checked one by one", () => {
  assert.equal(isSafeRef({ tag: "img", attr: "srcset", value: "/a.png 1x, /b.png 2x" }), true);
  assert.equal(
    isSafeRef({ tag: "img", attr: "srcset", value: "/a.png 1x, javascript:x 2x" }),
    false,
  );
});

test("unsafeRefs finds unsafe values after decoding the attribute once", () => {
  const html = [
    '<a href="/ok/">ok</a>',
    '<a href="mailto:a@b.c">m</a>',
    '<a href="&#106;avascript:alert(1)">1</a>',
    '<a href="&#x6A;avascript:x">2</a>',
    '<a href="javascript&colon;x">3</a>',
    '<a href="java&Tab;script:x">4</a>',
    '<a href="&amp;#106;avascript:x">5</a>',
    '<form action="data:text/html,x"></form>',
  ].join("");
  assert.deepEqual(
    unsafeRefs(html).map((r) => `${r.tag} ${r.attr}=${r.value}`),
    [
      "a href=javascript:alert(1)",
      "a href=javascript:x",
      "a href=javascript:x",
      "a href=java\tscript:x",
      "a href=&#106;avascript:x",
      "form action=data:text/html,x",
    ],
  );
});

test("unsafeRefs decodes numeric references without a closing semicolon, like the browser", () => {
  const html = [
    '<a href="javascript&#58alert(1)">1</a>',
    '<a href="javascript&#0058alert(1)">2</a>',
    '<a href="javascript&#x3A//%0aalert(1)">3</a>',
    '<a href="&#106avascript:x">4</a>',
  ].join("");
  assert.deepEqual(
    unsafeRefs(html).map((r) => `${r.tag} ${r.attr}=${r.value}`),
    [
      "a href=javascript:alert(1)",
      "a href=javascript:alert(1)",
      "a href=javascript://%0aalert(1)",
      "a href=javascript:x",
    ],
  );
});

test("unsafeRefs reads duplicate attributes and / separators like the browser", () => {
  const html = [
    '<a href="javascript:alert(1)" href="/">1</a>',
    '<a/href="javascript:alert(2)">2</a>',
    '<a title="t"href="javascript:alert(3)">3</a>',
    '<a href="/" href="javascript:alert(4)">4</a>',
  ].join("");
  assert.deepEqual(
    unsafeRefs(html).map((r) => `${r.tag} ${r.attr}=${r.value}`),
    ["a href=javascript:alert(1)", "a href=javascript:alert(2)", "a href=javascript:alert(3)"],
  );
});

test("the error is named", () => {
  assert.equal(new UnsafeLinkError("x").name, "UnsafeLinkError");
});
