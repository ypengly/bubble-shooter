/** Pure constants shared by game logic and rendering. No Phaser imports here. */

export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 960;

/** Bubble textures are baked at this multiple of their on-screen size for crispness. */
export const TEX_RES = 2;
export const BUBBLE_RADIUS = 24;
export const BUBBLE_DIAMETER = BUBBLE_RADIUS * 2;
export const BUBBLE_SCALE = 1 / TEX_RES;

export const GRID_COLS = 11;
export const GRID_MAX_ROWS = 15;
export const ROW_HEIGHT = BUBBLE_RADIUS * Math.sqrt(3);
export const BOARD_LEFT = (GAME_WIDTH - GRID_COLS * BUBBLE_DIAMETER) / 2;
export const BOARD_RIGHT = BOARD_LEFT + GRID_COLS * BUBBLE_DIAMETER;
/** Y of the ceiling (top edge of row 0). */
export const GRID_TOP = 160;
/** A bubble in this row (or lower) ends the game. */
export const DANGER_ROW = 13;
export const DANGER_LINE_Y = GRID_TOP + DANGER_ROW * ROW_HEIGHT;
/** Layout rows beyond this are ignored so a level never starts in danger. */
export const MAX_LAYOUT_ROWS = DANGER_ROW - 2;

export const LAUNCHER_X = GAME_WIDTH / 2;
export const LAUNCHER_Y = 856;
export const MAX_AIM_ANGLE = 1.3;
export const AIM_SMOOTHING = 26;

export const SHOT = {
  /** Projectile speed in px/s. */
  speed: 1750,
  /** Step used when tracing a path. Smaller = more accurate, slower. */
  traceStep: 4,
  /** Collision distance as a fraction of the bubble diameter. */
  collisionFactor: 0.9,
  maxBounces: 14,
  previewBounces: 3,
  maxSteps: 7000,
} as const;

export const MATCH_MIN = 3;

export const SCORING = {
  matchTable: { 3: 30, 4: 50, 5: 80 } as Record<number, number>,
  /** 6+ bubbles: matchTable[5] + (n - 5) * bigStep + bigBonus */
  bigStep: 40,
  bigBonus: 100,
  floatBase: 20,
  floatStep: 10,
  floatCap: 100,
  blastPerBubble: 15,
  obstacleConverted: 25,
} as const;

/** Bonus by combo level (index = level). Beyond the table: last + extra per level. */
export const COMBO_BONUS: readonly number[] = [0, 0, 250, 500, 1000, 1500, 2000];
export const COMBO_BONUS_EXTRA = 500;

/** Bonus points per unused shot when a level is won. */
export const MOVES_BONUS = 50;

/** Star thresholds as a fraction of shots remaining when the level is won. */
export const STARS = { three: 0.5, two: 0.25 } as const;

export const MISS = { defaultLimit: 5, minLimit: 2, maxLimit: 10 } as const;

export const POWERUP_RULES = {
  defaultChance: 0.08,
  /** Guarantee a special after this many shots without one (if the level enables any). */
  pityShots: 12,
  freezeShots: 3,
  /** 'auto': steep shots clear a column, shallow shots clear a row. */
  lightningMode: 'auto' as 'row' | 'column' | 'auto',
  autoColumnAngle: 0.4,
} as const;
