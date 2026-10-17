export enum GameStateId {
  MENU = 'MENU',
  LEVEL_SELECT = 'LEVEL_SELECT',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  GAME_OVER = 'GAME_OVER',
  SETTINGS = 'SETTINGS',
}

export type ColorId = string;
export type ObstacleKind = 'stone' | 'ice' | 'chain' | 'locked';
export type BubbleKind = 'normal' | ObstacleKind;
export type SpecialKind = 'bomb' | 'rainbow' | 'lightning' | 'fire' | 'freeze';

export interface Vec2 {
  x: number;
  y: number;
}

export interface CellPos {
  row: number;
  col: number;
}

/** A bubble sitting in the grid. `id` is unique per grid and links to its sprite. */
export interface BubbleData {
  id: number;
  color: ColorId | null;
  kind: BubbleKind;
  hp: number;
}

/** A bubble loaded in the launcher. Specials have `color === null`. */
export interface ShotBubble {
  color: ColorId | null;
  special: SpecialKind | null;
}

export interface ScoreBreakdown {
  match: number;
  blast: number;
  floating: number;
  obstacles: number;
  combo: number;
  total: number;
}

export interface Settings {
  music: boolean;
  sound: boolean;
  reducedEffects: boolean;
  aimGuide: boolean;
}

export interface LevelProgress {
  stars: number;
  highScore: number;
}

export interface SaveData {
  version: number;
  unlockedLevel: number;
  progress: Record<number, LevelProgress>;
  highScore: number;
  bestCombo: number;
  settings: Settings;
}

export type PowerUpKind = 'area' | 'line' | 'wild' | 'status';

export interface PowerUpDef {
  id: SpecialKind;
  label: string;
  kind: PowerUpKind;
  /** Hex-distance radius for 'area' power-ups. */
  rings?: number;
  /** Relative chance of being picked when several are enabled in a level. */
  weight: number;
}
