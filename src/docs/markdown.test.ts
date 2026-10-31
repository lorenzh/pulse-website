import { test } from "bun:test";
import assert from "node:assert/strict";
import { renderMarkdown, truncate } from "./markdown.ts";

const keep = (href: string) => ({ href, isExternal: href.startsWith("http") });

test("title is the first h1 and is not repeated in the body", () => {
  const doc = renderMarkdown("# Install\n\nRun it.\n\n## With npm\n", keep);
  assert.equal(doc.title, "Install");
  assert.doesNotMatch(doc.html, /<h1/);
  assert.match(doc.html, /<h2 id="with-npm">With npm<\/h2>/);
});

test("headings get unique ids, duplicates get a -1 suffix", () => {
  const doc = renderMarkdown("# T\n\n## Example\n\n### Example\n\n## `code` head\n", keep);
  assert.deepEqual(
    doc.headings.map((h) => h.id),
    ["t", "example", "example-1", "code-head"],
  );
});

test("raw HTML is escaped, not rendered", () => {
  const doc = renderMarkdown(
    "# T\n\n<script>alert(1)</script>\n\nA <b>bold</b> word and <img src=x onerror=y>.\n",
    keep,
  );
  assert.doesNotMatch(doc.html, /<script|<b>|<img/);
  assert.match(doc.html, /&lt;script&gt;/);
});

test("tables sit in a focusable, labelled scroll region", () => {
  const doc = renderMarkdown("# T\n\n| Name | Value |\n| --- | --- |\n| a | 1 |\n", keep);
  assert.match(
    doc.html,
    /<div class="table-scroll" tabindex="0" role="region" aria-label="Table: Name"><table>/,
  );
});

test("code blocks are highlighted and labelled; only command blocks get a copy slot", () => {
  const doc = renderMarkdown('# T\n\n```json\n{"a": 1}\n```\n\n```sh\necho <x>\n```\n', keep);
  assert.match(doc.html, /aria-label="JSON"/);
  assert.match(doc.html, /tok-key/);
  assert.match(doc.html, /aria-label="Shell commands"/);
  assert.match(doc.html, /echo &lt;x&gt;/);
  assert.equal(doc.html.match(/data-island="copy-button"/g)?.length, 1);
  assert.match(doc.html, /data-copy="echo &lt;x&gt;"/);
});

test("copy slots hold the commands without prompt, output or comments", () => {
  const doc = renderMarkdown(
    "# T\n\n```bash\n$ curl localhost\n[]\n$ ls # list\n```\n\n```text\n$ ls\n```\n\n```console\nStarted\n```\n\n```\nplain\n```\n",
    keep,
  );
  assert.equal(doc.html.match(/data-island="copy-button"/g)?.length, 1);
  assert.match(doc.html, /data-copy="curl localhost\nls # list"/);
  assert.equal(doc.html.match(/has-copy/g)?.length, 1);
});

test("a shell-tagged block that only shows an HTTP response gets no copy slot", () => {
  const doc = renderMarkdown(
    '# T\n\n```bash\nHTTP/1.1 200 OK\nContent-Type: application/json\n\n{"status":"ok"}\n```\n\n```sh\ncurl localhost\n```\n',
    keep,
  );
  assert.equal(doc.html.match(/data-island="copy-button"/g)?.length, 1);
  assert.match(doc.html, /data-copy="curl localhost"/);
});

test("links go through the resolver; external ones get rel=noopener", () => {
  const doc = renderMarkdown(
    "# T\n\n[a](x.md) [b](https://example.com) ![alt](pic.png)\n",
    (href) => ({
      href: href === "x.md" ? "/docs/x/" : href,
      isExternal: href.startsWith("http"),
    }),
  );
  assert.match(doc.html, /<a href="\/docs\/x\/">a<\/a>/);
  assert.match(doc.html, /<a href="https:\/\/example\.com" rel="noopener">b<\/a>/);
  assert.match(doc.html, /<a href="pic\.png">alt<\/a>/);
  assert.doesNotMatch(doc.html, /<img/);
});

test("blockquotes with Warning or Note get a callout class; tasks get a text alternative", () => {
  const doc = renderMarkdown(
    "# T\n\n> **Warning** tokens are public\n\n- [x] done\n- [ ] open\n",
    keep,
  );
  assert.match(doc.html, /callout callout-warning/);
  assert.match(doc.html, /aria-label="Done"/);
  assert.match(doc.html, /aria-label="Not done"/);
  assert.doesNotMatch(doc.html, /<input/);
});

test("description is the first paragraph as text, cut at 160 characters", () => {
  const long = `${"word ".repeat(60)}end`;
  const doc = renderMarkdown(`# T\n\nShort **bold** [link](x.md) text.\n\n${long}\n`, keep);
  assert.equal(doc.description, "Short bold link text.");
  assert.ok(renderMarkdown(`# T\n\n${long}\n`, keep).description.length <= 160);
  assert.match(renderMarkdown(`# T\n\n${long}\n`, keep).description, /…$/);
  assert.equal(renderMarkdown("# T\n", keep).description, "");
  assert.equal(truncate("short", 160), "short");
});

test("a block in a prototype-chain language renders as plain code", () => {
  for (const name of Object.getOwnPropertyNames(Object.prototype)) {
    const { html } = renderMarkdown(`\`\`\`${name}\n<b>x</b>\n\`\`\`\n`, keep);
    assert.match(html, /aria-label="Code"/, name);
    assert.ok(html.includes("&lt;b&gt;x&lt;/b&gt;"), name);
    assert.ok(!html.includes("<b>"), name);
  }
});
