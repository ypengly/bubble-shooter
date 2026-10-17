import { BOARD_LEFT, BOARD_RIGHT, BUBBLE_RADIUS, GRID_TOP, LAUNCHER_X, LAUNCHER_Y, SHOT } from '../config/GameConfig';
import type { CellPos, Vec2 } from '../types/GameTypes';
import type { BubbleGrid } from './BubbleGrid';

export interface TraceResult {
  /** Polyline: launcher, every wall bounce, and the end point. */
  points: Vec2[];
  end: Vec2;
  hit: 'ceiling' | 'bubble' | 'none';
  landing: CellPos | null;
  bounces: number;
}

/**
 * Traces a shot from the launcher. Used for BOTH the aim preview and the real shot,
 * so what the player sees is exactly what happens.
 * `angle` is measured from straight up, positive to the right.
 */
export function traceShot(grid: BubbleGrid, angle: number, maxBounces: number = SHOT.maxBounces): TraceResult {
  let x = LAUNCHER_X;
  let y = LAUNCHER_Y;
  let dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const step = SHOT.traceStep;
  const minX = BOARD_LEFT + BUBBLE_RADIUS;
  const maxX = BOARD_RIGHT - BUBBLE_RADIUS;
  const ceilY = GRID_TOP + BUBBLE_RADIUS;
  const points: Vec2[] = [{ x, y }];
  let bounces = 0;
  let hit: TraceResult['hit'] = 'none';

  for (let i = 0; i < SHOT.maxSteps; i++) {
    const px = x;
    const py = y;
    x += dx * step;
    y += dy * step;

    const wall = x < minX ? minX : x > maxX ? maxX : null;
    if (wall !== null) {
      const f = (wall - px) / (x - px);
      points.push({ x: wall, y: py + (y - py) * f });
      x = 2 * wall - x;
      dx = -dx;
      bounces++;
      if (bounces > maxBounces) break;
    }
    if (y <= ceilY) {
      y = ceilY;
      hit = 'ceiling';
      break;
    }
    if (grid.hitsBubble(x, y)) {
      hit = 'bubble';
      break;
    }
  }

  points.push({ x, y });
  const landing = hit === 'none' ? null : grid.nearestEmptyCell(x, y);
  return { points, end: { x, y }, hit, landing, bounces };
}
