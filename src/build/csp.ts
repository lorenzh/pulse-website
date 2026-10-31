import { createHash } from "node:crypto";
import { decode, type StartTag, startTags } from "./html-refs.ts";
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

/** The CSP meta tag must be the first tag after `<head>`, with only whitespace between them. */
function placementProblems(html: string, tags: StartTag[], metas: StartTag[]): string[] {
  if (metas.length !== 1) return [`${metas.length} CSP meta tags, expected 1`];
  const at = tags.findIndex((t) => t.tag === "head");
  const head = tags[at];
  const first = tags[at + 1];
  const placed =
    head !== undefined &&
    first !== undefined &&
    first === metas[0] &&
    /^[\t\n\f\r ]*$/.test(html.slice(head.end, first.start));
  return placed ? [] : ["the CSP meta tag is not the first element of <head>"];
}

/**
 * The text of every inline script (one without `src`), read like the tokenizer: the text runs from
 * the start tag's `>` to the next script end tag (see SCRIPT_END) or the end of the page, and tags
 * inside that text are not tags. The tokenizer never ends a script earlier than this, so no script
 * is missed; inside `<!--<script>` the browser ends it later, which can only add a problem.
 */
function inlineScripts(html: string, tags: StartTag[]): string[] {
  const texts: string[] = [];
  const end = new RegExp(SCRIPT_END.source, SCRIPT_END.flags);
  let textEnd = 0;
  for (const { tag, attrs, start, end: open } of tags) {
    if (tag !== "script" || start < textEnd) continue;
    end.lastIndex = open;
    textEnd = end.exec(html)?.index ?? html.length;
    if (attrs.src === undefined) texts.push(html.slice(open, textEnd));
  }
  return texts;
}

function inlineScriptProblems(html: string, tags: StartTag[], policy: string): string[] {
  const inline = inlineScripts(html, tags);
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
  const problems = placementProblems(html, tags, metas);
  const policy = decode(metas[0]?.attrs.content ?? "");
  if (metas.length > 0 && policy !== contentSecurityPolicy()) {
    problems.push(`the CSP is ${JSON.stringify(policy)}, expected the site policy`);
  }
  problems.push(...inlineScriptProblems(html, tags, policy));
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
