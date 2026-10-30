export type Ref = { tag: string; attr: string; value: string };

// eslint-disable-next-line sonarjs/regex-complexity -- tokenizes our own generated HTML; splitting it would not make it clearer
const TAG = /<([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g;
// eslint-disable-next-line sonarjs/regex-complexity -- one attribute with a quoted or bare value
const ATTR = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

export function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of source.matchAll(ATTR)) {
    attrs[(m[1] ?? "").toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}

const NAMED: Record<string, string> = {
  amp: "&",
  quot: '"',
  colon: ":",
  tab: "\t",
  newline: "\n",
  lpar: "(",
  rpar: ")",
};

/** Numeric references the HTML parser replaces with U+FFFD: zero, surrogates and out of range. */
function fromCodePoint(code: number): string {
  const invalid = !Number.isFinite(code) || code === 0 || code > 0x10ffff;
  const surrogate = code >= 0xd800 && code <= 0xdfff;
  return invalid || surrogate ? "\uFFFD" : String.fromCodePoint(code);
}

/**
 * Decodes an attribute value once, like the browser: `&amp;`, `&quot;`, numeric references and the
 * named references that can hide a URL scheme. The browser decodes a numeric reference even without
 * its `;` (`javascript&#58alert(1)`), so the `;` is optional there. Any other `&name;` stays as it is.
 */
export function decode(value: string): string {
  return value.replace(
    /&(?:#(\d+);?|#x([\da-f]+);?|([a-z]+);)/gi,
    (raw, dec: string | undefined, hex: string | undefined, name: string | undefined) => {
      if (dec !== undefined) return fromCodePoint(Number.parseInt(dec, 10));
      if (hex !== undefined) return fromCodePoint(Number.parseInt(hex, 16));
      return NAMED[(name ?? "").toLowerCase()] ?? raw;
    },
  );
}

/** href, src and form action references of every tag. */
export function collectRefs(html: string): Ref[] {
  const refs: Ref[] = [];
  for (const m of html.matchAll(TAG)) {
    const tag = (m[1] ?? "").toLowerCase();
    const attrs = parseAttrs(m[2] ?? "");
    for (const attr of ["href", "src", "action", "poster", "srcset"]) {
      const value = attrs[attr];
      if (value !== undefined) refs.push({ tag, attr, value: decode(value) });
    }
  }
  return refs;
}

export function collectIds(html: string): Set<string> {
  const ids = new Set<string>();
  for (const m of html.matchAll(TAG)) {
    const id = parseAttrs(m[2] ?? "").id;
    if (id) ids.add(id);
  }
  return ids;
}

/** References in CSS: `url(...)` and `@import`. */
export function collectCssRefs(css: string): string[] {
  const refs: string[] = [];
  // eslint-disable-next-line sonarjs/super-linear-regex -- input is our own minified stylesheet
  for (const m of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/g)) {
    refs.push(m[1] ?? m[2] ?? m[3] ?? "");
  }
  for (const m of css.matchAll(/@import\s+(?:url\(\s*)?["']?([^"')\s;]+)/g)) refs.push(m[1] ?? "");
  return refs.filter((r) => r !== "" && !r.startsWith("data:"));
}

export function inlineStyles(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) out.push(m[1] ?? "");
  for (const m of html.matchAll(/\sstyle="([^"]*)"/g)) out.push(decode(m[1] ?? ""));
  return out;
}

export function isCrossOrigin(value: string): boolean {
  return /^(https?:)?\/\//i.test(value.trim());
}
