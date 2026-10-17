/**
 * Every JSON file in ./levels is bundled automatically.
 * Adding level 51 = dropping `level51.json` in that folder. No code changes.
 */
const modules = import.meta.glob('./levels/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;

export interface RawLevelEntry {
  path: string;
  raw: unknown;
}

export const RAW_LEVELS: RawLevelEntry[] = Object.entries(modules).map(([path, raw]) => ({ path, raw }));
