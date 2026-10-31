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

test("version 28 content: hero, feature cards, icons, architecture and sample", () => {
  const flat = home.replace(/\s+/g, " ");
  assert.ok(
    flat.includes(
      "pulse checks HTTP endpoints, TLS certificates, ports, DNS, domains and cron jobs from several locations, decides by quorum, and keeps a calm public status page. Incidents reach Slack, Teams, email or a signed webhook. Self-hosted with one Docker Compose file.",
    ),
  );
  assert.ok(!flat.includes("email, a webhook or a file"));

  assert.ok(home.includes('<h3 class="t-h3">TLS, TCP, DNS and domains</h3>'));
  assert.ok(
    home.includes(
      "<p>Certificate and domain expiry, open ports and DNS records, next to every HTTP endpoint.</p>",
    ),
  );
  assert.ok(!home.includes("TLS certificates</h3>"));

  const cards = [
    [
      "White-label status page",
      "Your name, logo, colours and fonts. Light and dark, accessible, works without tracking.",
    ],
    [
      "Incident updates",
      "Post what you know, from investigating to resolved. The page, the feed and every channel follow.",
    ],
    [
      "Latency and SLOs",
      "Response-time percentiles per HTTP check and availability objectives with an error budget.",
    ],
    [
      "Checks API",
      "Change checks, components and maintenance over an admin API. No restart, no lost edits.",
    ],
    [
      "Notifications",
      "Slack, Microsoft Teams, email, webhooks (optionally HMAC-signed) and a file, with reminders while an incident stays open.",
    ],
  ] as const;
  let last = -1;
  for (const [title, text] of cards) {
    const at = home.indexOf(`<h3 class="t-h3">${title}</h3><p>${text}</p>`);
    assert.ok(at > last, `card order: ${title}`);
    last = at;
  }

  for (const path of [
    '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path><path d="M8 12h.01M12 12h.01M16 12h.01"></path>',
    '<path d="M12 20V10M18 20V4M6 20v-4"></path>',
    '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"></path>',
    '<path d="m19 9-5 5-4-4-3 3"></path>',
  ]) {
    assert.ok(home.includes(path), path);
  }

  assert.ok(
    home.includes(
      "Runs HTTP, TLS, TCP, DNS and domain checks, reloads them from the API and buffers results while it is away.",
    ),
  );
  assert.ok(
    home.includes(
      "Stores results in SQLite, applies quorum and maintenance, rolls checks up into components, opens and resolves incidents, takes heartbeat pings and admin changes without a restart.",
    ),
  );
  assert.match(home, /&quot;availabilityTarget&quot;/);

  const grid = home.slice(
    home.indexOf('<ul class="feature-grid">'),
    home.indexOf("</ul>", home.indexOf('<ul class="feature-grid">')),
  );
  assert.equal(grid.split('<li class="card" data-reveal="true">').length - 1, 11);
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
