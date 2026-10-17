/**
 * Developer tools. Everything here is OFF in production builds (`vite build`).
 * In dev, add `?debug` to the URL to show the overlay from the start.
 */
export const DEBUG_CONFIG = {
  /** Master switch. Production builds always disable it. */
  enabled: import.meta.env.DEV,
  /** Keyboard cheats: N next level, R restart, W win, G grid debug, P pause. */
  cheatKeys: import.meta.env.DEV,
  /** Show the FPS/state overlay at startup (also enabled by `?debug`). */
  overlayOnStart: false,
};

export function debugOverlayWanted(): boolean {
  if (!DEBUG_CONFIG.enabled) return false;
  try {
    return DEBUG_CONFIG.overlayOnStart || new URLSearchParams(window.location.search).has('debug');
  } catch {
    return DEBUG_CONFIG.overlayOnStart;
  }
}
