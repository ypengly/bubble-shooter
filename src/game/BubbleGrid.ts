import { BUBBLE_DIAMETER, GRID_COLS, GRID_MAX_ROWS, SHOT } from '../config/GameConfig';
import { initialHp, OBSTACLES } from '../config/BubbleConfig';
import type { BubbleData, BubbleKind, CellPos, ColorId, Vec2 } from '../types/GameTypes';
import type { LevelDef } from '../types/LevelTypes';
import { cellX, cellY, colsInRow, forEachNeighborCell, isShortRow, rowFromY } from '../utils/GridUtils';

/**
 * Logical hex grid. Holds no rendering state: sprites are mapped via `BubbleData.id`.
 * Rows alternate between GRID_COLS and GRID_COLS-1 cells (staggered layout).
 */
export class BubbleGrid {
  readonly rows: (BubbleData | null)[][] = [];
  parity = 0;
  private nextId = 1;

  constructor() {
    for (let r = 0; r < GRID_MAX_ROWS; r++) this.rows.push(new Array<BubbleData | null>(GRID_COLS).fill(null));
  }

  static fromLevel(level: LevelDef): BubbleGrid {
    const grid = new BubbleGrid();
    level.cells.forEach((rowCells, r) => {
      rowCells.forEach((spec, c) => {
        if (!spec || !grid.inBounds(r, c)) return;
        grid.set(r, c, grid.createBubble(spec.color, spec.kind));
      });
    });
    return grid;
  }

  clone(): BubbleGrid {
    const g = new BubbleGrid();
    g.parity = this.parity;
    g.nextId = this.nextId;
    for (let r = 0; r < GRID_MAX_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const b = this.rows[r][c];
        g.rows[r][c] = b ? { ...b } : null;
      }
    }
    return g;
  }

  createBubble(color: ColorId | null, kind: BubbleKind = 'normal'): BubbleData {
    return { id: this.nextId++, color, kind, hp: initialHp(kind) };
  }

  isShort(row: number): boolean {
    return isShortRow(row, this.parity);
  }

  colsIn(row: number): number {
    return colsInRow(row, this.parity);
  }

  inBounds(row: number, col: number): boolean {
    return row >= 0 && row < GRID_MAX_ROWS && col >= 0 && col < colsInRow(row, this.parity);
  }

  get(row: number, col: number): BubbleData | null {
    return this.inBounds(row, col) ? this.rows[row][col] : null;
  }

  set(row: number, col: number, b: BubbleData | null): void {
    if (this.inBounds(row, col)) this.rows[row][col] = b;
  }

  remove(row: number, col: number): BubbleData | null {
    const b = this.get(row, col);
    if (b) this.rows[row][col] = null;
    return b;
  }

  x(row: number, col: number): number {
    return cellX(row, col, this.parity);
  }

  y(row: number): number {
    return cellY(row);
  }

  cellToWorld(row: number, col: number): Vec2 {
    return { x: this.x(row, col), y: this.y(row) };
  }

  /** Visits only in-bounds neighbors. */
  forEachNeighbor(row: number, col: number, fn: (r: number, c: number) => void): void {
    forEachNeighborCell(row, col, this.parity, (r, c) => {
      if (this.inBounds(r, c)) fn(r, c);
    });
  }

  forEachBubble(fn: (b: BubbleData, row: number, col: number) => void): void {
    for (let r = 0; r < GRID_MAX_ROWS; r++) {
      const n = this.colsIn(r);
      for (let c = 0; c < n; c++) {
        const b = this.rows[r][c];
        if (b) fn(b, r, c);
      }
    }
  }

  count(): number {
    let n = 0;
    this.forEachBubble(() => n++);
    return n;
  }

  /** Bubbles that can be cleared by matching (everything except indestructible stones). */
  clearableCount(): number {
    let n = 0;
    this.forEachBubble((b) => {
      if (b.kind !== 'stone') n++;
    });
    return n;
  }

  /** Colors currently on the board (including obstacle bubbles that will turn normal). */
  colorsPresent(): ColorId[] {
    const set = new Set<ColorId>();
    this.forEachBubble((b) => {
      if (b.color && (b.kind === 'normal' || OBSTACLES[b.kind as Exclude<BubbleKind, 'normal'>]?.hasColor)) set.add(b.color);
    });
    return [...set];
  }

  lowestRow(): number {
    for (let r = GRID_MAX_ROWS - 1; r >= 0; r--) {
      const n = this.colsIn(r);
      for (let c = 0; c < n; c++) if (this.rows[r][c]) return r;
    }
    return -1;
  }

  hasOccupiedNeighbor(row: number, col: number): boolean {
    let found = false;
    this.forEachNeighbor(row, col, (r, c) => {
      if (this.rows[r][c]) found = true;
    });
    return found;
  }

  /** True if (x, y) overlaps an existing bubble enough to stop a shot. */
  hitsBubble(x: number, y: number): boolean {
    const r0 = rowFromY(y);
    const lim = BUBBLE_DIAMETER * SHOT.collisionFactor;
    const lim2 = lim * lim;
    const rStart = Math.max(0, r0 - 1);
    const rEnd = Math.min(GRID_MAX_ROWS - 1, r0 + 1);
    for (let r = rStart; r <= rEnd; r++) {
      const row = this.rows[r];
      const n = this.colsIn(r);
      const cy = this.y(r);
      for (let c = 0; c < n; c++) {
        if (!row[c]) continue;
        const dx = this.x(r, c) - x;
        const dy = cy - y;
        if (dx * dx + dy * dy < lim2) return true;
      }
    }
    return false;
  }

  /** Nearest empty cell that touches the ceiling or another bubble. */
  nearestEmptyCell(x: number, y: number): CellPos | null {
    const r0 = rowFromY(y);
    let best: CellPos | null = null;
    let bestD = Infinity;
    const rStart = Math.max(0, r0 - 2);
    const rEnd = Math.min(GRID_MAX_ROWS - 1, r0 + 2);
    for (let r = rStart; r <= rEnd; r++) {
      const n = this.colsIn(r);
      for (let c = 0; c < n; c++) {
        if (this.rows[r][c]) continue;
        if (r > 0 && !this.hasOccupiedNeighbor(r, c)) continue;
        const dx = this.x(r, c) - x;
        const dy = this.y(r) - y;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = { row: r, col: c };
        }
      }
    }
    return best;
  }

  /**
   * Pushes the whole board down one row and fills a new row at the top.
   * Returns the new bubbles, or null if the board is already full to the bottom.
   */
  insertTopRow(colorAt: (col: number) => ColorId): BubbleData[] | null {
    const lastRow = this.rows[GRID_MAX_ROWS - 1];
    if (lastRow.some((b) => b)) return null;
    this.parity ^= 1;
    this.rows.pop();
    const row = new Array<BubbleData | null>(GRID_COLS).fill(null);
    this.rows.unshift(row);
    const created: BubbleData[] = [];
    const n = this.colsIn(0);
    for (let c = 0; c < n; c++) {
      const b = this.createBubble(colorAt(c));
      row[c] = b;
      created.push(b);
    }
    return created;
  }

  findCell(id: number): CellPos | null {
    for (let r = 0; r < GRID_MAX_ROWS; r++) {
      const n = this.colsIn(r);
      for (let c = 0; c < n; c++) if (this.rows[r][c]?.id === id) return { row: r, col: c };
    }
    return null;
  }
}
