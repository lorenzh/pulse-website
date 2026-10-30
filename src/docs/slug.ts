/** GitHub-style heading id: lower case, no punctuation, spaces to dashes, `-1` for duplicates. */
export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

export function createSlugger(): (text: string) => string {
  const seen = new Map<string, number>();
  return (text) => {
    const base = headingSlug(text);
    const count = seen.get(base);
    if (count === undefined) {
      seen.set(base, 0);
      return base;
    }
    let next = count + 1;
    let candidate = `${base}-${next}`;
    while (seen.has(candidate)) {
      next += 1;
      candidate = `${base}-${next}`;
    }
    seen.set(base, next);
    seen.set(candidate, 0);
    return candidate;
  };
}
