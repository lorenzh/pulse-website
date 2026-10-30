import assert from "node:assert/strict";
import { test } from "node:test";
import { absoluteUrl, headTags, pageMeta } from "./meta.ts";

const base = {
  title: "Quick start · pulse",
  description: "Run it.",
  siteUrl: "https://pulse.example/",
};

test("builds absolute canonical and og:url from the site URL", () => {
  const meta = pageMeta({ ...base, path: "/docs/api/install/" });
  assert.equal(meta.canonical, "https://pulse.example/docs/api/install/");
  assert.equal(meta.ogUrl, meta.canonical);
  assert.equal(absoluteUrl("https://x.test", "hosted/"), "https://x.test/hosted/");
});

test("/docs/ can point its canonical at the quick start page", () => {
  const meta = pageMeta({ ...base, path: "/docs/", canonicalPath: "/docs/api/install/" });
  assert.equal(meta.canonical, "https://pulse.example/docs/api/install/");
});

test("head tags have description, Open Graph and twitter card but no og:image", () => {
  const tags = headTags(pageMeta({ ...base, path: "/" }));
  const keys = tags.map((t) => t.name ?? t.property);
  assert.deepEqual(keys, [
    "description",
    "og:title",
    "og:description",
    "og:type",
    "og:url",
    "twitter:card",
  ]);
  assert.equal(tags.find((t) => t.name === "twitter:card")?.content, "summary");
});

test("the 404 page is noindex", () => {
  const tags = headTags(pageMeta({ ...base, path: "/404.html", noindex: true }));
  assert.deepEqual(tags.at(-1), { name: "robots", content: "noindex" });
});
