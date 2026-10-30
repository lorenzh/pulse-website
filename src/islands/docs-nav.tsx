import { useEffect, useRef } from "react";
import { mountIslands } from "./mount.tsx";

/** Adds Escape and close-on-follow to the docs navigation, which works as a plain details without JS. */
function DocsNav() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const details = marker.current?.closest("details");
    if (!details) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && details.open) {
        details.open = false;
        details.querySelector("summary")?.focus();
      }
    };
    const onClick = (event: Event): void => {
      if (event.target instanceof Element && event.target.closest("a")) details.open = false;
    };
    details.addEventListener("keydown", onKey);
    details.addEventListener("click", onClick);
    return () => {
      details.removeEventListener("keydown", onKey);
      details.removeEventListener("click", onClick);
    };
  }, []);
  return <span ref={marker} />;
}

mountIslands("docs-nav", DocsNav);
