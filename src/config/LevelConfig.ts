export const LEVEL_FILE_GLOB = './levels/*.json';

/** Used when a level file is missing or fails validation. */
export const FALLBACK_LEVEL = {
  name: 'Practice',
  moves: 25,
  targetScore: 600,
  colors: ['red', 'blue', 'green'],
  rows: 4,
  missLimit: 6,
} as const;
