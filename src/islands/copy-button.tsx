import { useState } from "react";
import { mountIslands } from "./mount.tsx";

type CopyState = "idle" | "done" | "failed";

const LABEL: Record<CopyState, string> = { idle: "Copy", done: "Copied", failed: "Copy failed" };

function CopyButton() {
  const [state, setState] = useState<CopyState>("idle");
  const copy = async (event: { currentTarget: HTMLButtonElement }): Promise<void> => {
    const code = event.currentTarget.closest(".code-block")?.querySelector("code")?.textContent;
    try {
      await navigator.clipboard.writeText(code ?? "");
      setState("done");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  };
  return (
    <>
      <button type="button" className="copy-btn" onClick={copy}>
        {LABEL[state]}
        <span className="sr-only"> code to clipboard</span>
      </button>
      <span className="sr-only" role="status">
        {state === "idle" ? "" : LABEL[state]}
      </span>
    </>
  );
}

mountIslands("copy-button", CopyButton);
