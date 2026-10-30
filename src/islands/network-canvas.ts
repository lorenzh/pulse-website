// Node-network background of Home and Hosted: a fixed, viewport-sized canvas behind the content.
// Placement and timing rules are pure and tested in src/lib; this file only draws.
//  - Sizes are measured on resize only; the frame loop reads no layout.
//  - Theme colours are read from the tokens on theme change, not per frame.
//  - The loop stops while the tab is hidden or the canvas is off screen.
//  - Reduced motion draws one static frame (nodes and links, no pulses), redrawn on resize.

import {
  buildNetwork,
  maxPulses,
  type Network,
  pulseColour,
  pulseSeconds,
  spawnDelaySeconds,
} from "../lib/network.ts";
import { visualRandom } from "../lib/random.ts";
import { skipFrame } from "../lib/throttle.ts";

type Pulse = { link: number; forward: boolean; start: number; seconds: number; colour: 0 | 1 };
type Palette = { line: string; node: string; pulse: [string, string] };

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const get = (name: string): string => style.getPropertyValue(name).trim();
  return {
    line: get("--net-line"),
    node: get("--net-node"),
    pulse: [get("--net-pulse"), get("--net-pulse2")],
  };
}

function setup(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const ctx = context;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let network: Network = { nodes: [], links: [] };
  let palette = readPalette();
  let pulses: Pulse[] = [];
  let width = 0;
  let height = 0;
  let frame: number | undefined;
  let last = 0;
  let nextSpawn = 0;
  let onScreen = true;

  function drawNetwork(): void {
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.line;
    ctx.beginPath();
    for (const link of network.links) {
      const a = network.nodes[link.a];
      const b = network.nodes[link.b];
      if (!a || !b) continue;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    ctx.fillStyle = palette.node;
    for (const node of network.nodes) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.kind === "receiver" ? 5 : 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPulse(pulse: Pulse, now: number): boolean {
    const link = network.links[pulse.link];
    const t = (now - pulse.start) / (pulse.seconds * 1000);
    if (!link || t >= 1) return false;
    const from = network.nodes[pulse.forward ? link.a : link.b];
    const to = network.nodes[pulse.forward ? link.b : link.a];
    if (!from || !to) return false;
    const tail = Math.max(0, t - 0.12);
    ctx.strokeStyle = palette.pulse[pulse.colour];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(from.x + (to.x - from.x) * tail, from.y + (to.y - from.y) * tail);
    ctx.lineTo(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    ctx.stroke();
    return true;
  }

  function step(now: number): void {
    frame = undefined;
    if (!onScreen || document.hidden || motion.matches) return;
    frame = requestAnimationFrame(step);
    if (skipFrame(now, last)) return;
    last = now;
    const max = maxPulses(network.links.length);
    if (now >= nextSpawn && pulses.length < max && network.links.length > 0) {
      const index = Math.floor(visualRandom() * network.links.length);
      const link = network.links[index];
      if (link) {
        pulses.push({
          link: index,
          forward: visualRandom() < 0.5,
          start: now,
          seconds: pulseSeconds(link.length),
          colour: pulseColour(visualRandom),
        });
      }
      nextSpawn = now + spawnDelaySeconds(visualRandom, max) * 1000;
    }
    drawNetwork();
    pulses = pulses.filter((pulse) => drawPulse(pulse, now));
  }

  function sync(): void {
    const run = onScreen && !document.hidden && !motion.matches;
    if (run && frame === undefined) frame = requestAnimationFrame(step);
    else if (!run && frame !== undefined) {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
    if (!run) drawNetwork();
  }

  function resize(): void {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    network = buildNetwork(width, height, visualRandom);
    pulses = [];
    drawNetwork();
  }

  const recolour = (): void => {
    palette = readPalette();
    drawNetwork();
  };

  resize();
  window.addEventListener("resize", resize);
  new MutationObserver(recolour).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", recolour);
  motion.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  new IntersectionObserver((entries) => {
    onScreen = entries.some((e) => e.isIntersecting);
    sync();
  }).observe(canvas);
  sync();
}

function start(): void {
  for (const canvas of document.querySelectorAll<HTMLCanvasElement>(
    'canvas[data-island="network-canvas"]',
  )) {
    setup(canvas);
  }
}

// Start after load, when the browser is idle, so the canvas never competes with first paint.
if (document.readyState === "complete") start();
else {
  window.addEventListener("load", () => {
    if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 1500 });
    else setTimeout(start, 200);
  });
}
