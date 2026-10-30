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
