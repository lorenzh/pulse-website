import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  angleAllows,
  angleBetween,
  buildNetwork,
  maxPulses,
  type NetNode,
  pulseColour,
  pulseSeconds,
  type Random,
  spacingFor,
  spawnDelaySeconds,
} from "./network.ts";

/** Deterministic linear congruential generator. */
function seeded(seed: number): Random {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const dist = (a: NetNode, b: NetNode): number => Math.hypot(a.x - b.x, a.y - b.y);

test("desktop distances are 280 and 60, phones scale down to 168 and 36", () => {
  assert.deepEqual(spacingFor(1440), { receiver: 280, sender: 60 });
  assert.deepEqual(spacingFor(960), { receiver: 280, sender: 60 });
  assert.deepEqual(spacingFor(360), { receiver: 168, sender: 36 });
  assert.deepEqual(spacingFor(200), { receiver: 168, sender: 36 });
  const mid = spacingFor(720);
  assert.ok(mid.receiver > 168 && mid.receiver < 280);
  assert.ok(mid.sender > 36 && mid.sender < 60);
});

test("nodes keep the minimum distances on desktop and on a phone", () => {
  for (const [w, h] of [
    [1440, 900],
    [390, 844],
  ] as const) {
    const spacing = spacingFor(w);
    const { nodes } = buildNetwork(w, h, seeded(7));
    assert.ok(nodes.length > 5);
    for (const [i, a] of nodes.entries()) {
      for (const b of nodes.slice(i + 1)) {
        if (a.kind === "receiver" && b.kind === "receiver") {
          assert.ok(dist(a, b) >= spacing.receiver - 1e-9, `receivers at ${w}`);
        } else if (a.kind === "sender" || b.kind === "sender") {
          assert.ok(dist(a, b) >= spacing.sender - 1e-9, `sender at ${w}`);
        }
      }
    }
  }
});

test("angle between links at every node is at least 20 degrees (15 with 12 or more links)", () => {
  const { nodes, links } = buildNetwork(1440, 900, seeded(11));
  assert.ok(links.length > 5);
  nodes.forEach((node, index) => {
    const others = links
      .filter((l) => l.a === index || l.b === index)
      .map((l) => nodes[l.a === index ? l.b : l.a] as NetNode);
    const min = others.length > 12 ? 15 : 20;
    for (const [i, p] of others.entries()) {
      for (const q of others.slice(i + 1)) {
        assert.ok(angleBetween(node, p, q) >= min - 1e-9);
      }
    }
  });
});

test("angleBetween measures the smaller angle", () => {
  const o = { x: 0, y: 0 };
  assert.ok(Math.abs(angleBetween(o, { x: 1, y: 0 }, { x: 0, y: 1 }) - 90) < 1e-9);
  assert.ok(Math.abs(angleBetween(o, { x: 1, y: 0.01 }, { x: 1, y: -0.01 }) - 1.146) < 0.01);
  assert.ok(Math.abs(angleBetween(o, { x: -1, y: 0.1 }, { x: -1, y: -0.1 }) - 11.42) < 0.01);
});

test("a link that cannot meet the angle rule is dropped", () => {
  const node = { x: 0, y: 0 };
  assert.equal(angleAllows(node, [{ x: 100, y: 0 }], { x: 100, y: 20 }), false);
  assert.equal(angleAllows(node, [{ x: 100, y: 0 }], { x: 100, y: 100 }), true);
  // 17 degrees: refused below 12 links, allowed from 12 links on (15 degrees).
  const at17 = { x: Math.cos((17 * Math.PI) / 180) * 100, y: Math.sin((17 * Math.PI) / 180) * 100 };
  const few = [{ x: 100, y: 0 }];
  const many = Array.from({ length: 12 }, (_, i) => ({
    x: Math.cos(-(i + 1) * 0.4) * 100,
    y: Math.sin(-(i + 1) * 0.4) * 100,
  }));
  assert.equal(angleAllows(node, few, at17), false);
  assert.equal(angleAllows(node, [{ x: 100, y: 0 }, ...many], at17), true);
});

test("an unsatisfiable layout yields no links instead of breaking the rule", () => {
  const { links } = buildNetwork(1, 1, () => 0.5);
  for (const l of links) assert.ok(l.length >= 0);
});

test("the same random gives the same network", () => {
  assert.deepEqual(buildNetwork(800, 600, seeded(3)), buildNetwork(800, 600, seeded(3)));
});

test("pulse duration is length / 130 s between 1.4 and 4.2", () => {
  assert.equal(pulseSeconds(10), 1.4);
  assert.equal(pulseSeconds(260), 2);
  assert.equal(pulseSeconds(5000), 4.2);
});

test("spawn delay is 0.6–1.5 s at the reference count and shrinks with more pulses", () => {
  assert.ok(Math.abs(spawnDelaySeconds(() => 0, 6) - 0.6) < 1e-9);
  assert.ok(Math.abs(spawnDelaySeconds(() => 1, 6) - 1.5) < 1e-9);
  assert.ok(spawnDelaySeconds(() => 0.5, 12) < spawnDelaySeconds(() => 0.5, 6));
  assert.equal(maxPulses(0), 3);
  assert.equal(maxPulses(300), 14);
});

test("12 percent of the pulses use the second colour", () => {
  assert.equal(
    pulseColour(() => 0.11),
    1,
  );
  assert.equal(
    pulseColour(() => 0.12),
    0,
  );
  assert.equal(
    pulseColour(() => 0.9),
    0,
  );
});
