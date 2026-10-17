import { FALLBACK_LEVEL } from '../config/LevelConfig';
import { MAX_LAYOUT_ROWS, MISS, POWERUP_RULES } from '../config/GameConfig';
import { isValidColor, isValidSpecial, OBSTACLES } from '../config/BubbleConfig';
import type { BubbleKind, ColorId, SpecialKind } from '../types/GameTypes';
import type { CellSpec, LevelDef, ValidationResult } from '../types/LevelTypes';
import { colsInRow } from '../utils/GridUtils';

const EMPTY_TOKENS = new Set(['', '.', '_', '-', 'empty', 'none']);

type ParsedToken = { ok: true; cell: CellSpec | null } | { ok: false };

/**
 * Token grammar:
 *   "."  "_"  ""        empty cell
 *   "red"               normal bubble of that color
 *   "stone"             indestructible stone
 *   "ice:red"           obstacle (ice | locked | chain) carrying a color
 */
export function parseToken(token: unknown): ParsedToken {
  if (typeof token !== 'string') return { ok: false };
  const t = token.trim().toLowerCase();
  if (EMPTY_TOKENS.has(t)) return { ok: true, cell: null };
  if (t === 'stone') return { ok: true, cell: { kind: 'stone', color: null } };
  if (t.includes(':')) {
    const [kind, color] = t.split(':');
    if ((kind === 'ice' || kind === 'locked' || kind === 'chain') && OBSTACLES[kind].hasColor && isValidColor(color)) {
      return { ok: true, cell: { kind: kind as BubbleKind, color } };
    }
    return { ok: false };
  }
  if (isValidColor(t)) return { ok: true, cell: { kind: 'normal', color: t } };
  return { ok: false };
}

/** Never throws. Returns `level: null` only when the data is unusable. */
export function validateLevel(raw: unknown, fallbackId = 0): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null) return { level: null, warnings, errors: ['Level data is not an object'] };
  const r = raw as Record<string, unknown>;

  const id = typeof r.id === 'number' && Number.isInteger(r.id) && r.id > 0 ? r.id : fallbackId;
  if (!id) errors.push('Missing or invalid "id"');

  if (!Array.isArray(r.layout) || r.layout.length === 0) errors.push('"layout" must be a non-empty array of rows');
  if (errors.length) return { level: null, warnings, errors };

  const rawLayout = (r.layout as unknown[]).slice(0, MAX_LAYOUT_ROWS);
  if ((r.layout as unknown[]).length > MAX_LAYOUT_ROWS) warnings.push(`Layout truncated to ${MAX_LAYOUT_ROWS} rows`);

  const layout: string[][] = [];
  const cells: (CellSpec | null)[][] = [];
  const layoutColors = new Set<ColorId>();
  let bubbleCount = 0;

  rawLayout.forEach((rawRow, ri) => {
    const rowTokens: string[] = [];
    const rowCells: (CellSpec | null)[] = [];
    if (!Array.isArray(rawRow)) {
      warnings.push(`Row ${ri} is not an array; treated as empty`);
    } else {
      const max = colsInRow(ri, 0);
      if (rawRow.length > max) warnings.push(`Row ${ri} has ${rawRow.length} cells, max is ${max}; extra ignored`);
      rawRow.slice(0, max).forEach((tok, ci) => {
        const parsed = parseToken(tok);
        if (!parsed.ok) {
          warnings.push(`Invalid token ${JSON.stringify(tok)} at row ${ri}, col ${ci}; treated as empty`);
          rowTokens.push('.');
          rowCells.push(null);
          return;
        }
        rowTokens.push(typeof tok === 'string' ? tok : '.');
        rowCells.push(parsed.cell);
        if (parsed.cell) {
          bubbleCount++;
          if (parsed.cell.color) layoutColors.add(parsed.cell.color);
        }
      });
    }
    layout.push(rowTokens);
    cells.push(rowCells);
  });

  while (cells.length > 0 && cells[cells.length - 1].every((c) => c === null)) {
    cells.pop();
    layout.pop();
  }
  if (bubbleCount === 0) return { level: null, warnings, errors: ['Layout contains no bubbles'] };

  let colors: ColorId[] = Array.isArray(r.colors) ? (r.colors as unknown[]).filter(isValidColor) : [];
  if (Array.isArray(r.colors) && colors.length !== (r.colors as unknown[]).length) warnings.push('Some colors were invalid and ignored');
  colors = [...new Set([...colors, ...layoutColors])];
  if (colors.length === 0) return { level: null, warnings, errors: ['No valid colors'] };

  const num = (v: unknown, def: number, min: number, max: number, name: string): number => {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      warnings.push(`"${name}" missing or invalid; using ${def}`);
      return def;
    }
    return Math.min(max, Math.max(min, Math.round(v)));
  };

  let specials: LevelDef['specials'] = null;
  if (r.specials && typeof r.specials === 'object') {
    const s = r.specials as Record<string, unknown>;
    const types = (Array.isArray(s.types) ? s.types : []).filter(isValidSpecial) as SpecialKind[];
    if (types.length) {
      const chance = typeof s.chance === 'number' ? Math.min(0.5, Math.max(0, s.chance)) : POWERUP_RULES.defaultChance;
      specials = { types, chance };
    }
  }

  const level: LevelDef = {
    id,
    name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : `Level ${id}`,
    moves: num(r.moves, FALLBACK_LEVEL.moves, 1, 200, 'moves'),
    targetScore: num(r.targetScore, FALLBACK_LEVEL.targetScore, 1, 10_000_000, 'targetScore'),
    colors,
    layout,
    cells,
    missLimit: num(r.missLimit, MISS.defaultLimit, MISS.minLimit, MISS.maxLimit, 'missLimit'),
    specials,
  };
  return { level, warnings, errors };
}

/** A small guaranteed-valid level used when a real one is broken. */
export function createFallbackLevel(id: number): LevelDef {
  const colors = [...FALLBACK_LEVEL.colors];
  const layout: string[][] = [];
  for (let r = 0; r < FALLBACK_LEVEL.rows; r++) {
    const n = colsInRow(r, 0);
    layout.push(Array.from({ length: n }, (_, c) => colors[Math.floor((c + r * 2) / 2) % colors.length]));
  }
  const res = validateLevel({ id, name: FALLBACK_LEVEL.name, moves: FALLBACK_LEVEL.moves, targetScore: FALLBACK_LEVEL.targetScore, colors, layout, missLimit: FALLBACK_LEVEL.missLimit }, id);
  return res.level as LevelDef;
}
