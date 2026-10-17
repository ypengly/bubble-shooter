import { MATCH_MIN } from '../config/GameConfig';
import { OBSTACLES, POWERUPS } from '../config/BubbleConfig';
import type { BubbleData, BubbleKind, CellPos, ColorId, ShotBubble, SpecialKind } from '../types/GameTypes';
import type { BubbleGrid } from './BubbleGrid';
import { findFloating } from './FloatingBubbleSystem';
import { bestRainbowColor, findMatchGroup } from './MatchSystem';
import { areaCells, lineCells, resolveLineMode, type LineMode } from './PowerUpSystem';

export interface RemovedBubble {
  id: number;
  pos: CellPos;
  color: ColorId | null;
  kind: BubbleKind;
}

export interface DamagedBubble {
  id: number;
  pos: CellPos;
  bubble: BubbleData;
  /** True when this hit turned the obstacle into a normal bubble. */
  converted: boolean;
}

export interface ShotOutcome {
  /** The bubble that was added to the grid (it may be popped again in the same shot). */
  placed: { pos: CellPos; bubble: BubbleData } | null;
  matched: RemovedBubble[];
  blasted: RemovedBubble[];
  floating: RemovedBubble[];
  damaged: DamagedBubble[];
  special: SpecialKind | null;
  effectCenter: CellPos | null;
  lineMode: LineMode | null;
  freeze: boolean;
  rainbowColor: ColorId | null;
}

function removeCell(grid: BubbleGrid, r: number, c: number, into: RemovedBubble[]): void {
  const b = grid.remove(r, c);
  if (b) into.push({ id: b.id, pos: { row: r, col: c }, color: b.color, kind: b.kind });
}

/** Damage applied by a shot landing next to chain bubbles. */
function applyImpactDamage(grid: BubbleGrid, at: CellPos, out: ShotOutcome): void {
  grid.forEachNeighbor(at.row, at.col, (r, c) => {
    const b = grid.rows[r][c];
    if (!b || b.kind === 'normal' || OBSTACLES[b.kind].trigger !== 'impact') return;
    damage(b, r, c, out);
  });
}

/** Damage applied to ice/locked bubbles next to any popped bubble (once per obstacle per shot). */
function applyPopDamage(grid: BubbleGrid, removed: RemovedBubble[], out: ShotOutcome): void {
  const hit = new Set<number>();
  for (const rem of removed) {
    grid.forEachNeighbor(rem.pos.row, rem.pos.col, (r, c) => {
      const b = grid.rows[r][c];
      if (!b || b.kind === 'normal' || hit.has(b.id) || OBSTACLES[b.kind].trigger !== 'pop') return;
      hit.add(b.id);
      damage(b, r, c, out);
    });
  }
}

function damage(b: BubbleData, r: number, c: number, out: ShotOutcome): void {
  b.hp -= 1;
  const converted = b.hp <= 0;
  if (converted) {
    b.kind = 'normal';
    b.hp = 0;
  }
  out.damaged.push({ id: b.id, pos: { row: r, col: c }, bubble: { ...b }, converted });
}

/**
 * Applies a landed shot to the grid and reports everything that happened.
 * Mutates `grid`. Pure logic, so it can run headless (bots, tests).
 */
export function resolveShot(grid: BubbleGrid, shot: ShotBubble, landing: CellPos, aimAngle: number): ShotOutcome {
  const out: ShotOutcome = {
    placed: null,
    matched: [],
    blasted: [],
    floating: [],
    damaged: [],
    special: shot.special,
    effectCenter: null,
    lineMode: null,
    freeze: false,
    rainbowColor: null,
  };

  const special = shot.special;
  if (special && special !== 'rainbow') {
    out.effectCenter = landing;
    const def = POWERUPS[special];
    if (def.kind === 'status') {
      out.freeze = true;
    } else {
      let cells: CellPos[];
      if (def.kind === 'line') {
        out.lineMode = resolveLineMode(aimAngle);
        cells = lineCells(grid, landing.row, landing.col, out.lineMode);
      } else {
        cells = areaCells(grid, landing.row, landing.col, def.rings ?? 1);
      }
      for (const cell of cells) removeCell(grid, cell.row, cell.col, out.blasted);
    }
  } else {
    const bubble = grid.createBubble(shot.color ?? grid.colorsPresent()[0] ?? 'red');
    grid.set(landing.row, landing.col, bubble);
    out.placed = { pos: landing, bubble: { ...bubble } };
    if (special === 'rainbow') out.rainbowColor = bestRainbowColor(grid, landing.row, landing.col);
    out.placed.bubble.color = bubble.color;
    applyImpactDamage(grid, landing, out);
    const group = findMatchGroup(grid, landing.row, landing.col);
    if (group.length >= MATCH_MIN) for (const cell of group) removeCell(grid, cell.row, cell.col, out.matched);
  }

  const removed = out.matched.concat(out.blasted);
  if (removed.length) applyPopDamage(grid, removed, out);

  for (const cell of findFloating(grid)) removeCell(grid, cell.row, cell.col, out.floating);
  return out;
}
