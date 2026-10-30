// The heart of the open-source card: eight particles per burst, on hover and on focus.
// Particles are aria-hidden spans animated with transform and opacity only (see components.css).
import { visualRandom } from "../lib/random.ts";

const PARTICLES = 8;
const LIFETIME_MS = 1100;

function burst(heart: HTMLElement, live: Set<HTMLElement>): void {
  for (let i = 0; i < PARTICLES; i++) {
    const particle = document.createElement("span");
    particle.className = "heart-particle";
    particle.setAttribute("aria-hidden", "true");
    const size = 6 + visualRandom() * 4;
    const rise = 30 + visualRandom() * 40;
    const side = (i / (PARTICLES - 1) - 0.5) * 2 * (30 + visualRandom() * 40);
    particle.style.setProperty("--size", `${size.toFixed(1)}px`);
    particle.style.setProperty("--dx", `${side.toFixed(1)}px`);
    particle.style.setProperty("--dy", `${(-rise).toFixed(1)}px`);
    heart.append(particle);
    live.add(particle);
    window.setTimeout(() => {
      particle.remove();
      live.delete(particle);
    }, LIFETIME_MS);
  }
}

function setup(card: HTMLElement): void {
  const heart = card.querySelector<HTMLElement>(".heart");
  if (!heart || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const live = new Set<HTMLElement>();
  let armed = true;
  const fire = (): void => {
    if (!armed) return;
    armed = false;
    burst(heart, live);
  };
  const clear = (): void => {
    for (const particle of live) particle.remove();
    live.clear();
  };
  card.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "touch" && matchMedia("(hover: hover)").matches) fire();
  });
  card.addEventListener("pointerleave", () => {
    armed = true;
  });
  card.addEventListener("focusin", fire);
  card.addEventListener("focusout", (event) => {
    if (!(event.relatedTarget instanceof Node) || !card.contains(event.relatedTarget)) armed = true;
  });
  // A hidden tab stops the animation: drop the particles instead of waiting for their timers.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });
}

for (const card of document.querySelectorAll<HTMLElement>('[data-island="heart-burst"]')) {
  setup(card);
}
