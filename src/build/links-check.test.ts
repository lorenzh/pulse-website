import { test } from "bun:test";
import assert from "node:assert/strict";
import { checkLinks, pageUrl } from "./links-check.ts";

const page = (body: string, head = "") =>
  `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;

function run(
  pages: Record<string, string>,
  files: string[] = [],
  css: Record<string, string> = {},
) {
  return checkLinks(
    new Map(Object.entries(pages)),
    (f) => files.includes(f),
    (f) => css[f],
  );
}

test("page URLs", () => {
  assert.equal(pageUrl("index.html"), "/index.html".replace("index.html", ""));
  assert.equal(pageUrl("docs/api/index.html"), "/docs/api/");
  assert.equal(pageUrl("404.html"), "/404.html");
});

test("valid internal links, fragments and counted GitHub links pass", () => {
  const report = run({
    "index.html": page(
      '<a href="/hosted/#plans">h</a><a href="/docs/">d</a><a href="https://github.com/lorenzh/x">g</a><a href="#top">t</a>',
    ),
    "hosted/index.html": page('<h2 id="plans">P</h2>'),
    "docs/index.html": page("<p>docs</p>"),
  });
  assert.deepEqual(report.problems, []);
  assert.equal(report.githubLinks, 1);
  assert.equal(report.internalLinks, 3);
});

test("a dangling link and a missing fragment fail", () => {
  const report = run({
    "index.html": page('<a href="/nope/">x</a><a href="/hosted/#gone">y</a>'),
    "hosted/index.html": page('<h2 id="plans">P</h2>'),
  });
  assert.equal(report.problems.length, 2);
  assert.match(report.problems.join("\n"), /\/nope\/.*does not resolve/);
  assert.match(report.problems.join("\n"), /no element with id "gone"/);
});

test("references to another origin fail (failing fixture)", () => {
  const report = run({
    "index.html": page(
      '<img src="https://cdn.test/a.png"><script src="//x.test/a.js"></script><form action="https://x.test/send"></form><a href="https://example.com/ok">ok</a>',
      '<link rel="stylesheet" href="https://fonts.test/a.css"><link rel="canonical" href="https://pulse.example/">',
    ),
  });
  assert.equal(report.problems.length, 4);
  assert.equal(report.externalLinks, 2);
});

test("CSS @import and url() to another origin fail; missing local font fails", () => {
  const report = run(
    { "index.html": page("<p>x</p>", '<link rel="stylesheet" href="/assets/site.css">') },
    ["assets/site.css", "assets/fonts/a.woff2"],
    {
      "assets/site.css":
        '@import "https://x.test/a.css";@font-face{src:url(/assets/fonts/a.woff2)}@font-face{src:url(/assets/fonts/missing.woff2)}.a{background:url(https://x.test/b.png)}',
    },
  );
  assert.equal(report.problems.length, 3);
});

test("inline style url() to another origin fails", () => {
  const report = run({
    "index.html": page('<div style="background:url(https://x.test/a.png)"></div>'),
  });
  assert.equal(report.problems.length, 1);
});

const UNSAFE_HREFS = [
  "javascript:alert(1)",
  " JAVASCRIPT:x",
  "&#106;avascript:x",
  "&#x6A;avascript:x",
  "javascript&colon;x",
  "java&Tab;script:x",
  "&amp;#106;avascript:x",
  "javascript&#58alert(1)",
  "javascript&#0058alert(1)",
  "javascript&#x3A//%0aalert(1)",
  "tel:+1",
  "data:text/html,x",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
  // eslint-disable-next-line sonarjs/no-clear-text-protocols -- a scheme fixture, never fetched
  "ftp://x",
  "foo:bar",
  "blob:https://x/y",
];

test("each unsafe scheme is one unsafe-link problem, not a dangling link", () => {
  for (const href of UNSAFE_HREFS) {
    const report = run({ "index.html": page(`<a href="${href}">x</a>`) });
    assert.equal(report.problems.length, 1, href);
    assert.match(report.problems[0] ?? "", /^index\.html: unsafe link scheme in a href="/, href);
    assert.equal(report.internalLinks + report.externalLinks, 0, href);
  }
});

/** Anchors the browser reads as a javascript: link although the tag is unusual. */
const UNSAFE_ANCHORS = [
  '<a href="javascript:alert(1)" href="/">x</a>',
  '<a/href="javascript:alert(1)">x</a>',
  '<a title="t"href="javascript:alert(1)">x</a>',
  "<A HREF=javascript:alert(1)>x</a>",
  "<a\nhref\n=\n'javascript:alert(1)'>x</a>",
];

test("the tag is read like the browser: first duplicate wins, / separates attributes", () => {
  for (const anchor of UNSAFE_ANCHORS) {
    const report = run({ "index.html": page(anchor) });
    assert.equal(report.problems.length, 1, anchor);
    assert.match(report.problems[0] ?? "", /unsafe link scheme in a href="javascript:/, anchor);
  }
  const control = run({ "index.html": page('<a href="/" / href="javascript:x">x</a>') });
  assert.deepEqual(control.problems, []);
});

test("an unsafe srcset candidate or form action is reported", () => {
  const report = run({
    "index.html": page(
      '<img srcset="/a.png 1x, javascript:x 2x"><form action="data:text/html,x"></form>',
    ),
  });
  assert.equal(report.problems.length, 2);
  assert.match(report.problems.join("\n"), /unsafe link scheme in img srcset=/);
  assert.match(report.problems.join("\n"), /unsafe link scheme in form action="data:/);
});

test("mailto links pass and count as external links", () => {
  const report = run({
    "index.html": page('<a href="mailto:a@b.c">m</a><a href="MAILTO:x@y.z">n</a>'),
  });
  assert.deepEqual(report.problems, []);
  assert.equal(report.externalLinks, 2);
  assert.equal(report.internalLinks, 0);
});
