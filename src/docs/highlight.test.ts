import assert from "node:assert/strict";
import { test } from "node:test";
import { highlight } from "./highlight.ts";

function text(html: string): string {
  return (
    html
      // eslint-disable-next-line sonarjs/super-linear-regex -- test helper over highlighter output
      .replace(/<[^>]+>/g, "")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&")
      .replaceAll("&quot;", '"')
      .replaceAll("&#39;", "'")
  );
}

test("json keys, strings, numbers and keywords get their own classes", () => {
  const code = '{"id": "a", "n": 10, "ok": true}';
  const html = highlight(code, "json");
  assert.match(html, /<span class="tok-key">&quot;id&quot;<\/span>/);
  assert.match(html, /<span class="tok-string">&quot;a&quot;<\/span>/);
  assert.match(html, /<span class="tok-number">10<\/span>/);
  assert.match(html, /<span class="tok-keyword">true<\/span>/);
  assert.equal(text(html), code);
});

test("yaml keys, scalars and comments", () => {
  const code = '# note\nservices:\n  api:\n    port: 3000\n    name: "x" # tail';
  const html = highlight(code, "yaml");
  assert.match(html, /<span class="tok-comment"># note<\/span>/);
  assert.match(html, /<span class="tok-key">port<\/span>/);
  assert.match(html, /<span class="tok-number">3000<\/span>/);
  assert.equal(text(html), code);
});

test("bash comments, strings, flags and variables; # inside a word is kept", () => {
  const code = "curl -fsS 'http://x/#a' \"$HOME\" # call\necho a#b $PORT";
  const html = highlight(code, "sh");
  assert.match(html, /<span class="tok-comment"># call<\/span>/);
  assert.match(html, /<span class="tok-key">-fsS<\/span>/);
  assert.match(html, /<span class="tok-number">\$PORT<\/span>/);
  assert.equal(text(html), code);
});

test("unknown languages are escaped, never executed as HTML", () => {
  assert.equal(highlight("<b>&</b>", "ts"), "&lt;b&gt;&amp;&lt;/b&gt;");
  assert.equal(highlight("<b>", undefined), "&lt;b&gt;");
});
