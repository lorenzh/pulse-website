import { beforeAll, test } from "bun:test";
import assert from "node:assert/strict";
import { loadSite, type SiteModule } from "../build/load-site.ts";

let home = "";
let docs = "";
beforeAll(async () => {
  const site: SiteModule = await loadSite();
  // Kept in sync with ISLAND_ENTRIES in src/build/assets.ts (importing it would pull in esbuild).
  const names = [
    "theme-toggle",
    "menu-toggle",
    "docs-nav",
    "copy-button",
    "network-canvas",
    "live-preview",
    "scroll-reveal",
    "heart-burst",
  ];
  const islands = Object.fromEntries(names.map((name) => [name, `/${name}.js`]));
  const files = site.renderSite({ docs: [], assets: { css: "/assets/site.css", islands } });
  home = files.find((f) => f.file === "index.html")?.content ?? "";
  docs = files.find((f) => f.file === "404.html")?.content ?? "";
});

test("version 27 content: probe token, quorum wording and privacy", () => {
  assert.match(home, /<code>openssl rand -hex 32<\/code>/);
  assert.match(home, /<code>PULSE_PROBE_TOKEN<\/code> in <code>\.env<\/code>/);
  assert.match(
    home,
    /With two or more locations reporting, a check is down only when at least two see it down\./,
  );
  assert.match(home, /Only check targets \(URLs\) and error details\s+stay private by default\./);
  assert.match(home, /Components group checks, and the page shows components\./);
  assert.match(home, /&quot;name&quot;/);
  assert.match(home, /&quot;secret&quot;/);
});

test("the two text links are fit-content links and the rows are centred", () => {
  assert.equal(home.match(/<a class="text-link"/g)?.length, 2);
  assert.match(home, /Read the configuration guide/);
  assert.match(home, /Theming and white label/);
});

test("the status preview has two states in one cell and only one is exposed", () => {
  const states = home.match(/<div class="mock-state"[^>]*>/g) ?? [];
  assert.equal(states.length, 2);
  assert.equal(states.filter((s) => s.includes('aria-hidden="true"')).length, 1);
  assert.match(home, /data-island="live-preview"/);
});

test("the home page has the canvas, the scroll-in slot and revealable items", () => {
  assert.match(home, /<canvas class="net-canvas" aria-hidden="true" data-island="network-canvas">/);
  assert.match(home, /data-island="scroll-reveal"/);
  assert.ok((home.match(/data-reveal="true"/g) ?? []).length >= 8);
  assert.doesNotMatch(home, /copy-button|heart-burst/);
  assert.doesNotMatch(docs, /network-canvas|data-reveal/);
});

test("the header lists the navigation, then the button, then the theme toggle", () => {
  const header = home.slice(home.indexOf("<header"), home.indexOf("</header>"));
  const nav = header.indexOf('id="site-nav"');
  const button = header.indexOf('class="hdr-gh"');
  const toggle = header.indexOf('data-island="theme-toggle"');
  assert.ok(nav > 0 && nav < button && button < toggle);
  assert.match(
    header,
    /<a class="btn btn-secondary"[^>]*>.*<span class="fill" aria-hidden="true">/,
  );
});

test("no section has a separator rule and no hover rule sits outside hover media", () => {
  assert.doesNotMatch(home, /<hr/);
});
