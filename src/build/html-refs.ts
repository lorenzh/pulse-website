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

function decode(value: string): string {
  return value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'");
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
