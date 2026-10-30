// Status preview on Home: one change every 4 s, an "ago" counter every second. Both states share
// one grid cell; the inactive one is aria-hidden, so screen readers get only the visible text.
// Without JavaScript or with reduced motion the first state stays fixed.
import { type PreviewClock, tick } from "../lib/preview-clock.ts";

function setup(root: HTMLElement): void {
  const states = [...root.querySelectorAll<HTMLElement>("[data-state]")];
  const ago = root.querySelector<HTMLElement>("[data-ago]");
  if (states.length < 2 || !ago) return;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  if (motion.matches) return;
  let clock: PreviewClock = { ago: 0, active: 0 };
  let onScreen = false;
  let timer: number | undefined;
  const show = (): void => {
    states.forEach((state, index) => {
      const active = index === clock.active;
      state.dataset.active = String(active);
      if (active) state.removeAttribute("aria-hidden");
      else state.setAttribute("aria-hidden", "true");
    });
    ago.textContent = String(clock.ago);
  };
  const stop = (): void => {
    window.clearInterval(timer);
    timer = undefined;
  };
  const sync = (): void => {
    const run = onScreen && !document.hidden;
    if (run && timer === undefined) {
      timer = window.setInterval(() => {
        clock = tick(clock, states.length);
        show();
      }, 1000);
    } else if (!run) stop();
  };
  new IntersectionObserver((entries) => {
    onScreen = entries.some((e) => e.isIntersecting);
    sync();
  }).observe(root);
  document.addEventListener("visibilitychange", sync);
  show();
}

for (const root of document.querySelectorAll<HTMLElement>('[data-island="live-preview"]')) {
  setup(root);
}
