import assert from "node:assert/strict";
import { before, test } from "node:test";
import { loadSite, type SiteModule } from "../build/load-site.ts";

let hosted = "";
before(async () => {
  const site: SiteModule = await loadSite();
  const files = site.renderSite({
    docs: [],
    assets: {
      css: "/assets/site.css",
      islands: {
        "theme-toggle": "/a.js",
        "menu-toggle": "/b.js",
        "docs-nav": "/c.js",
        "copy-button": "/d.js",
      },
    },
  });
  hosted = files.find((f) => f.file === "hosted/index.html")?.content ?? "";
});

test("the hosted page has no price, currency, status URL or form action", () => {
  assert.ok(hosted.length > 1000);
  assert.doesNotMatch(hosted, /[€$£]/);
  // eslint-disable-next-line sonarjs/super-linear-regex -- test pattern over generated HTML
  assert.doesNotMatch(hosted, /\d[\d.,]*\s*(?:EUR|USD)\b|\b(?:EUR|USD)\s*\d/i);
  assert.doesNotMatch(hosted, /status\.losoft\.dev/);
  assert.doesNotMatch(hosted, /<form[^>]*\saction=/);
  assert.doesNotMatch(hosted, /<form[^>]*\smethod=/);
  // eslint-disable-next-line sonarjs/super-linear-regex -- test pattern over generated HTML
  assert.doesNotMatch(hosted, /\d+(?:\.\d+)?\s?%/);
});

test("commercial facts are visibly marked placeholders", () => {
  for (const name of [
    "PRICE",
    "REGIONS",
    "TRIAL",
    "DATA_LOCATION",
    "OSS_TERMS",
    "STATUS_URL",
    "AVAILABILITY",
    "LIMIT",
  ]) {
    assert.ok(hosted.includes(`<mark class="placeholder">[${name}]</mark>`), name);
  }
  assert.match(hosted, /These details are not decided yet\./);
});

test("the waitlist is disabled and says nothing is sent", () => {
  assert.match(hosted, /Sign-up is not open yet\. Nothing you type is sent anywhere\./);
  assert.match(hosted, /<input[^>]*disabled/);
  assert.match(hosted, /<button[^>]*disabled/);
  assert.match(hosted, /Self-hosted/);
  assert.match(hosted, /MIT licence/);
});
