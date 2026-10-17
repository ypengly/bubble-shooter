import Phaser from 'phaser';
import { BubbleSprite } from './Bubble';
import type { BubbleGrid } from './BubbleGrid';
import type { BubbleData } from '../types/GameTypes';

/** Keeps one sprite per grid bubble and syncs positions after the grid changes. */
export class GridView {
  private sprites = new Map<number, BubbleSprite>();

  constructor(private readonly scene: Phaser.Scene, private readonly grid: BubbleGrid) {}

  build(): void {
    this.grid.forEachBubble((b, r, c) => this.add(b, r, c));
  }

  add(b: BubbleData, row: number, col: number, x?: number, y?: number): BubbleSprite {
    const s = new BubbleSprite(this.scene, x ?? this.grid.x(row, col), y ?? this.grid.y(row), b);
    this.sprites.set(b.id, s);
    return s;
  }

  get(id: number): BubbleSprite | undefined {
    return this.sprites.get(id);
  }

  /** Removes the sprite from tracking (the caller animates/destroys it). */
  take(id: number): BubbleSprite | undefined {
    const s = this.sprites.get(id);
    this.sprites.delete(id);
    return s;
  }

  refresh(b: BubbleData): void {
    this.sprites.get(b.id)?.refresh(b);
  }

  /** Moves every sprite to its cell (used after a row is inserted at the top). */
  syncPositions(animate: boolean, duration = 320): void {
    this.grid.forEachBubble((b, r, c) => {
      const s = this.sprites.get(b.id);
      if (!s) return;
      const x = this.grid.x(r, c);
      const y = this.grid.y(r);
      this.scene.tweens.killTweensOf(s);
      if (animate) this.scene.tweens.add({ targets: s, x, y, duration, ease: 'Back.easeOut' });
      else s.setPosition(x, y);
    });
  }

  clear(): void {
    this.sprites.forEach((s) => s.destroy());
    this.sprites.clear();
  }
}
