import { createHash } from "node:crypto";
import { THEME_SCRIPT } from "./theme-script.ts";

/** CSP source for a later `script-src`: no CSP header exists yet, so this is only recorded. */
export function themeScriptHash(): string {
  return `sha256-${createHash("sha256").update(THEME_SCRIPT).digest("base64")}`;
}
