import { test } from "bun:test";
import assert from "node:assert/strict";
import { decode } from "./html-refs.ts";

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
