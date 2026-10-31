import { test } from "bun:test";
import assert from "node:assert/strict";
import { collectIds, collectRefs, decode, parseAttrs } from "./html-refs.ts";

test("parseAttrs follows the HTML tokenizer", () => {
  assert.deepEqual(parseAttrs(' id="a" ID="b"'), { id: "a" });
  assert.deepEqual(parseAttrs('/href="x"/rel=y'), { href: "x", rel: "y" });
  assert.deepEqual(parseAttrs(`a="1"b='2'c=3 d`), { a: "1", b: "2", c: "3", d: "" });
  assert.deepEqual(parseAttrs(' =x="1" k = v'), { "=x": "1", k: "v" });
  assert.deepEqual(parseAttrs(' a="1">b="2"'), { a: "1" });
  assert.deepEqual(parseAttrs(' a="open'), { a: "open" });
  assert.deepEqual(parseAttrs(" a= >"), { a: "" });
  const special = parseAttrs(' __proto__="x" constructor="y"');
  assert.equal(Object.getPrototypeOf(special), Object.prototype);
  assert.equal(Object.getOwnPropertyDescriptor(special, "__proto__")?.value, "x");
  assert.equal(Object.getOwnPropertyDescriptor(special, "constructor")?.value, "y");
});

test("names lowercase in ASCII only", () => {
  assert.deepEqual(parseAttrs(" KEY=1 HREF=2"), { Key: "1", href: "2" });
});

test("collectRefs and collectIds read every start tag", () => {
  const html = '<A/HREF="/a" href="/b"><img\tsrc=/i.png/><p id="x" id="y"></p></a><a href="/n">';
  assert.deepEqual(collectRefs(html), [
    { tag: "a", attr: "href", value: "/a" },
    { tag: "img", attr: "src", value: "/i.png/" },
  ]);
  assert.deepEqual([...collectIds(html)], ["x"]);
});

test("numeric references decode with or without a closing semicolon", () => {
  assert.equal(decode("a&#58;b"), "a:b");
  assert.equal(decode("a&#58b"), "a:b");
  assert.equal(decode("a&#0058b"), "a:b");
  assert.equal(decode("a&#x3A;b"), "a:b");
  assert.equal(decode("a&#X3a//b"), "a://b");
});

test("named references need their semicolon and decode only once", () => {
  assert.equal(decode("a&colon;b"), "a:b");
  assert.equal(decode("a&colonb"), "a&colonb");
  assert.equal(decode("&amp;#106;"), "&#106;");
  assert.equal(decode("&unknown;"), "&unknown;");
});

test("zero, surrogate and out-of-range numeric references become U+FFFD", () => {
  assert.equal(decode("&#0;"), "\uFFFD");
  assert.equal(decode("&#xD800;"), "\uFFFD");
  assert.equal(decode("&#x110000;"), "\uFFFD");
  assert.equal(decode(`&#${"9".repeat(400)};`), "\uFFFD");
});
