import type { ComponentType } from "react";
import { createRoot } from "react-dom/client";

/** Renders `Component` into every `[data-island="<name>"]` slot of the page. */
export function mountIslands(name: string, Component: ComponentType): void {
  for (const slot of document.querySelectorAll(`[data-island="${name}"]`)) {
    createRoot(slot).render(<Component />);
  }
}
