import { beforeAll, test } from "bun:test";
import assert from "node:assert/strict";
import { loadSite, type SiteModule } from "../build/load-site.ts";

let hosted = "";
beforeAll(async () => {
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
        "network-canvas": "/e.js",
        "live-preview": "/f.js",
        "scroll-reveal": "/g.js",
        "heart-burst": "/h.js",
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
  // Kept in sync with PLACEHOLDERS in hosted.tsx (a .tsx file cannot be imported unbuilt).
  for (const name of [
    "PRICE",
    "REGIONS",
    "TRIAL",
    "DATA_LOCATION",
    "OSS_TERMS",
    "STATUS_URL",
    "AVAILABILITY",
    "LIMIT",
    "BACKUPS",
    "NETWORK_INDEPENDENCE",
    "OPERATION",
    "PARITY",
    "DISCOUNT",
    "REGION",
    "BACKUP REGION",
    "RETENTION",
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

function between(html: string, start: RegExp, end: string): string {
  const from = html.search(start);
  assert.ok(from >= 0, `missing ${start}`);
  const to = html.indexOf(end, from);
  assert.ok(to > from, `missing ${end}`);
  return html.slice(from, to);
}

test("every hosted promise carries a placeholder", () => {
  const mark = '<mark class="placeholder">[';
  const cells: string[] = [];

  const body = between(hosted, /<tbody>/, "</tbody>");
  for (const row of body.split("<tr>").slice(1)) {
    const tds = [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => m[1] ?? "");
    assert.equal(tds.length, 2);
    cells.push(tds[1] ?? "");
  }
  assert.ok(cells.length >= 6, "comparison rows");

  const included = between(hosted, /<ul class="feature-grid">/, "</ul>");
  const cards = included.split('<li class="card" data-reveal="true">').slice(1);
  assert.ok(cards.length >= 4, "included cards");
  cells.push(...cards);

  const plans = between(hosted, /<ul class="plan-grid">/, '<div id="oss"');
  const planItems = plans
    .split(/<li class="card plan(?: plan-featured)?" data-reveal="true">/)
    .slice(1);
  let items = 0;
  for (const plan of planItems) {
    if (!plan.includes('<h3 class="t-h3">Self-hosted</h3>')) {
      const lis = plan.split('<ul class="plan-items">')[1]?.split("</ul>")[0] ?? "";
      for (const li of lis.split("<li>").slice(1)) {
        cells.push(li);
        items++;
      }
    }
  }
  assert.ok(items >= 12, "plan items");

  for (const cell of cells) {
    assert.ok(cell.includes(mark), `unmarked hosted promise: ${cell.slice(0, 120)}`);
  }
});

test("the plans carry the planned-offer note and planned tags, and only placeholders", () => {
  const plans = hosted.slice(hosted.indexOf('id="plans"'));
  assert.ok(plans.indexOf("Planned offer, details not final") < plans.indexOf("plan-grid"));
  assert.ok((hosted.match(/<span class="tag plan-tag">planned<\/span>/g) ?? []).length >= 3);
  assert.match(hosted, /<span class="tag plan-tag">placeholder<\/span>/);
  // Every place for a region, backup region, retention and discount is a placeholder token.
  assert.doesNotMatch(hosted, /\b\d+\s?(?:days?|months?|years?|GB|TB)\b/i);
});

test("the open-source card has the heart, a focusable link and the island slot", () => {
  assert.match(hosted, /id="oss"[^>]*data-island="heart-burst"/);
  assert.match(hosted, /class="heart"[^>]*aria-hidden="true"/);
  assert.match(hosted, /<a class="text-link" href="#faq">/);
  assert.match(hosted, /id="faq"/);
});

test("Home and Hosted ship the canvas and scroll-in slots; the header has the waitlist button", () => {
  assert.match(
    hosted,
    /<canvas class="net-canvas" aria-hidden="true" data-island="network-canvas">/,
  );
  assert.match(hosted, /data-island="scroll-reveal"/);
  const header = hosted.slice(hosted.indexOf("<header"), hosted.indexOf("</header>"));
  assert.match(header, /Join the waitlist/);
  assert.doesNotMatch(header, /github\.com/);
});
