import type { BubbleKind, ColorId, SpecialKind } from './GameTypes';

export interface CellSpec {
  kind: BubbleKind;
  color: ColorId | null;
}

export interface LevelSpecials {
  types: SpecialKind[];
  chance: number;
}

/** A validated, ready-to-play level. */
export interface LevelDef {
  id: number;
  name: string;
  moves: number;
  targetScore: number;
  colors: ColorId[];
  /** Original tokens from the JSON file (kept for debugging). */
  layout: string[][];
  /** Parsed layout. `null` = empty cell. */
  cells: (CellSpec | null)[][];
  missLimit: number;
  specials: LevelSpecials | null;
}

export interface ValidationResult {
  level: LevelDef | null;
  warnings: string[];
  errors: string[];
}
