import { collectRefs, type Ref } from "./html-refs.ts";

/** A link with a scheme other than http:, https: or mailto: reached a page. */
export class UnsafeLinkError extends Error {
  override name = "UnsafeLinkError";
}

/** The rule in words, for error messages. */
export const LINK_RULE = "only http:, https:, mailto: and in-site links are allowed";

const SAFE_SCHEMES = new Set(["http", "https", "mailto"]);

/**
 * Normalises a URL the way the WHATWG URL parser does before it reads the scheme: strip leading and
 * trailing C0 controls and spaces, then remove every tab, LF and CR.
 */
function normalise(value: string): string {
  const isControlOrSpace = (i: number): boolean => value.charCodeAt(i) <= 0x20;
  let start = 0;
  let end = value.length;
  while (start < end && isControlOrSpace(start)) start += 1;
  while (end > start && isControlOrSpace(end - 1)) end -= 1;
  return value.slice(start, end).replace(/[\t\n\r]/g, "");
}

/**
 * Lowercased scheme of a URL, or undefined if it has none. The scheme is the text before the first
 * `:` when that `:` comes before any `/`, `?` and `#`; it need not match the scheme grammar. A `#`
 * right after `&` is the start of an undecoded character reference, not a fragment, so
 * `&#106;avascript:` keeps its (unsafe) scheme: the conservative reading.
 */
export function urlScheme(value: string): string | undefined {
  const url = normalise(value);
  const colon = url.indexOf(":");
  if (colon === -1) return undefined;
  const head = url.slice(0, colon);
  if (/[/?]|(?<!&)#/.test(head)) return undefined;
  return head.toLowerCase();
}

/** True for in-site links (no scheme, `//host` included) and for http:, https: and mailto:. */
export function isSafeUrl(value: string): boolean {
  const scheme = urlScheme(value);
  return scheme === undefined || SAFE_SCHEMES.has(scheme);
}

function refUrls(ref: Ref): string[] {
  if (ref.attr !== "srcset") return [ref.value];
  return ref.value
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0] ?? "")
    .filter((url) => url !== "");
}

/** True if every URL of the reference (each srcset candidate) is safe. */
export function isSafeRef(ref: Ref): boolean {
  return refUrls(ref).every(isSafeUrl);
}

/** Every href, src, action, poster and srcset reference of the page with an unsafe URL. */
export function unsafeRefs(html: string): Ref[] {
  return collectRefs(html).filter((ref) => !isSafeRef(ref));
}
