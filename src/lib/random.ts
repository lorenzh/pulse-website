import type { Random } from "./network.ts";

/** Visual randomness only (node positions, particles); nothing here is security relevant. */
// eslint-disable-next-line sonarjs/pseudo-random -- decorative effects, no security use
export const visualRandom: Random = () => Math.random();
