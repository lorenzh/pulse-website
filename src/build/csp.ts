import { createHash } from "node:crypto";
import { asciiLower, decode, readAttrs, type StartTag, skipSpace, startTags } from "./html-refs.ts";
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

/**
 * The end of script data as the HTML tokenizer reads it: `</script` in any ASCII case, then a tab,
 * LF, FF, CR, space, `/` or `>`. So `</script/>` and `</script x>` end a script too.
 */
const SCRIPT_END = /<\/script[\t\n\f\r />]/gi;

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

function isCspMeta({ tag, attrs }: StartTag): boolean {
  const equiv = attrs["http-equiv"];
  return tag === "meta" && equiv?.trim().toLowerCase() === "content-security-policy";
}

const DOCTYPE = /<!doctype[^>]*>/iy;

/** The start tag named `name` (ASCII, any case) at `at`, read like the tokenizer, or undefined. */
function startTagAt(html: string, at: number, name: string): StartTag | undefined {
  const open = html.slice(at, at + name.length + 1);
  if (asciiLower(open) !== `<${name}`) return undefined;
  const next = html[at + name.length + 1];
  if (next !== undefined && !/[\t\n\f\r />]/.test(next)) return undefined;
  const { attrs, end } = readAttrs(html, at + name.length + 1);
  return { tag: name, attrs, start: at, end };
}

/**
 * The tag the browser takes as the first element of `<head>`, failing closed: the page must start
 * with only whitespace, an optional `<!doctype …>`, an optional `<html …>` and `<head …>`, then the
 * meta tag. A comment, a `<template>` or any text before it is not read as markup the browser
 * ignores; it makes the check fail, so a meta tag the browser never sees cannot pass.
 */
function firstHeadMeta(html: string): StartTag | undefined {
  const doctype = new RegExp(DOCTYPE.source, DOCTYPE.flags);
  const start = skipSpace(html, 0);
  doctype.lastIndex = start;
  const found = doctype.exec(html);
  let at = skipSpace(html, found === null ? start : start + found[0].length);
  const root = startTagAt(html, at, "html");
  if (root !== undefined) at = skipSpace(html, root.end);
  const head = startTagAt(html, at, "head");
  if (head === undefined) return undefined;
  return startTagAt(html, skipSpace(html, head.end), "meta");
}

/** The CSP meta tag must be the first tag after `<head>`, read as the browser reads the prefix. */
function placementProblems(first: StartTag | undefined, metas: StartTag[]): string[] {
  if (metas.length !== 1) return [`${metas.length} CSP meta tags, expected 1`];
  return first !== undefined && isCspMeta(first)
    ? []
    : ["the CSP meta tag is not the first element of <head>"];
}

/**
 * Every place where a `<script>` start tag can begin: `<script` in any ASCII case, then a tab, LF,
 * FF, CR, space, `/` or `>`. This also matches inside comments, attribute values and the text of
 * `<title>`, `<textarea>`, `<noscript>` or another script.
 */
const SCRIPT_START = /<script(?=[\t\n\f\r />])/gi;

/**
 * The text of every inline script (one without `src`), failing closed. Every script start tag the
 * browser reads matches SCRIPT_START, and its attributes are read like the tokenizer, so no real
 * inline script is missed. Matches the browser does not see as tags (in a comment, an attribute
 * value, RCDATA, raw text or script text) count as well: they can only add a problem, and a fake
 * `<script src>` cannot swallow the real script after it. Each text runs from the tag's `>` to the
 * next script end tag (see SCRIPT_END) or the end of the page; the browser never ends it earlier.
 */
function inlineScripts(html: string): string[] {
  const texts: string[] = [];
  const end = new RegExp(SCRIPT_END.source, SCRIPT_END.flags);
  for (const m of html.matchAll(SCRIPT_START)) {
    const { attrs, end: open } = readAttrs(html, m.index + m[0].length);
    if (attrs.src !== undefined) continue;
    end.lastIndex = open;
    texts.push(html.slice(open, end.exec(html)?.index ?? html.length));
  }
  return texts;
}

function inlineScriptProblems(html: string, policy: string): string[] {
  const inline = inlineScripts(html);
  if (inline.length !== 1) return [`${inline.length} inline scripts, expected 1`];
  const hash = sha256(inline[0] ?? "");
  return scriptSources(policy).includes(`'${hash}'`)
    ? []
    : [`the inline script hash ${hash} is not in script-src`];
}

/** Problems with the CSP of one built page; empty if the page is fine. */
export function cspProblems(file: string, html: string): string[] {
  const tags = [...startTags(html)];
  const metas = tags.filter(isCspMeta);
  const first = firstHeadMeta(html);
  const problems = placementProblems(first, metas);
  const applied = first !== undefined && isCspMeta(first) ? first : metas[0];
  const policy = decode(applied?.attrs.content ?? "");
  if (metas.length > 0 && policy !== contentSecurityPolicy()) {
    problems.push(`the CSP is ${JSON.stringify(policy)}, expected the site policy`);
  }
  problems.push(...inlineScriptProblems(html, policy));
  problems.push(...styleProblems(tags));
  return problems.map((p) => `${file}: ${p}`);
}

/**
 * A `style` attribute or a `<style>` element, read with the browser-like start-tag reader, so
 * `<p/style=…>`, `<p title="t"style=…>` and `<style/>` count too.
 */
function styleProblems(tags: StartTag[]): string[] {
  let attribute = false;
  let element = false;
  for (const { tag, attrs } of tags) {
    if (attrs.style !== undefined) attribute = true;
    if (tag === "style") element = true;
  }
  return [...(attribute ? ["a style attribute"] : []), ...(element ? ["a <style> element"] : [])];
}
