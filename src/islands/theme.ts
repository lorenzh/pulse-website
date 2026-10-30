export type Theme = "light" | "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/** The theme in effect: the data-theme attribute if set, else the system preference. */
export function effectiveTheme(attribute: string | null | undefined, prefersDark: boolean): Theme {
  if (isTheme(attribute)) return attribute;
  return prefersDark ? "dark" : "light";
}

export function otherTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

export function themeLabel(theme: Theme): string {
  return theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
}
