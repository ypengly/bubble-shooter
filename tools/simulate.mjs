// Headless bot that plays every level using the real game rules (GameSession).
// Run: npm run simulate            -> prints a report
//      npm run simulate -- --write -> also calibrates "targetScore" in each level JSON
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, '.sim'), { recursive: true });
writeFileSync(join(root, '.sim', 'package.json'), '{"type":"commonjs"}');
const require = createRequire(import.meta.url);
const { GameSession } = require('../.sim/game/GameSession.js');
const { validateLevel } = require('../.sim/game/LevelValidator.js');
const { traceShot } = require('../.sim/game/CollisionSystem.js');
const { resolveShot } = require('../.sim/game/ShotResolver.js');
const { ScoreManager } = require('../.sim/game/ScoreManager.js');
const { mulberry32 } = require('../.sim/utils/MathUtils.js');

const write = process.argv.includes('--write');
const dir = join(root, 'src', 'data', 'levels');
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();

function botShot(session) {
  let best = null;
  for (let a = -1.25; a <= 1.25; a += 0.04) {
    const t = traceShot(session.grid, a);
    if (!t.landing) continue;
    const g = session.grid.clone();
    const shot = session.queue.current;
    const o = resolveShot(g, shot, t.landing, a);
    const popped = o.matched.length >= 3 || o.blasted.length > 0;
    const pts = ScoreManager.scoreOutcome(o, popped ? session.combo.streak + 1 : 0).total;
    let value = pts;
    if (!popped) {
      let same = 0;
      session.grid.forEachNeighbor(t.landing.row, t.landing.col, (r, c) => { if (session.grid.rows[r][c]?.color === shot.color) same++; });
      value = same * 6 - t.landing.row * 2 - 5;
    }
    if (!best || value > best.value) best = { a, value };
  }
  return best ? best.a : 0;
}

function play(level, seed, hugeTarget) {
  const lv = hugeTarget ? { ...level, targetScore: 10_000_000 } : level;
  const s = new GameSession(lv, mulberry32(seed));
  let turns = 0;
  while (s.status === 'playing' && turns++ < 200) {
    const info = s.fire(botShot(s));
    if (!info) break;
    s.land(info);
  }
  return { score: s.score - s.finalBonus, status: s.status, stars: s.stars, reason: s.loseReason, movesLeft: s.movesLeft };
}

const TRIALS = 6;
let bad = 0;
console.log('lvl  name                 moves target  botAvg  win%  avgStars');
for (const f of files) {
  const path = join(dir, f);
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const { level, errors, warnings } = validateLevel(raw);
  if (!level) { console.log(f, 'INVALID', errors); bad++; continue; }
  if (warnings.length) console.log(f, 'warnings:', warnings);
  const i = level.id;
  let potential = 0;
  for (let t = 0; t < TRIALS; t++) potential += play(level, i * 100 + t, true).score;
  potential /= TRIALS;
  const factor = Math.min(0.7, 0.5 + i * 0.005);
  if (write) {
    raw.targetScore = Math.max(300, Math.round((potential * factor) / 50) * 50);
    const head = JSON.stringify({ ...raw, layout: undefined }, null, 2).replace(/\n}$/, '');
    const rowsText = raw.layout.map((r) => '    ' + JSON.stringify(r)).join(',\n');
    writeFileSync(path, `${head},\n  "layout": [\n${rowsText}\n  ]\n}\n`);
    level.targetScore = raw.targetScore;
  }
  let wins = 0, stars = 0;
  for (let t = 0; t < TRIALS; t++) {
    const r = play(level, i * 1000 + t, false);
    if (r.status === 'won') { wins++; stars += r.stars; }
  }
  console.log(String(i).padStart(3), ' ', level.name.padEnd(20), String(level.moves).padStart(4), String(level.targetScore).padStart(7), String(Math.round(potential)).padStart(7), String(Math.round((wins / TRIALS) * 100)).padStart(5), wins ? (stars / wins).toFixed(1).padStart(8) : '       -');
}
console.log(bad ? `${bad} invalid level(s)` : 'All levels valid.');
