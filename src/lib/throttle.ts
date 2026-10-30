/** Frame interval of the background canvas: about 30 frames per second. */
export const FRAME_MS = 33;

/** True when the frame at `now` comes too soon after the last drawn frame at `last`. */
export function skipFrame(now: number, last: number): boolean {
  return now - last < FRAME_MS;
}
