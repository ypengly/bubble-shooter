import { BUBBLE_RADIUS, GRID_COLS, GRID_MAX_ROWS, POWERUP_RULES } from '../config/GameConfig';
import { POWERUPS } from '../config/BubbleConfig';
import type { CellPos, SpecialKind } from '../types/GameTypes';
import type { BubbleGrid } from './BubbleGrid';

export type LineMode = 'row' | 'column';

/** Occupied cells within `rings` hex-steps of (row, col). The center itself may be empty. */
export function areaCells(grid: BubbleGrid, row: number, col: number, rings: number): CellPos[] {
  const seen = new Set<number>();
  const result: CellPos[] = [];
  let frontier: CellPos[] = [{ row, col }];
  seen.add(row * GRID_COLS + col);
  const consider = (r: number, c: number, next: CellPos[]): void => {
    const key = r * GRID_COLS + c;
    if (seen.has(key)) return;
    seen.add(key);
    next.push({ row: r, col: c });
  };
  if (grid.get(row, col)) result.push({ row, col });
  for (let ring = 0; ring < rings; ring++) {
    const next: CellPos[] = [];
    for (const cell of frontier) grid.forEachNeighbor(cell.row, cell.col, (r, c) => consider(r, c, next));
    for (const cell of next) if (grid.get(cell.row, cell.col)) result.push(cell);
    frontier = next;
  }
  return result;
}

/** All bubbles in the landing row, or in the (zig-zag) column around the landing cell. */
export function lineCells(grid: BubbleGrid, row: number, col: number, mode: LineMode): CellPos[] {
  const result: CellPos[] = [];
  if (mode === 'row') {
    const n = grid.colsIn(row);
    for (let c = 0; c < n; c++) if (grid.rows[row][c]) result.push({ row, col: c });
    return result;
  }
  const cx = grid.x(row, col);
  for (let r = 0; r < GRID_MAX_ROWS; r++) {
    const n = grid.colsIn(r);
    for (let c = 0; c < n; c++) {
      if (grid.rows[r][c] && Math.abs(grid.x(r, c) - cx) <= BUBBLE_RADIUS + 0.01) result.push({ row: r, col: c });
    }
  }
  return result;
}

export function resolveLineMode(aimAngle: number): LineMode {
  const m = POWERUP_RULES.lightningMode;
  if (m === 'row' || m === 'column') return m;
  return Math.abs(aimAngle) < POWERUP_RULES.autoColumnAngle ? 'column' : 'row';
}

/**
 * Decides whether the next generated bubble is a special.
 * Pity timer guarantees one every `pityShots` shots so power-ups stay rare but dependable.
 */
export function rollSpecial(types: SpecialKind[], chance: number, shotsSince: number, rng: () => number): SpecialKind | null {
  if (types.length === 0) return null;
  const forced = shotsSince >= POWERUP_RULES.pityShots;
  if (!forced && rng() >= chance) return null;
  let total = 0;
  for (const t of types) total += POWERUPS[t].weight;
  let roll = rng() * total;
  for (const t of types) {
    roll -= POWERUPS[t].weight;
    if (roll <= 0) return t;
  }
  return types[types.length - 1];
}
