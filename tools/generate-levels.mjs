// Generates src/data/levels/levelNN.json deterministically.
// Run: npm run levels   (then `npm run simulate -- --write` to re-calibrate target scores)
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'levels');
mkdirSync(OUT, { recursive: true });

const COLS = 11;
const ALL_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const NAMES = ['First Steps','Bubble Beach','Sunny Meadow','Cloud Hopper','Berry Patch','Pop Parade','Minty Fresh','Candy Cove','Rainbow Road','Fizzy Fields','Stone Garden','Pebble Path','Quarry Quest','Rocky Ridge','Granite Gate','Frosty Peak','Icicle Alley','Snow Globe','Glacier Glide','Cold Snap','Lock & Key','Padlock Plaza','Vault Valley','Keymaster','Safe Cracker','Chain Reaction','Iron Links','Rattle Row','Shackle Shore','Breakout','Lightning Lane','Thunder Bay','Spark Plug','Firestorm','Ember Edge','Blaze Basin','Inferno Inlet','Deep Freeze','Aurora Ice','Polar Pop','Twisted Towers','Hex Maze','Bubble Labyrinth','Gem Gauntlet','Tangle Tide','Spiral Sky','Storm Front','Final Frontier',"Champion's Climb",'Grand Finale'];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const colsIn = (r) => (r % 2 === 0 ? COLS : COLS - 1);
// x position in "cell units" (short rows are shifted by half a cell)
const xPos = (r, c) => c + (r % 2 === 0 ? 0 : 0.5);

function neighbors(r, c) {
  const out = [[r, c - 1], [r, c + 1]];
  const c0 = r % 2 === 1 ? c : c - 1; // short rows are odd rows when parity is 0
  out.push([r - 1, c0], [r - 1, c0 + 1], [r + 1, c0], [r + 1, c0 + 1]);
  return out.filter(([rr, cc]) => rr >= 0 && cc >= 0 && cc < colsIn(rr));
}

const PATTERNS = {
  full: () => true,
  pyramid: (r, c, rows) => Math.abs(xPos(r, c) - 5) <= 5.2 - (r / Math.max(1, rows)) * 3.6,
  diamond: (r, c, rows) => Math.abs(xPos(r, c) - 5) <= 1.5 + Math.min(r, rows - 1 - r) * 1.5 + 1,
  chimneys: (r, c) => r < 2 || !(Math.abs(xPos(r, c) - 2.5) < 0.9 || Math.abs(xPos(r, c) - 7.5) < 0.9),
  hourglass: (r, c, rows) => Math.abs(xPos(r, c) - 5) <= 1.5 + Math.abs(r - (rows - 1) / 2) * 1.3,
  wings: (r, c) => Math.abs(xPos(r, c) - 5) >= Math.max(0, 3.6 - r * 0.9) || r > 3,
  zigzag: (r, c) => ((Math.floor(xPos(r, c) / 2) + r) % 4 !== 3) || r < 2,
};
const PATTERN_ORDER = ['full', 'pyramid', 'chimneys', 'diamond', 'hourglass', 'wings', 'zigzag'];

function colorCount(i) {
  let n = i <= 5 ? 3 : i <= 12 ? 4 : i <= 24 ? 5 : 6;
  if (i > 5 && i % 7 === 0) n -= 1; // breather levels
  return n;
}

function specialsFor(i) {
  const types = [];
  if (i >= 6) types.push('bomb');
  if (i >= 9) types.push('rainbow');
  if (i >= 14) types.push('lightning');
  if (i >= 19) types.push('fire');
  if (i >= 24) types.push('freeze');
  return types.length ? { types, chance: i < 20 ? 0.09 : 0.08 } : null;
}

function buildLevel(i) {
  const rng = mulberry32(i * 7919 + 13);
  const nColors = colorCount(i);
  // rotate which colors are used so levels feel different
  const offset = (i * 2) % ALL_COLORS.length;
  const colors = Array.from({ length: nColors }, (_, k) => ALL_COLORS[(offset + k) % ALL_COLORS.length]);
  const rows = Math.min(10, 4 + Math.floor(i / 7));
  const patternName = i <= 3 ? 'full' : PATTERN_ORDER[(i * 3 + Math.floor(i / 7)) % PATTERN_ORDER.length];
  const mask = PATTERNS[patternName];
  const copyProb = Math.max(0.3, 0.62 - i * 0.006);

  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < colsIn(r); c++) {
      if (!mask(r, c, rows)) { row.push(null); continue; }
      const cands = [];
      if (c > 0 && row[c - 1]) cands.push(row[c - 1]);
      for (const [pr, pc] of neighbors(r, c)) if (pr < r && grid[pr] && grid[pr][pc]) cands.push(grid[pr][pc]);
      row.push(cands.length && rng() < copyProb ? cands[Math.floor(rng() * cands.length)] : colors[Math.floor(rng() * nColors)]);
    }
    grid.push(row);
  }

  // prune anything not connected to the ceiling
  const seen = new Set();
  const q = [];
  grid[0].forEach((v, c) => { if (v) { seen.add(`0,${c}`); q.push([0, c]); } });
  for (let k = 0; k < q.length; k++) {
    for (const [nr, nc] of neighbors(...q[k])) {
      if (nr < rows && grid[nr][nc] && !seen.has(`${nr},${nc}`)) { seen.add(`${nr},${nc}`); q.push([nr, nc]); }
    }
  }
  grid.forEach((row, r) => row.forEach((v, c) => { if (v && !seen.has(`${r},${c}`)) row[c] = null; }));

  // obstacles, introduced gradually
  const cells = [];
  grid.forEach((row, r) => row.forEach((v, c) => { if (v) cells.push([r, c]); }));
  const deep = cells.filter(([r]) => r >= 1);
  const place = (kind, prob, minCount) => {
    let placed = 0;
    for (const [r, c] of deep) if (rng() < prob && !String(grid[r][c]).includes(':') && grid[r][c] !== 'stone') {
      grid[r][c] = kind === 'stone' ? 'stone' : `${kind}:${grid[r][c]}`; placed++;
    }
    for (let guard = 0; placed < minCount && guard < 200; guard++) {
      const [r, c] = deep[Math.floor(rng() * deep.length)] ?? [];
      if (r === undefined || grid[r][c] === 'stone' || String(grid[r][c]).includes(':')) continue;
      grid[r][c] = kind === 'stone' ? 'stone' : `${kind}:${grid[r][c]}`; placed++;
    }
  };
  if (i >= 11) place('stone', Math.min(0.1, 0.012 * (i - 10)), 3);
  if (i >= 16) place('ice', Math.min(0.12, 0.012 * (i - 15)), 3);
  if (i >= 21) place('locked', Math.min(0.1, 0.012 * (i - 20)), 3);
  if (i >= 26) place('chain', Math.min(0.1, 0.01 * (i - 25)), 3);

  const layout = grid.map((row) => row.map((v) => v ?? '.'));
  const level = {
    id: i,
    name: NAMES[i - 1] ?? `Level ${i}`,
    moves: Math.max(18, 32 - Math.floor(i * 0.28)),
    targetScore: 1000,
    missLimit: i <= 8 ? 6 : 5,
    colors,
  };
  const sp = specialsFor(i);
  if (sp) level.specials = sp;
  level.layout = layout;
  return level;
}

const keepTargets = process.argv.includes('--keep-targets');
for (let i = 1; i <= 50; i++) {
  const file = join(OUT, `level${String(i).padStart(2, '0')}.json`);
  const level = buildLevel(i);
  if (keepTargets && existsSync(file)) level.targetScore = JSON.parse(readFileSync(file, 'utf8')).targetScore;
  // one row per line keeps level files easy to read and edit by hand
  const head = JSON.stringify({ ...level, layout: undefined }, null, 2).replace(/\n}$/, '');
  const rowsText = level.layout.map((r) => '    ' + JSON.stringify(r)).join(',\n');
  writeFileSync(file, `${head},\n  "layout": [\n${rowsText}\n  ]\n}\n`);
}
console.log('Generated 50 levels in', OUT);
