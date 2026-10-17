import { RAW_LEVELS } from '../data/GameData';
import type { LevelDef } from '../types/LevelTypes';
import { createFallbackLevel, validateLevel } from './LevelValidator';

/**
 * Load JSON -> validate -> hand out ready-to-play levels.
 * A broken level is logged and replaced by a safe fallback; it never crashes the game.
 */
class LevelManagerImpl {
  private levels = new Map<number, LevelDef>();
  private order: number[] = [];

  constructor() {
    RAW_LEVELS.forEach(({ path, raw }, index) => {
      const hint = Number(/(\d+)\.json$/.exec(path)?.[1] ?? index + 1);
      const result = validateLevel(raw, hint);
      result.warnings.forEach((w) => console.warn(`[level ${path}] ${w}`));
      if (result.level) {
        this.levels.set(result.level.id, result.level);
      } else {
        console.error(`[level ${path}] invalid, using fallback:`, result.errors.join('; '));
        this.levels.set(hint, createFallbackLevel(hint));
      }
    });
    this.order = [...this.levels.keys()].sort((a, b) => a - b);
    if (this.order.length === 0) {
      console.error('[levels] none found, creating one fallback level');
      this.levels.set(1, createFallbackLevel(1));
      this.order = [1];
    }
  }

  get ids(): readonly number[] {
    return this.order;
  }

  get count(): number {
    return this.order.length;
  }

  has(id: number): boolean {
    return this.levels.has(id);
  }

  /** Always returns a playable level (falls back to the first one for unknown ids). */
  get(id: number): LevelDef {
    return this.levels.get(id) ?? (this.levels.get(this.order[0]) as LevelDef);
  }

  next(id: number): number | null {
    const i = this.order.indexOf(id);
    return i >= 0 && i < this.order.length - 1 ? this.order[i + 1] : null;
  }
}

export const LevelManager = new LevelManagerImpl();
