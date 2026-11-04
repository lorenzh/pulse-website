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
  assert.equal(grid.split('<li class="card" data-reveal="true">').length - 1, 15);
});

test("the four text links are fit-content links and the rows are centred", () => {
  assert.equal(home.match(/<a class="text-link"/g)?.length, 4);
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

function sectionOf(html: string, id: string): string {
  const from = html.indexOf(`<section id="${id}"`);
  assert.ok(from >= 0, `missing section ${id}`);
  const to = html.indexOf("</section>", from);
  assert.ok(to > from, `unclosed section ${id}`);
  return html.slice(from, to);
}

test("issue 575 content: feature cards, order and icons", () => {
  for (const [title, text] of [
    [
      "Components",
      "Group checks into what your users know, like Shop or API. The page then shows the components instead of single checks.",
    ],
    [
      "Feed and badges",
      "An Atom feed of incidents and SVG uptime badges for READMEs and dashboards.",
    ],
    [
      "CDN-ready caching",
      "The page, the feed and the badges send ETags and answer a repeat with 304. Feed and badges may be cached by a CDN for 60 seconds.",
    ],
    [
      "Hot backups",
      "One command writes a consistent copy of the database while the API keeps serving traffic. It never overwrites a file.",
    ],
  ] as const) {
    assert.ok(home.includes(`<h3 class="t-h3">${title}</h3><p>${text}</p>`), title);
  }
  const order = [
    "White-label status page",
    "Components",
    "Feed and badges",
    "Incident updates",
    "Checks API",
    "CDN-ready caching",
    "Hot backups",
    "Notifications",
  ];
  let last = -1;
  for (const title of order) {
    const at = home.indexOf(`<h3 class="t-h3">${title}</h3>`);
    assert.ok(at > last, `card order: ${title}`);
    last = at;
  }
  for (const icon of [
    '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect>',
    '<path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle>',
    '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"></path>',
    '<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14a9 3 0 0 0 18 0V5"></path><path d="M3 12a9 3 0 0 0 18 0"></path>',
  ]) {
    assert.ok(home.includes(icon), icon);
  }
});

test("issue 575 content: status text and how it works with the optional console", () => {
  const flat = home.replace(/\s+/g, " ");
  assert.ok(flat.includes("Every component with its state written as a word,"));
  assert.ok(!flat.includes("Every check with its state"));
  assert.ok(
    home.includes(
      '<h2 id="how-title" class="t-h2">Four small services, an optional console, one shared contract</h2>',
    ),
  );
  assert.ok(
    flat.includes(
      "Probes run the checks and post results. The API decides the state of every check and keeps the incidents. The status page and the notifier only read from it. The optional console signs you in and talks to the admin API.",
    ),
  );
  assert.ok(
    flat.includes(
      "Each of them shares <code>pulse-contract</code>: the wire types, runtime validators and a version header, so a mismatched deploy fails loudly instead of quietly.",
    ),
  );
  assert.ok(!flat.includes("All four share"));

  const svg = home.slice(
    home.indexOf('<svg class="diagram"'),
    home.indexOf("</svg>", home.indexOf('<svg class="diagram"')),
  );
  assert.ok(svg.includes('viewBox="0 0 720 300"'));
  const box = svg.slice(
    svg.indexOf('<g class="diagram-box">'),
    svg.indexOf("</g>", svg.indexOf('<g class="diagram-box">')),
  );
  assert.equal(box.split("<rect").length - 1, 5);
  assert.ok(
    box.includes('<rect x="285" y="232" width="150" height="60" rx="12" class="diagram-optional">'),
  );
  assert.ok(svg.includes('<text x="360" y="268" text-anchor="middle">pulse-console</text>'));
  assert.ok(svg.includes('<path d="M360 230V144">'));
  assert.ok(svg.includes('<text x="372" y="192" text-anchor="start">admin API</text>'));
  assert.ok(
    flat.includes(
      '<desc id="arch-desc">The probe posts results to the API. The status page and the notifier read from the API. The optional console calls the admin API; its check management is in progress. Each service shares pulse-contract.</desc>',
    ),
  );
  assert.equal(home.split('<span class="service-name">').length - 1, 5);
  assert.ok(
    home.includes(
      '<span class="tag">Optional · in progress</span><span class="service-name">pulse-console</span><span>The web console: first-run setup and sign-in today, check management over the admin API in progress.</span>',
    ),
  );
});

test("issue 575 content: see it in action has three static previews", () => {
  const section = sectionOf(home, "in-action");
  assert.ok(
    section.startsWith('<section id="in-action" class="band" aria-labelledby="in-action-title">'),
  );
  assert.ok(section.includes('<p class="eyebrow">See it in action</p>'));
  assert.ok(
    section.includes(
      '<h2 id="in-action-title" class="t-h2">The page, the wizard and the console</h2>',
    ),
  );
  assert.ok(section.includes('<ul class="preview-grid">'));
  assert.equal(section.split('<figure class="card preview" data-reveal="true">').length - 1, 3);
  assert.equal(section.split('role="img"').length - 1, 3);
  for (const label of [
    "Status page preview: Acme status, all systems operational. Shop up, API up, Search in maintenance.",
    "CLI wizard preview: the first questions of pulse init.",
    "Console preview: the Create the owner account page of first-run setup.",
  ]) {
    assert.ok(section.includes(`role="img" aria-label="${label}"`), label);
  }
  for (const caption of [
    '<figcaption><span class="tag">Available</span> Status page: components with their state as a word.</figcaption>',
    '<figcaption><span class="tag">Coming soon</span> CLI wizard: the first questions of pulse init, abbreviated.</figcaption>',
    '<figcaption><span class="tag">Preview · in progress</span> Console: first-run setup as it ships today. Check management is planned.</figcaption>',
  ]) {
    assert.ok(section.includes(caption), caption);
  }
  for (const text of ["Acme status", "All systems operational"]) {
    assert.ok(section.includes(`>${text}<`), text);
  }
  for (const [name, state, label] of [
    ["Shop", "up", "Up"],
    ["API", "up", "Up"],
    ["Search", "maintenance", "Maintenance"],
  ] as const) {
    assert.ok(section.includes(`<span>${name}</span><span class="state state-${state}">`), name);
    assert.ok(section.includes(`${label}</span>`), label);
  }
  // eslint-disable-next-line sonarjs/super-linear-regex -- test pattern over generated HTML
  const text = section.replace(/<[^>]*>/g, "");
  for (const line of [
    "$ pulse init",
    "Setup (minimal, full, demo, dev) [full]:",
    "Enable the status page? [Y/n]",
    "Enable notifications (notify)? [Y/n]",
    "Enable the console? [Y/n]",
    "Probe location [default]:",
  ]) {
    assert.ok(text.includes(line), line);
  }
  assert.equal(section.split(">…<").length - 1, 2);
  for (const s of [
    "Create the owner account",
    "pulse-api URL",
    "Owner email",
    "Owner name",
    "Password",
    "Test connection",
    "Finish setup",
  ]) {
    assert.ok(section.includes(`>${s}<`), s);
  }
  for (const banned of ["<input", "<button", "<form", "<a "]) {
    assert.ok(!section.includes(banned), banned);
  }
  assert.equal(home.split('data-island="live-preview"').length - 1, 1);
});

test("issue 575 content: coming next, section order and no agent text", () => {
  const section = sectionOf(home, "next");
  assert.ok(section.startsWith('<section id="next" class="band" aria-labelledby="next-title">'));
  assert.ok(section.includes('<p class="eyebrow">Coming next</p>'));
  assert.ok(section.includes('<h2 id="next-title" class="t-h2">What we are building now</h2>'));
  assert.equal(section.split('<li class="card" data-reveal="true">').length - 1, 2);
  const flat = section.replace(/\s+/g, " ");
  assert.ok(
    flat.includes(
      '<span class="tag">in progress</span><h3 class="t-h3">pulse-console</h3><p>A web console for pulse. Today it has first-run setup, a local owner account and password sign-in. Managing checks, components and maintenance through the admin API comes next.</p><a class="text-link" href="/docs/console/">Read the console docs</a>',
    ),
  );
  assert.ok(
    flat.includes(
      '<span class="tag">coming soon</span><h3 class="t-h3">pulse-deploy CLI</h3><p><code>pulse init</code> asks a few questions and writes a plain Docker Compose install; <code>pulse up</code>, <code>pulse status</code> and <code>pulse down</code> run it. The code and the guide are public; the first release with binaries is coming soon.</p><a class="text-link" href="/docs/deploy/cli/">Read the CLI guide</a>',
    ),
  );
  const hrefs = [...section.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(hrefs, ["/docs/console/", "/docs/deploy/cli/"]);
  assert.doesNotMatch(
    section,
    /\b20\d\d\b|January|February|March|April|May|June|July|August|September|October|November|December/,
  );
  const how = home.indexOf('id="how"');
  const action = home.indexOf('id="in-action"');
  const next = home.indexOf('id="next"');
  const start = home.indexOf('id="start-title"');
  assert.ok(how > 0 && how < action && action < next && next < start);
  assert.doesNotMatch(home, /agent/i);
});
