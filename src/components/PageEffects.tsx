/**
 * Slots of the Home and Hosted effects: the decorative network canvas (hidden from assistive
 * technology, no pointer events) and the script that reveals `[data-reveal]` items on scroll.
 * Without JavaScript neither does anything and all content is visible.
 */
export function PageEffects() {
  return (
    <>
      {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: a canvas is not focusable, it only paints */}
      <canvas className="net-canvas" aria-hidden="true" data-island="network-canvas" />
      <span hidden data-island="scroll-reveal" />
    </>
  );
}
