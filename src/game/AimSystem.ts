import Phaser from 'phaser';
import { AIM_SMOOTHING, LAUNCHER_X, LAUNCHER_Y, MAX_AIM_ANGLE } from '../config/GameConfig';
import { angleFromVertical, clamp, smoothFactor } from '../utils/MathUtils';
import type { BubbleGrid } from './BubbleGrid';
import { traceShot, type TraceResult } from './CollisionSystem';

/**
 * Smoothed aiming + trajectory preview. The preview uses the same tracer as the real shot.
 */
export class AimSystem {
  angle = 0;
  target = 0;
  private cached: TraceResult | null = null;
  private cachedAngle = NaN;
  private cachedBounces = -1;
  private cachedRevision = -1;

  /** Updates the target angle. Returns false if the pointer is in the "cancel" zone below the launcher. */
  setPointer(px: number, py: number): boolean {
    if (py > LAUNCHER_Y + 24) return false;
    const dy = Math.min(py, LAUNCHER_Y - 20);
    this.target = clamp(angleFromVertical(LAUNCHER_X, LAUNCHER_Y, px, dy), -MAX_AIM_ANGLE, MAX_AIM_ANGLE);
    return true;
  }

  nudge(delta: number): void {
    this.target = clamp(this.target + delta, -MAX_AIM_ANGLE, MAX_AIM_ANGLE);
  }

  update(dtMs: number): void {
    const diff = this.target - this.angle;
    this.angle = Math.abs(diff) < 0.0008 ? this.target : this.angle + diff * smoothFactor(AIM_SMOOTHING, dtMs);
  }

  snap(): void {
    this.angle = this.target;
  }

  /** Cached by angle, so an idle aim costs nothing. `revision` should change whenever the grid does. */
  trace(grid: BubbleGrid, bounces: number, revision: number): TraceResult {
    if (!this.cached || Math.abs(this.angle - this.cachedAngle) > 0.0004 || bounces !== this.cachedBounces || revision !== this.cachedRevision) {
      this.cached = traceShot(grid, this.angle, bounces);
      this.cachedAngle = this.angle;
      this.cachedBounces = bounces;
      this.cachedRevision = revision;
    }
    return this.cached;
  }

  /** Dotted guide with fading alpha and a ghost bubble at the landing cell. */
  draw(g: Phaser.GameObjects.Graphics, trace: TraceResult, timeMs: number, ghost?: { x: number; y: number }): void {
    g.clear();
    const spacing = 20;
    const offset = ((timeMs * 0.03) % spacing) + 0;
    let travelled = -offset;
    let total = 0;
    for (let i = 0; i < trace.points.length - 1; i++) total += Math.hypot(trace.points[i + 1].x - trace.points[i].x, trace.points[i + 1].y - trace.points[i].y);
    const fadeBase = Math.max(300, total);
    for (let i = 0; i < trace.points.length - 1; i++) {
      const a = trace.points[i];
      const b = trace.points[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 0.001) continue;
      const bounced = i > 0;
      let d = travelled < 0 ? -travelled : 0;
      while (d < len) {
        const t = d / len;
        const along = Math.max(0, travelled + d);
        const alpha = clamp(1 - along / (fadeBase * 1.1), 0.18, 0.95) * (bounced ? 0.7 : 1);
        g.fillStyle(0xffffff, alpha);
        g.fillCircle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, bounced ? 3 : 3.8);
        d += spacing;
      }
      travelled += len;
    }
    if (ghost) {
      g.lineStyle(3, 0xffffff, 0.9);
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(ghost.x, ghost.y, 22);
      g.strokeCircle(ghost.x, ghost.y, 22);
    }
  }
}
