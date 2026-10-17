/**
 * Optional external assets. The game is fully playable with none of these:
 * all visuals/audio are generated procedurally. Add entries to override.
 * A failed load only logs a warning and the procedural version is used.
 */
export interface OptionalImage {
  key: string;
  url: string;
}

export const OPTIONAL_IMAGES: OptionalImage[] = [
  // { key: 'my_logo', url: 'assets/images/ui/logo.png' },
];
