import { gzipSync } from "node:zlib";
import { collectCssRefs, collectRefs } from "./html-refs.ts";

export type Budget = {
  htmlBytes: number;
  cssBytes: number;
  jsBytes: number;
  maxFontFilesPerFamily: number;
};

export type PageUsage = {
  htmlBytes: number;
  cssBytes: number;
  jsBytes: number;
  fontFiles: Record<string, number>;
  fontBytes: number;
};

export type BudgetResult = { usage: PageUsage; problems: string[] };

export function gzipBytes(content: string | Uint8Array): number {
  return gzipSync(content).length;
}

/** Local JS files a page loads: its module scripts plus the chunks they import, transitively. */
export function scriptClosure(
  html: string,
  readText: (urlPath: string) => string | undefined,
): string[] {
  const queue = collectRefs(html)
    .filter((r) => r.tag === "script" && r.attr === "src")
    .map((r) => r.value);
  const seen = new Set<string>();
  while (queue.length > 0) {
    const url = queue.shift();
    if (url === undefined || seen.has(url)) continue;
    seen.add(url);
    const code = readText(url);
    if (code === undefined) continue;
    for (const m of code.matchAll(/(?:from|import)\s*["'](\.{0,2}\/[^"']+\.js)["']/g)) {
      const spec = m[1] ?? "";
      queue.push(spec.startsWith("/") ? spec : new URL(spec, `http://x${url}`).pathname);
    }
  }
  return [...seen];
}

export function stylesheets(html: string): string[] {
  return collectRefs(html)
    .filter((r) => r.tag === "link" && r.attr === "href" && r.value.endsWith(".css"))
    .map((r) => r.value);
}

/** font-family -> number of distinct font files in the @font-face rules of a stylesheet. */
export function fontFilesByFamily(css: string): Record<string, string[]> {
  const families: Record<string, string[]> = {};
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const body = m[1] ?? "";
    const family = /font-family:\s*["']?([^;"']+)["']?/.exec(body)?.[1]?.trim();
    const file = collectCssRefs(body)[0];
    if (!family || !file) continue;
    const list = families[family] ?? [];
    if (!list.includes(file)) list.push(file);
    families[family] = list;
  }
  return families;
}

export function evaluatePage(
  html: string,
  budget: Budget,
  readText: (urlPath: string) => string | undefined,
  fileSize: (urlPath: string) => number,
): BudgetResult {
  const css = stylesheets(html);
  const js = scriptClosure(html, readText);
  const fontFiles: Record<string, number> = {};
  let fontBytes = 0;
  const usedFonts = new Set<string>();
  for (const sheet of css) {
    for (const [family, files] of Object.entries(fontFilesByFamily(readText(sheet) ?? ""))) {
      fontFiles[family] = (fontFiles[family] ?? 0) + files.length;
      for (const f of files) usedFonts.add(f);
    }
  }
  for (const f of usedFonts) fontBytes += fileSize(f);
  const usage: PageUsage = {
    htmlBytes: gzipBytes(html),
    cssBytes: css.reduce((sum, s) => sum + gzipBytes(readText(s) ?? ""), 0),
    jsBytes: js.reduce((sum, s) => sum + gzipBytes(readText(s) ?? ""), 0),
    fontFiles,
    fontBytes,
  };
  const problems: string[] = [];
  if (usage.htmlBytes > budget.htmlBytes)
    problems.push(`HTML ${usage.htmlBytes} B gzip > ${budget.htmlBytes} B`);
  if (usage.cssBytes > budget.cssBytes)
    problems.push(`CSS ${usage.cssBytes} B gzip > ${budget.cssBytes} B`);
  if (usage.jsBytes > budget.jsBytes)
    problems.push(`JS ${usage.jsBytes} B gzip > ${budget.jsBytes} B`);
  for (const [family, n] of Object.entries(fontFiles)) {
    if (n > budget.maxFontFilesPerFamily)
      problems.push(`${family}: ${n} font files > ${budget.maxFontFilesPerFamily}`);
  }
  return { usage, problems };
}

export function parseBudget(value: unknown): Budget {
  const v = value as Record<string, unknown> | null;
  const get = (key: string): number => {
    const n = v?.[key];
    if (typeof n !== "number" || !Number.isFinite(n) || n <= 0)
      throw new Error(`budget.json: "${key}" must be a positive number`);
    return n;
  };
  return {
    htmlBytes: get("htmlBytes"),
    cssBytes: get("cssBytes"),
    jsBytes: get("jsBytes"),
    maxFontFilesPerFamily: get("maxFontFilesPerFamily"),
  };
}
