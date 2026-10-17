import { GRID_COLS, GRID_MAX_ROWS } from '../config/GameConfig';
import type { CellPos } from '../types/GameTypes';
import type { BubbleGrid } from './BubbleGrid';

const visited = new Uint8Array(GRID_MAX_ROWS * GRID_COLS);

/** Every bubble not connected to the ceiling (row 0) through other bubbles. */
export function findFloating(grid: BubbleGrid): CellPos[] {
  visited.fill(0);
  const queue: CellPos[] = [];
  const n0 = grid.colsIn(0);
  for (let c = 0; c < n0; c++) {
    if (grid.rows[0][c]) {
      visited[c] = 1;
      queue.push({ row: 0, col: c });
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    grid.forEachNeighbor(cur.row, cur.col, (r, c) => {
      const idx = r * GRID_COLS + c;
      if (visited[idx] || !grid.rows[r][c]) return;
      visited[idx] = 1;
      queue.push({ row: r, col: c });
    });
  }
  const floating: CellPos[] = [];
  grid.forEachBubble((_b, r, c) => {
    if (!visited[r * GRID_COLS + c]) floating.push({ row: r, col: c });
  });
  return floating;
}
