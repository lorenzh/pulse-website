export type Ref = { tag: string; attr: string; value: string };

/** Start of a start tag as the HTML tokenizer reads it: `<`, an ASCII letter, then the tag name. */
const TAG_OPEN = /<([a-zA-Z][^\t\n\f\r />]*)/g;
const HTML_SPACE = new Set(["\t", "\n", "\f", "\r", " "]);

function isSpace(ch: string | undefined): boolean {
  return ch !== undefined && HTML_SPACE.has(ch);
}

function isNameEnd(ch: string | undefined): boolean {
  return ch === undefined || isSpace(ch) || ch === "/" || ch === ">" || ch === "=";
}

export function asciiLower(text: string): string {
  return text.replace(/[A-Z]/g, (c) => c.toLowerCase());
}

/** The index of the first character at or after `from` that is not HTML whitespace. */
export function skipSpace(source: string, from: number): number {
  let i = from;
  while (isSpace(source[i])) i += 1;
  return i;
}

/** Reads one attribute value at `from` (after `=` and spaces); returns it and the index after it. */
function readValue(source: string, from: number): { value: string; next: number } {
  const quote = source[from];
  if (quote === '"' || quote === "'") {
    const close = source.indexOf(quote, from + 1);
    if (close === -1) return { value: source.slice(from + 1), next: source.length };
    return { value: source.slice(from + 1, close), next: close + 1 };
  }
  let i = from;
  while (i < source.length && !isSpace(source[i]) && source[i] !== ">") i += 1;
  return { value: source.slice(from, i), next: i };
}

/**
 * Reads the attributes of a start tag from `from` up to its `>`, the way the HTML tokenizer does:
 * spaces or `/` separate attributes, an attribute may follow a quoted value directly, a name may
 * start with `=`, names are lowercased in ASCII only, and the first of duplicate attributes wins.
 */
export function parseAttrs(source: string, from = 0): Record<string, string> {
  return readAttrs(source, from).attrs;
}

/** The attributes from `from` and the index just after the closing `>` (the end if there is none). */
export function readAttrs(
  source: string,
  from: number,
): { attrs: Record<string, string>; end: number } {
  const attrs = new Map<string, string>();
  let i = from;
  while (i < source.length && source[i] !== ">") {
    if (isSpace(source[i]) || source[i] === "/") {
      i += 1;
      continue;
    }
    let nameEnd = i + 1;
    while (!isNameEnd(source[nameEnd])) nameEnd += 1;
    const name = asciiLower(source.slice(i, nameEnd));
    i = skipSpace(source, nameEnd);
    let value = "";
    if (source[i] === "=") {
      const read = readValue(source, skipSpace(source, i + 1));
      value = read.value;
      i = read.next;
    }
    if (!attrs.has(name)) attrs.set(name, value);
  }
  return { attrs: Object.fromEntries(attrs), end: Math.min(i + 1, source.length) };
}

/**
 * A start tag: its lowercased name, its attributes, the index of its `<` and the index just after
 * its `>`.
 */
export type StartTag = { tag: string; attrs: Record<string, string>; start: number; end: number };

/** Every start tag in `html`, with its lowercased name, its attributes and its position. */
export function* startTags(html: string): Generator<StartTag> {
  for (const m of html.matchAll(TAG_OPEN)) {
    const { attrs, end } = readAttrs(html, m.index + m[0].length);
    yield { tag: asciiLower(m[1] ?? ""), attrs, start: m.index, end };
  }
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
  for (const { tag, attrs } of startTags(html)) {
    for (const attr of ["href", "src", "action", "poster", "srcset"]) {
      const value = attrs[attr];
      if (value !== undefined) refs.push({ tag, attr, value: decode(value) });
    }
  }
  return refs;
}

export function collectIds(html: string): Set<string> {
  const ids = new Set<string>();
  for (const { attrs } of startTags(html)) {
    const id = attrs.id;
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
