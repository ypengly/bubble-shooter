import { GRID_COLS, GRID_MAX_ROWS } from '../config/GameConfig';
import type { CellPos, ColorId } from '../types/GameTypes';
import type { BubbleGrid } from './BubbleGrid';

const visited = new Uint8Array(GRID_MAX_ROWS * GRID_COLS);

/**
 * Connected same-color group (BFS) starting at (row, col).
 * Only 'normal' bubbles take part: obstacles never match until they turn normal.
 * Returned in BFS order, so index 0 is the start cell.
 */
export function findMatchGroup(grid: BubbleGrid, row: number, col: number): CellPos[] {
  const start = grid.get(row, col);
  if (!start || start.kind !== 'normal' || !start.color) return [];
  const color = start.color;
  visited.fill(0);
  const out: CellPos[] = [{ row, col }];
  visited[row * GRID_COLS + col] = 1;
  for (let i = 0; i < out.length; i++) {
    const cur = out[i];
    grid.forEachNeighbor(cur.row, cur.col, (r, c) => {
      const idx = r * GRID_COLS + c;
      if (visited[idx]) return;
      const b = grid.rows[r][c];
      if (!b || b.kind !== 'normal' || b.color !== color) return;
      visited[idx] = 1;
      out.push({ row: r, col: c });
    });
  }
  return out;
}

/** For a rainbow bubble placed at (row, col): which neighbor color makes the biggest match? */
export function bestRainbowColor(grid: BubbleGrid, row: number, col: number): ColorId {
  const bubble = grid.get(row, col);
  if (!bubble) return 'red';
  const candidates: ColorId[] = [];
  grid.forEachNeighbor(row, col, (r, c) => {
    const b = grid.rows[r][c];
    if (b && b.kind === 'normal' && b.color && !candidates.includes(b.color)) candidates.push(b.color);
  });
  let best: ColorId = candidates[0] ?? grid.colorsPresent()[0] ?? 'red';
  let bestSize = -1;
  for (const color of candidates) {
    bubble.color = color;
    const size = findMatchGroup(grid, row, col).length;
    if (size > bestSize) {
      bestSize = size;
      best = color;
    }
  }
  bubble.color = best;
  return best;
}
