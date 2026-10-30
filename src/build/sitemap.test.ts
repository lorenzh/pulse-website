import { test } from "bun:test";
import assert from "node:assert/strict";
import { robotsTxt, sitemapXml } from "./sitemap.ts";

test("sitemap lists every page but 404.html", () => {
  const xml = sitemapXml("https://pulse.example", [
    "/",
    "/hosted/",
    "/docs/api/install/",
    "/404.html",
  ]);
  assert.match(xml, /<loc>https:\/\/pulse\.example\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/pulse\.example\/docs\/api\/install\/<\/loc>/);
  assert.doesNotMatch(xml, /404/);
  assert.equal(xml.match(/<url>/g)?.length, 3);
});

test("robots.txt allows all and names the sitemap", () => {
  assert.equal(
    robotsTxt("https://pulse.example"),
    "User-agent: *\nAllow: /\n\nSitemap: https://pulse.example/sitemap.xml\n",
  );
});
