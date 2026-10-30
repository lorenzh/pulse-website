import { createHash } from "node:crypto";
import { THEME_SCRIPT } from "./theme-script.ts";

/** CSP source of the inline theme script; `csp.ts` puts it into `script-src`. */
export function themeScriptHash(): string {
  return `sha256-${createHash("sha256").update(THEME_SCRIPT).digest("base64")}`;
}
