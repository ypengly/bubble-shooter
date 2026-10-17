import { POWERUP_RULES } from '../config/GameConfig';
import type { ColorId, ShotBubble } from '../types/GameTypes';
import type { LevelDef } from '../types/LevelTypes';
import type { BubbleGrid } from './BubbleGrid';
import { rollSpecial } from './PowerUpSystem';

/**
 * The launcher's ammo queue: current + next bubble.
 * Colors are picked from what is actually on the board, so you never get a dead color.
 */
export class BubbleShooter {
  current: ShotBubble;
  next: ShotBubble;
  private shotsSinceSpecial = 0;

  constructor(
    private readonly level: LevelDef,
    grid: BubbleGrid,
    private readonly rng: () => number = Math.random,
  ) {
    this.current = this.generate(grid);
    this.next = this.generate(grid);
  }

  /** Takes the current bubble and advances the queue. */
  take(grid: BubbleGrid): ShotBubble {
    const shot = this.current;
    this.current = this.next;
    this.next = this.generate(grid);
    return shot;
  }

  swap(): void {
    const t = this.current;
    this.current = this.next;
    this.next = t;
  }

  /** Replaces queued colors that no longer exist on the board. Returns true if anything changed. */
  validate(grid: BubbleGrid): boolean {
    const present = grid.colorsPresent();
    if (present.length === 0) return false;
    let changed = false;
    const fix = (s: ShotBubble): ShotBubble => {
      if (s.special || (s.color && present.includes(s.color))) return s;
      changed = true;
      return { color: this.randomColor(present), special: null };
    };
    this.current = fix(this.current);
    this.next = fix(this.next);
    return changed;
  }

  private randomColor(present: ColorId[]): ColorId {
    return present[Math.min(present.length - 1, Math.floor(this.rng() * present.length))];
  }

  private generate(grid: BubbleGrid): ShotBubble {
    const specials = this.level.specials;
    if (specials) {
      this.shotsSinceSpecial++;
      const kind = rollSpecial(specials.types, specials.chance || POWERUP_RULES.defaultChance, this.shotsSinceSpecial, this.rng);
      if (kind) {
        this.shotsSinceSpecial = 0;
        return { color: null, special: kind };
      }
    }
    const present = grid.colorsPresent();
    const pool = present.length > 0 ? present : this.level.colors;
    return { color: this.randomColor(pool), special: null };
  }
}
