import { useState } from "react";
import { THEME_STORAGE_KEY } from "../build/theme-script.ts";
import { Icon } from "../components/Icon.tsx";
import { mountIslands } from "./mount.tsx";
import { effectiveTheme, otherTheme, type Theme, themeLabel } from "./theme.ts";

function currentTheme(): Theme {
  return effectiveTheme(
    document.documentElement.getAttribute("data-theme"),
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const toggle = (): void => {
    const next = otherTheme(theme);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked; the choice then lasts for this page view only.
    }
    setTheme(next);
  };
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={themeLabel(theme)}>
      <Icon name={theme === "dark" ? "sun" : "moon"} />
    </button>
  );
}

mountIslands("theme-toggle", ThemeToggle);
