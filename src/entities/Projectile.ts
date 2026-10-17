import Phaser from 'phaser';
import { BUBBLE_SCALE } from '../config/GameConfig';
import type { Vec2 } from '../types/GameTypes';

/** A bubble flying along a pre-traced polyline (wall bounces included). */
export class Projectile {
  readonly sprite: Phaser.GameObjects.Image;
  private seg = 0;
  private distOnSeg = 0;
  private done = false;

  constructor(
    scene: Phaser.Scene,
    textureKey: string,
    private readonly points: Vec2[],
    private readonly speed: number,
    private readonly onBounce: (x: number, y: number) => void,
    private readonly onDone: () => void,
  ) {
    this.sprite = scene.add.image(points[0].x, points[0].y, textureKey).setScale(BUBBLE_SCALE).setDepth(20);
  }

  /** Advances along the path. Returns true once finished. */
  update(dtMs: number): boolean {
    if (this.done) return true;
    let remaining = this.speed * (Math.min(dtMs, 50) / 1000);
    while (remaining > 0 && this.seg < this.points.length - 1) {
      const a = this.points[this.seg];
      const b = this.points[this.seg + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const left = len - this.distOnSeg;
      if (remaining >= left) {
        remaining -= left;
        this.seg++;
        this.distOnSeg = 0;
        if (this.seg < this.points.length - 1) this.onBounce(b.x, b.y);
      } else {
        this.distOnSeg += remaining;
        remaining = 0;
      }
    }
    if (this.seg >= this.points.length - 1) {
      const end = this.points[this.points.length - 1];
      this.sprite.setPosition(end.x, end.y);
      this.done = true;
      this.onDone();
      return true;
    }
    const a = this.points[this.seg];
    const b = this.points[this.seg + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const t = this.distOnSeg / len;
    this.sprite.setPosition(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    this.sprite.rotation += 0.15;
    return false;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
