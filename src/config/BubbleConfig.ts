import type { BubbleKind, ObstacleKind, PowerUpDef, SpecialKind } from '../types/GameTypes';

export type SymbolShape = 'triangle' | 'circle' | 'square' | 'star' | 'diamond' | 'cross';

export interface BubbleColorDef {
  id: string;
  name: string;
  fill: string;
  light: string;
  dark: string;
  /** Hex tint used for particles and popups. */
  tint: number;
  /** Shape drawn on the bubble so colors never rely on hue alone. */
  symbol: SymbolShape;
}

/**
 * Add a color here and it is available everywhere: levels, textures, particles.
 * Textures for each color are generated automatically in TextureFactory.
 */
export const BUBBLE_COLORS: Record<string, BubbleColorDef> = {
  red: { id: 'red', name: 'Red', fill: '#ff4b5c', light: '#ff9aa4', dark: '#b81f33', tint: 0xff4b5c, symbol: 'triangle' },
  blue: { id: 'blue', name: 'Blue', fill: '#3aa0ff', light: '#9fd2ff', dark: '#1b64c2', tint: 0x3aa0ff, symbol: 'circle' },
  green: { id: 'green', name: 'Green', fill: '#4cd964', light: '#a4f0b1', dark: '#1f9a37', tint: 0x4cd964, symbol: 'square' },
  yellow: { id: 'yellow', name: 'Yellow', fill: '#ffd93b', light: '#fff0a0', dark: '#cf9f00', tint: 0xffd93b, symbol: 'star' },
  purple: { id: 'purple', name: 'Purple', fill: '#a65cff', light: '#d3aaff', dark: '#6a2bc2', tint: 0xa65cff, symbol: 'diamond' },
  orange: { id: 'orange', name: 'Orange', fill: '#ff9a2e', light: '#ffcd8a', dark: '#c25f00', tint: 0xff9a2e, symbol: 'cross' },
};

export const COLOR_IDS: string[] = Object.keys(BUBBLE_COLORS);

export function isValidColor(id: unknown): id is string {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(BUBBLE_COLORS, id);
}

export interface ObstacleDef {
  kind: ObstacleKind;
  /** Hits needed before it turns into a normal bubble (0 = indestructible by matches). */
  hp: number;
  /**
   * What damages it:
   *  - 'pop'    : a bubble next to it is popped
   *  - 'impact' : a shot lands next to it
   *  - 'none'   : only special bubbles (bomb/fire/lightning) or falling can remove it
   */
  trigger: 'pop' | 'impact' | 'none';
  /** Whether it carries a color (and becomes a normal bubble of that color). */
  hasColor: boolean;
}

export const OBSTACLES: Record<ObstacleKind, ObstacleDef> = {
  stone: { kind: 'stone', hp: 0, trigger: 'none', hasColor: false },
  ice: { kind: 'ice', hp: 2, trigger: 'pop', hasColor: true },
  locked: { kind: 'locked', hp: 1, trigger: 'pop', hasColor: true },
  chain: { kind: 'chain', hp: 3, trigger: 'impact', hasColor: true },
};

export function isObstacle(kind: BubbleKind): kind is ObstacleKind {
  return kind !== 'normal';
}

export function initialHp(kind: BubbleKind): number {
  return kind === 'normal' ? 0 : OBSTACLES[kind].hp;
}

/**
 * Special bubbles. To add one: add an entry here, handle it in
 * PowerUpSystem / ShotResolver, and add a texture in TextureFactory.
 */
export const POWERUPS: Record<SpecialKind, PowerUpDef> = {
  bomb: { id: 'bomb', label: 'Bomb', kind: 'area', rings: 1, weight: 3 },
  fire: { id: 'fire', label: 'Fire', kind: 'area', rings: 2, weight: 2 },
  lightning: { id: 'lightning', label: 'Lightning', kind: 'line', weight: 2 },
  rainbow: { id: 'rainbow', label: 'Rainbow', kind: 'wild', weight: 3 },
  freeze: { id: 'freeze', label: 'Freeze', kind: 'status', weight: 1 },
};

export const SPECIAL_IDS = Object.keys(POWERUPS) as SpecialKind[];

export function isValidSpecial(id: unknown): id is SpecialKind {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(POWERUPS, id);
}
