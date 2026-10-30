// bun run check:a11y: axe, keyboard, focus, target size, no-JS and no-network checks on dist/.
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import {
  type Browser,
  type BrowserContext,
  chromium,
  type Locator,
  type Page,
} from "@playwright/test";
import { readDist } from "../src/build/dist-files.ts";
import { pageUrl } from "../src/build/links-check.ts";
import { startStaticServer } from "../src/build/static-server.ts";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const THEMES = ["light", "dark"] as const;
const WIDTHS = [360, 1280] as const;
const TARGETS =
  "button, summary, input, select, a.btn, a.card-link, .brand, .site-nav a, .footer-nav a, .docs-side a, .toc a, .pager-link, .breadcrumb a, .copy-btn";

const dist = await readDist(path.join(process.cwd(), "dist"));
const urls = [...dist.html.keys()].map(pageUrl).sort((a, b) => a.localeCompare(b));
const { server, origin } = await startStaticServer(path.join(process.cwd(), "dist"));
const failures: string[] = [];
const fail = (where: string, what: string): void => {
  failures.push(`${where}: ${what}`);
};

async function newContext(
  browser: Browser,
  options: { width: number; theme: "light" | "dark"; javaScript?: boolean },
): Promise<BrowserContext> {
  return browser.newContext({
    viewport: { width: options.width, height: 800 },
    colorScheme: options.theme,
    javaScriptEnabled: options.javaScript ?? true,
    reducedMotion: "reduce",
  });
}

/** Aborts and records every request to another origin; records failed local requests. */
function watchNetwork(context: BrowserContext, where: string): void {
  void context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(origin) || url.startsWith("data:")) return route.continue();
    fail(where, `external request to ${url}`);
    return route.abort();
  });
  context.on("requestfailed", (request) => {
    if (request.url().startsWith(origin)) fail(where, `request failed: ${request.url()}`);
  });
  context.on("response", (response) => {
    if (
      response.url().startsWith(origin) &&
      response.status() >= 400 &&
      !response.url().endsWith("/404-probe")
    ) {
      fail(where, `HTTP ${response.status()} for ${response.url()}`);
    }
  });
}

async function checkAxe(page: Page, where: string): Promise<void> {
  const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  for (const v of result.violations) {
    fail(
      where,
      `axe ${v.id} (${v.impact}): ${v.help} — ${v.nodes
        .slice(0, 2)
        .map((n) => n.target.join(" "))
        .join("; ")}`,
    );
  }
}

async function checkFocusAndTargets(page: Page, where: string): Promise<void> {
  await page.keyboard.press("Tab");
  const missing = await page.evaluate(() => {
    const out: string[] = [];
    const sel = 'a[href], button, input, summary, select, textarea, [tabindex="0"]';
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      const box = el.getBoundingClientRect();
      if (
        !el.checkVisibility() ||
        box.width === 0 ||
        box.height === 0 ||
        el.matches(":disabled") ||
        el.classList.contains("skip")
      )
        continue;
      el.focus();
      const s = getComputedStyle(el);
      const hasOutline = s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) >= 2;
      if (!hasOutline)
        out.push(
          `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? "").trim().slice(0, 30)}"`,
        );
    }
    return out;
  });
  for (const m of missing) fail(where, `no visible focus style on ${m}`);
  const small = await page.evaluate((selector) => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const box = el.getBoundingClientRect();
      if (!el.checkVisibility() || (box.width === 0 && box.height === 0)) continue;
      if (box.width < 43.5 || box.height < 43.5) {
        out.push(
          `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? "").trim().slice(0, 30)}" ${Math.round(box.width)}x${Math.round(box.height)}`,
        );
      }
    }
    return out;
  }, TARGETS);
  for (const s of small) fail(where, `target smaller than 44 px: ${s}`);
}

async function checkSkipLink(page: Page, where: string): Promise<void> {
  await page.goto(`${origin}/`);
  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => document.activeElement?.className);
  if (first !== "skip") fail(where, `first Tab lands on "${first}", not the skip link`);
  await page.keyboard.press("Enter");
  const id = await page.evaluate(() => document.activeElement?.id);
  if (id !== "main") fail(where, `skip link moves focus to "${id}", not main`);
}

/** Waits briefly for a state change (the islands update after the event). */
async function becomes(locator: Locator, state: "visible" | "hidden"): Promise<boolean> {
  try {
    await locator.waitFor({ state, timeout: 1500 });
    return true;
  } catch {
    return false;
  }
}

async function checkMenu(page: Page, where: string): Promise<void> {
  await page.goto(`${origin}/`);
  const button = page.locator(".menu-btn");
  await button.waitFor({ state: "visible" });
  const nav = page.locator("#site-nav");
  if (await nav.isVisible()) fail(where, "mobile menu is open before use");
  await button.focus();
  await page.keyboard.press("Enter");
  if (!(await becomes(nav, "visible")) || (await button.getAttribute("aria-expanded")) !== "true") {
    fail(where, "menu did not open with Enter");
  }
  await page.keyboard.press("Escape");
  if (!(await becomes(nav, "hidden"))) fail(where, "Escape did not close the menu");
  if (!(await button.evaluate((b) => document.activeElement === b)))
    fail(where, "focus did not return to the menu button");
  await page.keyboard.press("Space");
  if (!(await becomes(nav, "visible"))) fail(where, "menu did not open with Space");
  await page.keyboard.press("Space");
  if (!(await becomes(nav, "hidden"))) fail(where, "menu did not close with Space");
}

async function checkDocsNav(page: Page, where: string): Promise<void> {
  await page.goto(`${origin}/docs/api/rest-api/`);
  const summary = page.locator(".docs-nav > summary");
  await summary.waitFor({ state: "visible" });
  const details = page.locator(".docs-nav");
  const current = page.locator('.docs-nav a[aria-current="page"]');
  await summary.focus();
  await page.keyboard.press("Enter");
  if (!(await becomes(current, "visible"))) fail(where, "docs navigation did not open with Enter");
  await page.keyboard.press("Escape");
  if (!(await becomes(current, "hidden")) || (await details.getAttribute("open")) !== null) {
    fail(where, "Escape did not close the docs navigation");
  }
  await page.keyboard.press("Space");
  if (!(await becomes(current, "visible"))) fail(where, "docs navigation did not open with Space");
}

async function checkNoScript(browser: Browser): Promise<void> {
  const context = await newContext(browser, { width: 1280, theme: "light", javaScript: false });
  const page = await context.newPage();
  for (const url of urls) {
    await page.goto(`${origin}${url}`);
    // biome-ignore lint/performance/useDomNodeTextContent: innerText counts only rendered text
    const main = await page.locator("main").innerText();
    const h1 = await page.locator("h1").count();
    if (main.trim().length < 40 || h1 !== 1)
      fail(`no-js ${url}`, `main has ${main.trim().length} characters and ${h1} h1`);
    const nav = await page.locator("#site-nav").isVisible();
    if (!nav) fail(`no-js ${url}`, "site navigation is not visible without JavaScript");
  }
  await context.close();
}

const browser = await chromium.launch();
try {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const where = `${theme} ${width}px`;
      const context = await newContext(browser, { width, theme });
      watchNetwork(context, where);
      const page = await context.newPage();
      for (const url of urls) {
        await page.goto(`${origin}${url}`);
        await page.locator("main").waitFor();
        await checkAxe(page, `${where} ${url}`);
        if (theme === "light") await checkFocusAndTargets(page, `${where} ${url}`);
      }
      if (theme === "light" && width === 360) {
        await checkMenu(page, `${where} menu`);
        await checkDocsNav(page, `${where} docs navigation`);
      }
      if (theme === "light" && width === 1280) await checkSkipLink(page, `${where} skip link`);
      await context.close();
      console.log(`checked ${urls.length} pages: ${where}`);
    }
  }
  await checkNoScript(browser);
} finally {
  await browser.close();
  server.close();
}
if (failures.length > 0) {
  const unique = [...new Set(failures)];
  const shown = unique.slice(0, 80).join("\n- ");
  const more = unique.length > 80 ? `\n... and ${unique.length - 80} more` : "";
  console.error(`${unique.length} problems:\n- ${shown}${more}`);
  process.exit(1);
}
console.log("a11y ok");
