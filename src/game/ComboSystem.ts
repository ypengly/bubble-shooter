/** Consecutive shots that pop something build a combo. A shot that pops nothing resets it. */
export class ComboSystem {
  streak = 0;
  best = 0;

  register(popped: boolean): number {
    if (popped) {
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
    } else {
      this.streak = 0;
    }
    return this.streak;
  }

  static label(level: number): string {
    if (level >= 6) return 'UNSTOPPABLE!';
    if (level === 5) return 'AWESOME!';
    if (level === 4) return 'GREAT!';
    if (level === 3) return 'NICE!';
    return level >= 2 ? 'COMBO' : 'MATCH!';
  }
}
