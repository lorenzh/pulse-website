import { useEffect, useState } from "react";
import { Icon } from "../components/Icon.tsx";
import { mountIslands } from "./mount.tsx";

type CopyState = "idle" | "done" | "failed";

const TIP: Record<CopyState, string> = { idle: "", done: "Copied", failed: "Copy blocked" };
/** How long the tooltip and the check icon stay. */
const RESET_MS = 1500;

function CopyButton({ slot }: { slot: HTMLElement }) {
  const [state, setState] = useState<CopyState>("idle");
  // The tooltip resets after 1.5 s; a hidden tab resets it at once instead of keeping a timer.
  useEffect(() => {
    if (state === "idle") return;
    const reset = (): void => setState("idle");
    const timer = setTimeout(reset, RESET_MS);
    const onVisibility = (): void => {
      if (document.hidden) reset();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [state]);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(slot.dataset.copy ?? "");
      setState("done");
    } catch {
      setState("failed");
    }
  };
  return (
    <>
      <button
        type="button"
        className={`copy-btn${state === "done" ? " is-done" : ""}`}
        aria-label="Copy commands"
        onClick={copy}
      >
        <Icon name={state === "done" ? "check" : "copy"} size={18} />
      </button>
      <span className="copy-tip" role="status" data-show={state !== "idle"}>
        {TIP[state]}
      </span>
    </>
  );
}

mountIslands("copy-button", CopyButton);
