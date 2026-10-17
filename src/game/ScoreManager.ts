import { COMBO_BONUS, COMBO_BONUS_EXTRA, MATCH_MIN, MOVES_BONUS, SCORING, STARS } from '../config/GameConfig';
import type { ScoreBreakdown } from '../types/GameTypes';
import type { ShotOutcome } from './ShotResolver';

/** The only place scoring rules live. Tune numbers in GameConfig.SCORING / COMBO_BONUS. */
export class ScoreManager {
  total = 0;

  static matchPoints(n: number): number {
    if (n < MATCH_MIN) return 0;
    const direct = SCORING.matchTable[n];
    if (direct !== undefined) return direct;
    return SCORING.matchTable[5] + (n - 5) * SCORING.bigStep + SCORING.bigBonus;
  }

  static floatingPoints(count: number): number {
    let sum = 0;
    for (let i = 0; i < count; i++) sum += Math.min(SCORING.floatBase + SCORING.floatStep * i, SCORING.floatCap);
    return sum;
  }

  static comboBonus(level: number): number {
    if (level < 2) return 0;
    const last = COMBO_BONUS.length - 1;
    if (level <= last) return COMBO_BONUS[level];
    return COMBO_BONUS[last] + (level - last) * COMBO_BONUS_EXTRA;
  }

  static scoreOutcome(o: ShotOutcome, comboLevel: number): ScoreBreakdown {
    const match = ScoreManager.matchPoints(o.matched.length);
    const blast = o.blasted.length * SCORING.blastPerBubble;
    const floating = ScoreManager.floatingPoints(o.floating.length);
    const obstacles = o.damaged.filter((d) => d.converted).length * SCORING.obstacleConverted;
    const popped = o.matched.length > 0 || o.blasted.length > 0;
    const combo = popped ? ScoreManager.comboBonus(comboLevel) : 0;
    return { match, blast, floating, obstacles, combo, total: match + blast + floating + obstacles + combo };
  }

  static movesBonus(movesLeft: number): number {
    return Math.max(0, movesLeft) * MOVES_BONUS;
  }

  static stars(movesLeft: number, moves: number, cleared: boolean): number {
    if (cleared) return 3;
    const ratio = moves > 0 ? movesLeft / moves : 0;
    if (ratio >= STARS.three) return 3;
    if (ratio >= STARS.two) return 2;
    return 1;
  }

  add(b: ScoreBreakdown | number): void {
    this.total += typeof b === 'number' ? b : b.total;
  }
}
