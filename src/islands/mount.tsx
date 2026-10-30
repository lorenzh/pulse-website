import type { ComponentType } from "react";
import { createRoot } from "react-dom/client";

/** Renders `Component` into every `[data-island="<name>"]` slot of the page. */
export function mountIslands(name: string, Component: ComponentType<{ slot: HTMLElement }>): void {
  for (const slot of document.querySelectorAll<HTMLElement>(`[data-island="${name}"]`)) {
    createRoot(slot).render(<Component slot={slot} />);
  }
}
