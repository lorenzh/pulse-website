// Pure placement logic of the node-network background. No DOM, no clock; the random source is
// injected so tests are deterministic.

export type Random = () => number;
export type NodeKind = "receiver" | "sender";
export type NetNode = { x: number; y: number; kind: NodeKind };
export type NetLink = { a: number; b: number; length: number };
export type Network = { nodes: NetNode[]; links: NetLink[] };

export type Spacing = { receiver: number; sender: number };

/** Minimum distances on a desktop viewport. */
export const DESKTOP_SPACING: Spacing = { receiver: 280, sender: 60 };
/** Floor of the scaled distances on phones. */
export const PHONE_SPACING: Spacing = { receiver: 168, sender: 36 };
/** Viewport width from which the desktop distances apply. */
export const DESKTOP_WIDTH = 960;

export const MIN_ANGLE_DEG = 20;
export const MIN_ANGLE_BUSY_DEG = 15;
export const BUSY_LINKS = 12;
export const SECOND_COLOUR_SHARE = 0.12;

/** Distances for a viewport: desktop above 960 px, scaled with the width on narrower screens. */
export function spacingFor(width: number): Spacing {
  const scale = Math.min(1, width / DESKTOP_WIDTH);
  return {
    receiver: Math.max(PHONE_SPACING.receiver, Math.round(DESKTOP_SPACING.receiver * scale)),
    sender: Math.max(PHONE_SPACING.sender, Math.round(DESKTOP_SPACING.sender * scale)),
  };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Smallest angle in degrees between the directions from `from` to `p` and to `q`. */
export function angleBetween(
  from: { x: number; y: number },
  p: { x: number; y: number },
  q: { x: number; y: number },
): number {
  const a1 = Math.atan2(p.y - from.y, p.x - from.x);
  const a2 = Math.atan2(q.y - from.y, q.x - from.x);
  let diff = Math.abs(a1 - a2);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  return (diff * 180) / Math.PI;
}

/** The angle rule for a new link at `node`: >= 20°, or >= 15° once the node has 12 or more links. */
export function angleAllows(
  node: { x: number; y: number },
  existing: { x: number; y: number }[],
  candidate: { x: number; y: number },
): boolean {
  const min = existing.length >= BUSY_LINKS ? MIN_ANGLE_BUSY_DEG : MIN_ANGLE_DEG;
  return existing.every((other) => angleBetween(node, other, candidate) >= min);
}

function scatter(
  count: number,
  kind: NodeKind,
  min: number,
  size: { width: number; height: number },
  placed: NetNode[],
  random: Random,
): void {
  const margin = 12;
  for (let n = 0; n < count; n++) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const candidate: NetNode = {
        kind,
        x: margin + random() * Math.max(1, size.width - 2 * margin),
        y: margin + random() * Math.max(1, size.height - 2 * margin),
      };
      // Receivers keep their distance from receivers; senders from every node.
      const ok = placed.every(
        (other) =>
          (kind === "receiver" && other.kind !== "receiver") || distance(candidate, other) >= min,
      );
      if (ok) {
        placed.push(candidate);
        break;
      }
    }
  }
}

/** How many nodes of each kind fit a viewport; bounded so the draw stays cheap. */
export function nodeCounts(
  width: number,
  height: number,
  spacing: Spacing,
): { receivers: number; senders: number } {
  const area = width * height;
  const receivers = Math.max(3, Math.min(14, Math.round(area / (spacing.receiver ** 2 * 3))));
  const senders = Math.max(6, Math.min(40, Math.round(area / (spacing.receiver ** 2 * 1.2))));
  return { receivers, senders };
}

function addLink(network: Network, linksOf: Map<number, number[]>, a: number, b: number): boolean {
  const na = network.nodes[a];
  const nb = network.nodes[b];
  if (!na || !nb || a === b) return false;
  const ofA = linksOf.get(a) ?? [];
  const ofB = linksOf.get(b) ?? [];
  if (ofA.includes(b)) return false;
  const points = (list: number[]): { x: number; y: number }[] =>
    list.flatMap((i) => {
      const n = network.nodes[i];
      return n ? [n] : [];
    });
  // A link that would break the angle rule at either end is dropped, not bent.
  if (!angleAllows(na, points(ofA), nb) || !angleAllows(nb, points(ofB), na)) return false;
  network.links.push({ a, b, length: distance(na, nb) });
  linksOf.set(a, [...ofA, b]);
  linksOf.set(b, [...ofB, a]);
  return true;
}

function nearest(network: Network, from: number, kind: NodeKind, count: number): number[] {
  const origin = network.nodes[from];
  if (!origin) return [];
  return network.nodes
    .map((node, index) => ({ node, index, d: distance(origin, node) }))
    .filter((c) => c.index !== from && c.node.kind === kind)
    .sort((x, y) => x.d - y.d)
    .slice(0, count)
    .map((c) => c.index);
}

/** Places receivers and senders and links them. Pure: same random, same network. */
export function buildNetwork(width: number, height: number, random: Random): Network {
  const spacing = spacingFor(width);
  const counts = nodeCounts(width, height, spacing);
  const nodes: NetNode[] = [];
  scatter(counts.receivers, "receiver", spacing.receiver, { width, height }, nodes, random);
  scatter(counts.senders, "sender", spacing.sender, { width, height }, nodes, random);
  const network: Network = { nodes, links: [] };
  const linksOf = new Map<number, number[]>();
  nodes.forEach((node, index) => {
    if (node.kind === "receiver") {
      for (const other of nearest(network, index, "receiver", 2))
        addLink(network, linksOf, index, other);
    } else {
      for (const other of nearest(network, index, "receiver", 1))
        addLink(network, linksOf, index, other);
    }
  });
  return network;
}

/** Seconds a pulse needs for a link of `length` px: length / 130 s, between 1.4 and 4.2. */
export function pulseSeconds(length: number): number {
  return Math.min(4.2, Math.max(1.4, length / 130));
}

/** Most pulses alive at once for a network with `linkCount` links. */
export function maxPulses(linkCount: number): number {
  return Math.max(3, Math.min(14, Math.round(linkCount / 3)));
}

/** Seconds until the next pulse spawns: 0.6–1.5 s, scaled down when more pulses may run. */
export function spawnDelaySeconds(random: Random, max: number): number {
  return (0.6 + random() * 0.9) * (6 / Math.max(1, max));
}

/** 0 for the main colour, 1 for the second colour (12 % of the pulses). */
export function pulseColour(random: Random): 0 | 1 {
  return random() < SECOND_COLOUR_SHARE ? 1 : 0;
}
