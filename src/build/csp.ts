import { createHash } from "node:crypto";
import { decode, parseAttrs } from "./html-refs.ts";
import { themeScriptHash } from "./theme-hash.ts";

/** A page cannot carry the Content-Security-Policy meta tag. */
export class CspError extends Error {
  override name = "CspError";
}

/**
 * The policy of every page. Only the site's own scripts, styles and fonts load, plus the hashed
 * inline theme script. `frame-ancestors`, `report-uri`, `report-to` and `sandbox` are left out:
 * browsers ignore them in a meta tag.
 */
export function contentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    `script-src 'self' '${themeScriptHash()}'`,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join("; ");
}

export function cspMetaTag(): string {
  return `<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy()}">`;
}

const HEAD = /<head(?:\s[^>]*)?>/gi;

/** Inserts the CSP meta tag as the first element of the page's single `<head>`. */
export function withCsp(html: string): string {
  const heads = [...html.matchAll(HEAD)];
  const head = heads[0];
  if (heads.length !== 1 || head === undefined) {
    throw new CspError(`a page needs exactly one <head> for the CSP, found ${heads.length}`);
  }
  const at = head.index + head[0].length;
  return `${html.slice(0, at)}${cspMetaTag()}${html.slice(at)}`;
}

const CSP_META = /<meta\b[^>]*\bhttp-equiv\s*=\s*["']?content-security-policy\b[^>]*>/gi;
const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;

function sha256(text: string): string {
  return `sha256-${createHash("sha256").update(text).digest("base64")}`;
}

function scriptSources(policy: string): string[] {
  const directive = policy
    .split(";")
    .map((d) => d.trim().split(/\s+/))
    .find((parts) => parts[0] === "script-src");
  return directive ? directive.slice(1) : [];
}

function placementProblems(html: string, metas: string[]): string[] {
  if (metas.length !== 1) return [`${metas.length} CSP meta tags, expected 1`];
  const first = /<head(?:\s[^>]*)?>\s*(<[^>]*>)/i.exec(html)?.[1];
  return first === metas[0] ? [] : ["the CSP meta tag is not the first element of <head>"];
}

function inlineScriptProblems(html: string, policy: string): string[] {
  const inline = [...html.matchAll(SCRIPT)].filter((m) => parseAttrs(m[1] ?? "").src === undefined);
  if (inline.length !== 1) return [`${inline.length} inline scripts, expected 1`];
  const hash = sha256(inline[0]?.[2] ?? "");
  return scriptSources(policy).includes(`'${hash}'`)
    ? []
    : [`the inline script hash ${hash} is not in script-src`];
}

/** Problems with the CSP of one built page; empty if the page is fine. */
export function cspProblems(file: string, html: string): string[] {
  const metas = [...html.matchAll(CSP_META)].map((m) => m[0]);
  const problems = placementProblems(html, metas);
  const policy = decode(parseAttrs(metas[0]?.replace(/^<meta\b|\/?>$/gi, "") ?? "").content ?? "");
  if (metas.length > 0 && policy !== contentSecurityPolicy()) {
    problems.push(`the CSP is ${JSON.stringify(policy)}, expected the site policy`);
  }
  problems.push(...inlineScriptProblems(html, policy));
  if (/<[a-z][^<>]*\sstyle\s*=/i.test(html)) problems.push("a style attribute");
  if (/<style[\s>]/i.test(html)) problems.push("a <style> element");
  return problems.map((p) => `${file}: ${p}`);
}
