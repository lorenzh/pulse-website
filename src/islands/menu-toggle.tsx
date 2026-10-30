import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon.tsx";
import { mountIslands } from "./mount.tsx";

function MenuToggle() {
  const [isOpen, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const nav = document.getElementById("site-nav");
    if (!nav) return;
    nav.dataset.open = String(isOpen);
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && isOpen) {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (event: Event): void => {
      if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    nav.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      nav.removeEventListener("click", onClick);
    };
  }, [isOpen]);
  return (
    <button
      ref={button}
      type="button"
      className="icon-btn menu-btn"
      aria-expanded={isOpen}
      aria-controls="site-nav"
      aria-label={isOpen ? "Close menu" : "Open menu"}
      onClick={() => setOpen(!isOpen)}
    >
      <Icon name={isOpen ? "close" : "menu"} />
    </button>
  );
}

mountIslands("menu-toggle", MenuToggle);
