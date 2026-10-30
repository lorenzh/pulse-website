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
import { hoverOutsideMedia } from "../src/build/hover-scan.ts";
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
  options: {
    width: number;
    theme: "light" | "dark";
    javaScript?: boolean;
    motion?: "reduce" | "no-preference";
  },
): Promise<BrowserContext> {
  return browser.newContext({
    viewport: { width: options.width, height: 800 },
    colorScheme: options.theme,
    javaScriptEnabled: options.javaScript ?? true,
    reducedMotion: options.motion ?? "reduce",
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

/** Every :hover selector of the built stylesheet sits inside @media (hover: hover). */
async function checkHoverCss(): Promise<void> {
  for (const file of dist.files.filter((f) => f.endsWith(".css"))) {
    const css = (await dist.text(file)) ?? "";
    for (const selector of hoverOutsideMedia(css))
      fail(file, `:hover outside hover media: ${selector}`);
  }
}

/** Tab order on desktop: navigation, then the button, then the theme toggle at the far right. */
async function checkHeaderOrder(page: Page, where: string): Promise<void> {
  for (const [url, label] of [
    ["/", "GitHub"],
    ["/hosted/", "Join the waitlist"],
    ["/docs/api/rest-api/", "GitHub"],
  ] as const) {
    await page.goto(`${origin}${url}`);
    await page.locator(".theme-btn, [data-island=theme-toggle] button").first().waitFor();
    const order = await page.evaluate(() => {
      const items = [
        ...document.querySelectorAll<HTMLElement>(
          ".site-nav a, .hdr-gh a, [data-island=theme-toggle] button",
        ),
      ].filter((el) => el.checkVisibility());
      const part = (el: HTMLElement): string => {
        if (el.closest(".site-nav")) return "nav";
        if (el.closest(".hdr-gh")) return "button";
        return "toggle";
      };
      return items.map(part);
    });
    const compact = order.filter((v, i) => i === 0 || v !== order[i - 1]);
    const want = ["nav", "button", "toggle"];
    if (compact.join("|") !== want.join("|"))
      fail(where, `${url}: header order ${compact.join(", ")}`);
    const text = (await page.locator(".hdr-gh a").first().textContent()) ?? "";
    if (!text.includes(label))
      fail(where, `${url}: header button reads "${text.trim()}", not ${label}`);
    const box = await page.evaluate(() => {
      const t = document.querySelector("[data-island=theme-toggle]")?.getBoundingClientRect();
      const g = document.querySelector(".hdr-gh")?.getBoundingClientRect();
      return t && g ? t.left > g.left : false;
    });
    if (!box) fail(where, `${url}: the theme toggle is not at the far right`);
  }
}

async function checkReducedMotion(page: Page, where: string): Promise<void> {
  for (const url of ["/", "/hosted/"]) {
    await page.goto(`${origin}${url}`);
    await page.locator("main").waitFor();
    const state = await page.evaluate(() => ({
      reveal: document.documentElement.classList.contains("js-reveal"),
      hidden: [...document.querySelectorAll<HTMLElement>("[data-reveal]")].filter(
        (el) => getComputedStyle(el).opacity !== "1",
      ).length,
      animations: document.getAnimations().length,
    }));
    if (state.reveal) fail(where, `${url}: js-reveal set under reduced motion`);
    if (state.hidden > 0) fail(where, `${url}: ${state.hidden} scroll-in items hidden`);
    if (state.animations > 0) fail(where, `${url}: ${state.animations} animations run`);
  }
}

async function checkMotionPages(browser: Browser, theme: "light" | "dark"): Promise<void> {
  const where = `motion ${theme}`;
  const context = await newContext(browser, { width: 1280, theme, motion: "no-preference" });
  watchNetwork(context, where);
  await context.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype;
    const clear = proto.clearRect;
    (window as unknown as { __frames: number }).__frames = 0;
    proto.clearRect = function patched(...args: Parameters<typeof clear>) {
      (window as unknown as { __frames: number }).__frames += 1;
      return clear.apply(this, args);
    };
  });
  const page = await context.newPage();
  for (const url of ["/", "/hosted/"]) {
    await page.goto(`${origin}${url}`, { waitUntil: "load" });
    await page.locator("canvas.net-canvas").waitFor({ state: "attached" });
    await checkAxe(page, `${where} ${url}`);
    const canvas = await page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>("canvas.net-canvas");
      const s = c ? getComputedStyle(c) : undefined;
      return {
        hidden: c?.getAttribute("aria-hidden"),
        events: s?.pointerEvents,
        position: s?.position,
        z: s?.zIndex,
        width: c?.clientWidth,
        viewport: innerWidth,
      };
    });
    if (canvas.hidden !== "true" || canvas.events !== "none" || canvas.position !== "fixed")
      fail(where, `${url}: canvas is not a fixed, aria-hidden, pointer-less layer`);
    if (Number(canvas.z) >= 0) fail(where, `${url}: canvas is not below the content`);
    if (canvas.width !== canvas.viewport) fail(where, `${url}: canvas is not viewport wide`);
    // Frame rate: at most about 30 fps, and it stops while the tab is hidden.
    await page.waitForFunction(
      () => (window as unknown as { __frames: number }).__frames > 5,
      null,
      {
        timeout: 5000,
      },
    );
    const frames = async (): Promise<number> =>
      page.evaluate(() => (window as unknown as { __frames: number }).__frames);
    const before = await frames();
    await page.waitForTimeout(1000);
    const perSecond = (await frames()) - before;
    if (perSecond > 36) fail(where, `${url}: canvas draws ${perSecond} frames per second`);
    if (perSecond < 5) fail(where, `${url}: canvas draws only ${perSecond} frames per second`);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(200);
    const paused = await frames();
    await page.waitForTimeout(500);
    if ((await frames()) - paused > 1) fail(where, `${url}: canvas keeps drawing in a hidden tab`);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
  }
  await checkReveal(page, where);
  await checkPreview(page, where);
  await checkHeart(page, where);
  await context.close();
}

async function checkReveal(page: Page, where: string): Promise<void> {
  await page.goto(`${origin}/`);
  const state = await page.evaluate(() => ({
    reveal: document.documentElement.classList.contains("js-reveal"),
    items: document.querySelectorAll("[data-reveal]").length,
  }));
  if (!state.reveal || state.items < 8) fail(where, "scroll-in is not armed on Home");
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  try {
    await page.waitForFunction(
      () =>
        ![...document.querySelectorAll("[data-reveal]")].some(
          (el) => !el.classList.contains("is-in"),
        ),
      null,
      { timeout: 3000 },
    );
  } catch {
    fail(where, "scroll-in items stay hidden after scrolling to the end");
  }
}

async function checkPreview(page: Page, where: string): Promise<void> {
  await page.goto(`${origin}/`);
  await page.locator(".status-mock").scrollIntoViewIfNeeded();
  const read = async (): Promise<string> =>
    page.evaluate(() => {
      const states = [...document.querySelectorAll<HTMLElement>(".mock-state")];
      const visible = states.filter((s) => s.dataset.active === "true");
      const exposed = states.filter((s) => !s.hasAttribute("aria-hidden"));
      if (visible.length !== 1 || exposed.length !== 1 || visible[0] !== exposed[0])
        return "broken";
      return visible[0]?.querySelector(".mock-summary")?.textContent ?? "";
    });
  const first = await read();
  if (first === "broken") fail(where, "status preview exposes a state that is not the visible one");
  try {
    await page.waitForFunction(
      (was) =>
        document.querySelector(".mock-state[data-active=true] .mock-summary")?.textContent !== was,
      first,
      { timeout: 7000 },
    );
  } catch {
    fail(where, "status preview does not change");
  }
  if ((await read()) === "broken")
    fail(where, "status preview exposes a state that is not visible");
}

async function checkHeart(page: Page, where: string): Promise<void> {
  await page.goto(`${origin}/hosted/`);
  await page.locator("#oss a").focus();
  const count = await page.locator(".heart-particle").count();
  if (count !== 8) fail(where, `heart burst on focus makes ${count} particles, not 8`);
  const hidden = await page.locator(".heart-particle[aria-hidden=true]").count();
  if (hidden !== count) fail(where, "heart particles are not aria-hidden");
  await page.waitForTimeout(1300);
  if ((await page.locator(".heart-particle").count()) !== 0) fail(where, "heart particles stay");
}

async function checkOneCopyButton(
  page: Page,
  block: Locator,
  mode: "allow" | "block",
): Promise<void> {
  const where = "copy buttons";
  const button = block.locator(".copy-btn");
  if ((await button.getAttribute("aria-label")) !== "Copy commands")
    fail(where, "button name is not Copy commands");
  const box = await button.boundingBox();
  if (!box || box.width < 43.5 || box.height < 43.5)
    fail(where, "copy button is smaller than 44 px");
  const expected = (await block.locator(".copy-slot").getAttribute("data-copy")) ?? "";
  if (/^\$ /m.test(expected)) fail(where, "copied text keeps the $ prompt");
  await button.click();
  const tip = block.locator(".copy-tip");
  const want = mode === "allow" ? "Copied" : "Copy blocked";
  try {
    await page.waitForFunction(
      ([el, text]) => el?.textContent === text,
      [await tip.elementHandle(), want] as const,
      { timeout: 1500 },
    );
  } catch {
    fail(where, `tooltip is not "${want}"`);
  }
  const copied = await page.evaluate(() =>
    (window as unknown as { __copied: string[] }).__copied.at(-1),
  );
  if (copied !== expected) fail(where, "copied text differs from the block's commands");
  if ((await tip.getAttribute("role")) !== "status") fail(where, "tooltip is not a status region");
  await page.waitForTimeout(1700);
  if (((await tip.textContent()) ?? "") !== "") fail(where, "tooltip does not reset after 1.5 s");
}

async function checkCopyButtons(browser: Browser): Promise<void> {
  const where = "copy buttons";
  for (const mode of ["allow", "block"] as const) {
    const context = await newContext(browser, { width: 1280, theme: "light" });
    watchNetwork(context, where);
    await context.addInitScript((m) => {
      const w = window as unknown as { __copied: string[] };
      w.__copied = [];
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: (text: string) => {
            w.__copied.push(text);
            return m === "allow" ? Promise.resolve() : Promise.reject(new Error("blocked"));
          },
        },
      });
    }, mode);
    const page = await context.newPage();
    await page.goto(`${origin}/docs/api/install/`);
    const withButtons = page.locator(".code-block:has(.copy-btn)");
    const count = await withButtons.count();
    if (count === 0) fail(where, "no command block with a copy button on the install page");
    for (let i = 0; i < count; i++) await checkOneCopyButton(page, withButtons.nth(i), mode);
    const plain = page.locator(".code-block:has(code.language-json):has(.copy-btn)");
    if ((await plain.count()) > 0) fail(where, "a JSON block has a copy button");
    await page.goto(`${origin}/docs/api/rest-api/`);
    if ((await page.locator(".code-block:has(code.language-json):has(.copy-btn)").count()) > 0)
      fail(where, "a JSON block has a copy button");
    await context.close();
  }
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
      if (theme === "light" && width === 1280) await checkHeaderOrder(page, `${where} header`);
      if (theme === "light" && width === 1280)
        await checkReducedMotion(page, `${where} reduced motion`);
      await context.close();
      console.log(`checked ${urls.length} pages: ${where}`);
    }
  }
  await checkNoScript(browser);
  await checkHoverCss();
  await checkCopyButtons(browser);
  for (const theme of THEMES) await checkMotionPages(browser, theme);
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
