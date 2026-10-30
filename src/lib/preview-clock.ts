/** Seconds between two changes of the status preview. */
export const CHANGE_EVERY_S = 4;

export type PreviewClock = { ago: number; active: number };

/** One second passes: the "ago" counter ticks; every 4 s the visible state changes and it resets. */
export function tick(clock: PreviewClock, states: number): PreviewClock {
  const ago = clock.ago + 1;
  if (ago >= CHANGE_EVERY_S) return { ago: 0, active: (clock.active + 1) % states };
  return { ago, active: clock.active };
}
