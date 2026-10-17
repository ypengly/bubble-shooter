import { BOARD_LEFT, BUBBLE_DIAMETER, BUBBLE_RADIUS, GRID_COLS, GRID_TOP, ROW_HEIGHT } from '../config/GameConfig';

/**
 * Staggered (hex) grid math. `parity` flips whenever a row is inserted at the top,
 * so existing bubbles keep their x positions.
 */
export const isShortRow = (row: number, parity: number): boolean => ((row + parity) & 1) === 1;
export const colsInRow = (row: number, parity: number): number => (isShortRow(row, parity) ? GRID_COLS - 1 : GRID_COLS);

export const cellX = (row: number, col: number, parity: number): number =>
  BOARD_LEFT + BUBBLE_RADIUS + col * BUBBLE_DIAMETER + (isShortRow(row, parity) ? BUBBLE_RADIUS : 0);

export const cellY = (row: number): number => GRID_TOP + BUBBLE_RADIUS + row * ROW_HEIGHT;

export const rowFromY = (y: number): number => Math.round((y - GRID_TOP - BUBBLE_RADIUS) / ROW_HEIGHT);

/** Calls `cb` for the 6 hex neighbors (unchecked: may be out of bounds). */
export function forEachNeighborCell(row: number, col: number, parity: number, cb: (r: number, c: number) => void): void {
  cb(row, col - 1);
  cb(row, col + 1);
  const c0 = isShortRow(row, parity) ? col : col - 1;
  cb(row - 1, c0);
  cb(row - 1, c0 + 1);
  cb(row + 1, c0);
  cb(row + 1, c0 + 1);
}
