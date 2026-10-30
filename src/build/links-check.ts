import path from "node:path";
import {
  collectCssRefs,
  collectIds,
  collectRefs,
  inlineStyles,
  isCrossOrigin,
  type Ref,
} from "./html-refs.ts";
import { isSafeRef, urlScheme } from "./url-safety.ts";

export type LinkReport = {
  problems: string[];
  internalLinks: number;
  externalLinks: number;
  githubLinks: number;
};

/** Page URL path of a dist file: docs/api/index.html -> /docs/api/, 404.html -> /404.html. */
export function pageUrl(file: string): string {
  const url = `/${file.split(path.sep).join("/")}`;
  return url.endsWith("/index.html") ? url.slice(0, -"index.html".length) : url;
}

function resolveTarget(
  from: string,
  value: string,
): { file: string; fragment: string } | undefined {
  // checkPage reports unsafe schemes and counts mailto: before it gets here; CSS url() may hold one.
  if (urlScheme(value) === "mailto") return undefined;
  const hashAt = value.indexOf("#");
  const fragment = hashAt === -1 ? "" : value.slice(hashAt + 1);
  const withoutHash = hashAt === -1 ? value : value.slice(0, hashAt);
  const target = withoutHash.split("?")[0] ?? "";
  const base = from.endsWith("/") ? from : path.posix.dirname(from);
  let abs = target === "" ? from : path.posix.resolve(base, target);
  if (target.endsWith("/") && !abs.endsWith("/")) abs += "/";
  const file = abs.endsWith("/") ? `${abs}index.html` : abs;
  return { file: file.replace(/^\//, ""), fragment };
}

type Page = { file: string; from: string };
type Deps = {
  pages: Map<string, string>;
  ids: Map<string, Set<string>>;
  exists: (file: string) => boolean;
  report: LinkReport;
  stylesheets: Set<string>;
};

const LOADING_ATTRS = new Set(["src", "action", "poster", "srcset"]);

function isLoading(tag: string, attr: string, rel: string | undefined): boolean {
  return LOADING_ATTRS.has(attr) || (tag === "link" && rel !== "canonical" && attr === "href");
}

function checkInternal(page: Page, ref: Ref, rel: string | undefined, deps: Deps): void {
  if (ref.tag === "link" && rel === "canonical") return;
  const target = resolveTarget(page.from, ref.value);
  if (!target) return;
  deps.report.internalLinks += 1;
  if (!deps.pages.has(target.file) && !deps.exists(target.file)) {
    deps.report.problems.push(
      `${page.file}: ${ref.attr}="${ref.value}" does not resolve to a file in dist`,
    );
    return;
  }
  const missing =
    target.fragment !== "" &&
    target.fragment !== "top" &&
    !deps.ids.get(target.file)?.has(target.fragment);
  if (missing) {
    deps.report.problems.push(
      `${page.file}: ${ref.attr}="${ref.value}" has no element with id "${target.fragment}"`,
    );
  }
  if (ref.tag === "link" && ref.value.endsWith(".css")) deps.stylesheets.add(target.file);
}

function checkPage(page: Page, html: string, deps: Deps): void {
  for (const ref of collectRefs(html)) {
    if (!isSafeRef(ref)) {
      deps.report.problems.push(
        `${page.file}: unsafe link scheme in ${ref.tag} ${ref.attr}=${JSON.stringify(ref.value)}`,
      );
      continue;
    }
    if (urlScheme(ref.value) === "mailto") {
      deps.report.externalLinks += 1;
      continue;
    }
    const rel = ref.tag === "link" ? linkRel(html, ref.value) : undefined;
    if (!isCrossOrigin(ref.value)) {
      checkInternal(page, ref, rel, deps);
    } else if (isLoading(ref.tag, ref.attr, rel)) {
      deps.report.problems.push(
        `${page.file}: <${ref.tag} ${ref.attr}="${ref.value}"> loads another origin`,
      );
    } else {
      deps.report.externalLinks += 1;
      if (ref.value.startsWith("https://github.com/")) deps.report.githubLinks += 1;
    }
  }
  checkInlineStyles(page, html, deps);
}

function checkInlineStyles(page: Page, html: string, deps: Deps): void {
  const urls = inlineStyles(html).flatMap((css) => collectCssRefs(css));
  for (const url of urls.filter(isCrossOrigin)) {
    deps.report.problems.push(`${page.file}: inline style loads ${url}`);
  }
}

function checkStylesheet(file: string, css: string, deps: Deps): void {
  for (const url of collectCssRefs(css)) {
    if (isCrossOrigin(url)) {
      deps.report.problems.push(`${file}: CSS loads another origin (${url})`);
      continue;
    }
    const target = resolveTarget(`/${file}`, url);
    if (target && !deps.exists(target.file)) {
      deps.report.problems.push(`${file}: url(${url}) does not exist in dist`);
    }
  }
}

/**
 * Offline link check over built HTML. `pages` maps dist-relative HTML paths to their content,
 * `exists` tells whether any other dist file exists, `readCss` returns a stylesheet by dist path.
 * Fails on a dangling internal link, a missing fragment and any reference to another origin that
 * the browser would load (src, stylesheet, script, form action, @import, url()).
 */
export function checkLinks(
  pages: Map<string, string>,
  exists: (file: string) => boolean,
  readCss: (file: string) => string | undefined,
): LinkReport {
  const deps: Deps = {
    pages,
    ids: new Map([...pages].map(([file, html]) => [file, collectIds(html)])),
    exists,
    report: { problems: [], internalLinks: 0, externalLinks: 0, githubLinks: 0 },
    stylesheets: new Set(),
  };
  for (const [file, html] of pages) checkPage({ file, from: pageUrl(file) }, html, deps);
  for (const file of deps.stylesheets) {
    const css = readCss(file);
    if (css !== undefined) checkStylesheet(file, css, deps);
  }
  return deps.report;
}

function linkRel(html: string, href: string): string | undefined {
  const escaped = href.replaceAll("&", "&amp;");
  const m = new RegExp(
    `<link[^>]*href="${escaped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`,
  ).exec(html);
  const rel = m ? /rel="([^"]*)"/.exec(m[0]) : null;
  return rel?.[1];
}
