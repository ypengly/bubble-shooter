import { DANGER_ROW, POWERUP_RULES } from '../config/GameConfig';
import { MATCH_MIN } from '../config/GameConfig';
import type { BubbleData, CellPos, ShotBubble } from '../types/GameTypes';
import type { LevelDef } from '../types/LevelTypes';
import { BubbleGrid } from './BubbleGrid';
import { BubbleShooter } from './BubbleShooter';
import { traceShot, type TraceResult } from './CollisionSystem';
import { ComboSystem } from './ComboSystem';
import { ScoreManager } from './ScoreManager';
import { resolveShot, type ShotOutcome } from './ShotResolver';
import type { ScoreBreakdown } from '../types/GameTypes';

export type RunStatus = 'playing' | 'won' | 'lost';
export type LoseReason = 'moves' | 'overflow';

export interface FireInfo {
  shot: ShotBubble;
  trace: TraceResult;
  landing: CellPos;
  angle: number;
}

export interface TurnResult {
  outcome: ShotOutcome;
  breakdown: ScoreBreakdown;
  comboLevel: number;
  score: number;
  movesLeft: number;
  missCount: number;
  missLimit: number;
  /** The shot popped nothing and was not a freeze. */
  missed: boolean;
  newRow: BubbleData[] | null;
  warning: boolean;
  freezeLeft: number;
  status: RunStatus;
  loseReason: LoseReason | null;
  /** Points added for unused shots when the level is won. */
  finalBonus: number;
  stars: number;
  cleared: boolean;
}

/**
 * All rules of one run, free of rendering. GameScene animates the results;
 * tools/simulate.mjs plays it with a bot.
 */
export class GameSession {
  readonly grid: BubbleGrid;
  readonly queue: BubbleShooter;
  readonly scoring = new ScoreManager();
  readonly combo = new ComboSystem();
  movesLeft: number;
  missCount = 0;
  freezeLeft = 0;
  status: RunStatus = 'playing';
  loseReason: LoseReason | null = null;
  stars = 0;
  finalBonus = 0;

  constructor(
    readonly level: LevelDef,
    private readonly rng: () => number = Math.random,
  ) {
    this.grid = BubbleGrid.fromLevel(level);
    this.queue = new BubbleShooter(level, this.grid, rng);
    this.movesLeft = level.moves;
  }

  get score(): number {
    return this.scoring.total;
  }

  /** Consumes the current bubble and traces its path. Returns null if nothing can be fired. */
  fire(angle: number): FireInfo | null {
    if (this.status !== 'playing' || this.movesLeft <= 0) return null;
    const trace = traceShot(this.grid, angle);
    if (!trace.landing) {
      this.status = 'lost';
      this.loseReason = 'overflow';
      return null;
    }
    const shot = this.queue.take(this.grid);
    this.movesLeft--;
    return { shot, trace, landing: trace.landing, angle };
  }

  /** Applies the shot to the grid and updates score, combo, misses and win/lose state. */
  land(info: FireInfo): TurnResult {
    const outcome = resolveShot(this.grid, info.shot, info.landing, info.angle);
    const popped = outcome.matched.length >= MATCH_MIN || outcome.blasted.length > 0;
    const comboLevel = this.combo.register(popped);
    const breakdown = ScoreManager.scoreOutcome(outcome, comboLevel);
    this.scoring.add(breakdown);

    const frozenNow = this.freezeLeft > 0 || outcome.freeze;
    if (outcome.freeze) this.freezeLeft = POWERUP_RULES.freezeShots;
    else if (this.freezeLeft > 0) this.freezeLeft--;

    this.queue.validate(this.grid);

    const missed = !popped && !outcome.freeze;
    let newRow: BubbleData[] | null = null;
    let cleared = false;

    if (this.score >= this.level.targetScore) {
      this.win(false);
    } else if (this.grid.clearableCount() === 0) {
      cleared = true;
      this.win(true);
    } else {
      if (missed && !frozenNow) {
        this.missCount++;
        if (this.missCount >= this.level.missLimit) {
          this.missCount = 0;
          newRow = this.grid.insertTopRow(() => this.rowColor());
          if (!newRow) this.lose('overflow');
        }
      }
      if (this.status === 'playing') {
        if (this.grid.lowestRow() >= DANGER_ROW) this.lose('overflow');
        else if (this.movesLeft <= 0) this.lose('moves');
      }
    }

    return {
      outcome,
      breakdown,
      comboLevel,
      score: this.score,
      movesLeft: this.movesLeft,
      missCount: this.missCount,
      missLimit: this.level.missLimit,
      missed,
      newRow,
      warning: this.status === 'playing' && this.level.missLimit > 1 && this.missCount === this.level.missLimit - 1,
      freezeLeft: this.freezeLeft,
      status: this.status,
      loseReason: this.loseReason,
      finalBonus: this.finalBonus,
      stars: this.stars,
      cleared,
    };
  }

  /** Dev cheat: win immediately. */
  forceWin(): void {
    if (this.status !== 'playing') return;
    if (this.score < this.level.targetScore) this.scoring.add(this.level.targetScore - this.score);
    this.win(false);
  }

  private win(cleared: boolean): void {
    this.status = 'won';
    this.finalBonus = ScoreManager.movesBonus(this.movesLeft);
    this.scoring.add(this.finalBonus);
    this.stars = ScoreManager.stars(this.movesLeft, this.level.moves, cleared);
  }

  private lose(reason: LoseReason): void {
    this.status = 'lost';
    this.loseReason = reason;
  }

  private rowColor(): string {
    const present = this.grid.colorsPresent();
    const pool = present.length > 0 ? present : this.level.colors;
    return pool[Math.min(pool.length - 1, Math.floor(this.rng() * pool.length))];
  }
}
