/**
 * Finds `:hover` selectors that sit outside a `@media (hover: hover)` block. Works on source or
 * minified CSS: it tracks block nesting by braces and keeps the at-rule preludes on a stack.
 */
export function hoverOutsideMedia(css: string): string[] {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const found: string[] = [];
  const stack: string[] = [];
  let start = 0;
  for (let i = 0; i < plain.length; i++) {
    const ch = plain[i];
    if (ch === "{") {
      const prelude = plain.slice(start, i).trim();
      if (!prelude.startsWith("@") && prelude.includes(":hover") && !stack.some(isHoverMedia))
        found.push(prelude);
      stack.push(prelude);
      start = i + 1;
    } else if (ch === "}" || ch === ";") {
      if (ch === "}") stack.pop();
      start = i + 1;
    }
  }
  return found;
}

function isHoverMedia(prelude: string): boolean {
  return /^@media[^{]*\(\s*hover\s*:\s*hover\s*\)/.test(prelude);
}

/**
 * Rules that draw a border on a top-level section: rules whose subject (the last compound of a
 * selector) is `section` or carries one of `marks` (`.band`, `#faq`), with a `border` or
 * `border-top`/`border-bottom` declaration that is not `0` or `none`.
 */
export function sectionBorderRules(css: string, marks: string[]): string[] {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const found: string[] = [];
  // Leaf rules only: the text before each `}` back to its `{` is the body, and the text before
  // that back to the previous `{`, `}` or `;` is the selector.
  for (const chunk of plain.split("}")) {
    const open = chunk.lastIndexOf("{");
    if (open < 0) continue;
    const body = chunk.slice(open + 1);
    const head = chunk.slice(0, open);
    const selector = head.slice(Math.max(head.lastIndexOf("{"), head.lastIndexOf(";")) + 1);
    if (selector.trim().startsWith("@")) continue;
    const draws = body.split(";").some((declaration) => {
      const [property = "", value = ""] = declaration.split(":").map((part) => part.trim());
      return BORDERS.has(property) && value !== "0" && value !== "none";
    });
    if (draws && selector.split(",").some((s) => isSectionSubject(s, marks)))
      found.push(selector.trim());
  }
  return found;
}

const BORDERS = new Set(["border", "border-top", "border-bottom"]);

function isSectionSubject(selector: string, marks: string[]): boolean {
  const subject =
    selector
      .trim()
      .split(/\s*[\s>+~]\s*/)
      .at(-1) ?? "";
  if (/^section(?![\w-])/.test(subject)) return true;
  return marks.some((mark) =>
    new RegExp(`${mark.replace(/[.#]/g, "\\$&")}(?![\\w-])`).test(subject),
  );
}
