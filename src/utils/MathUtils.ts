export const clamp = (v: number, min: number, max: number): number => (v < min ? min : v > max ? max : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
/** Frame-rate independent smoothing factor. */
export const smoothFactor = (rate: number, dtMs: number): number => 1 - Math.exp(-rate * (dtMs / 1000));
/** Angle from vertical (positive = right) from an origin to a point. */
export const angleFromVertical = (ox: number, oy: number, px: number, py: number): number => Math.atan2(px - ox, oy - py);

export function pick<T>(arr: readonly T[], rng: () => number = Math.random): T {
  return arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const formatNumber = (n: number): string => Math.round(n).toLocaleString('en-US');
