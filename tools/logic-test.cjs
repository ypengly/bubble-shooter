// Headless checks of the core rules (grid, matching, floating, specials, obstacles, validation).
// Run: npm test
const assert = require('assert');
const path = require('path');
const root = path.join(__dirname, '..', '.sim') + '/';
const { BubbleGrid } = require(root + 'game/BubbleGrid.js');
const { traceShot } = require(root + 'game/CollisionSystem.js');
const { resolveShot } = require(root + 'game/ShotResolver.js');
const { findFloating } = require(root + 'game/FloatingBubbleSystem.js');
const { findMatchGroup } = require(root + 'game/MatchSystem.js');
const { areaCells, lineCells, rollSpecial } = require(root + 'game/PowerUpSystem.js');
const { validateLevel, createFallbackLevel } = require(root + 'game/LevelValidator.js');
const { ScoreManager } = require(root + 'game/ScoreManager.js');
const { mulberry32 } = require(root + 'utils/MathUtils.js');
let n = 0; const ok = (name) => console.log('  ok', name, ++n);

// 1. neighbor symmetry + geometry, both parities
for (const parity of [0, 1]) {
  const g = new BubbleGrid(); g.parity = parity;
  for (let r = 0; r < 14; r++) for (let c = 0; c < g.colsIn(r); c++) {
    g.forEachNeighbor(r, c, (nr, nc) => {
      let back = false; g.forEachNeighbor(nr, nc, (br, bc) => { if (br === r && bc === c) back = true; });
      assert(back, `asymmetric ${r},${c} -> ${nr},${nc} parity ${parity}`);
      const d = Math.hypot(g.x(r, c) - g.x(nr, nc), g.y(r) - g.y(nr));
      assert(Math.abs(d - 48) < 0.01, `neighbor distance ${d}`);
    });
  }
}
ok('neighbors symmetric and exactly one diameter apart (both parities)');

// 2. insertTopRow keeps x positions of existing bubbles
{
  const g = new BubbleGrid();
  const b = g.createBubble('red'); g.set(2, 3, b);
  const x0 = g.x(2, 3);
  const row = g.insertTopRow(() => 'blue');
  assert(row && row.length === g.colsIn(0));
  const pos = g.findCell(b.id);
  assert.strictEqual(pos.row, 3); assert(Math.abs(g.x(pos.row, pos.col) - x0) < 1e-9);
  assert(g.get(0, 0).color === 'blue');
}
ok('insertTopRow preserves x positions and shifts rows down');

// 3. match: 2 stay, 3 pop; floating drops
{
  const g = new BubbleGrid();
  g.set(0, 0, g.createBubble('red')); g.set(0, 1, g.createBubble('red'));
  g.set(1, 0, g.createBubble('green'));
  const o = resolveShot(g, { color: 'red', special: null }, { row: 0, col: 2 }, 0);
  assert.strictEqual(o.matched.length, 3);
  assert.strictEqual(o.floating.length, 1, 'green hanging from popped red falls');
  const g2 = new BubbleGrid();
  g2.set(0, 0, g2.createBubble('red')); g2.set(1, 0, g2.createBubble('blue')); g2.set(2, 0, g2.createBubble('green'));
  g2.set(0, 1, g2.createBubble('red'));
  const o2 = resolveShot(g2, { color: 'red', special: null }, { row: 0, col: 2 }, 0);
  assert.strictEqual(o2.matched.length, 3);
  assert.strictEqual(o2.floating.length, 2, 'blue+green hang from popped red');
  const g3 = new BubbleGrid();
  g3.set(0, 0, g3.createBubble('red')); g3.set(0, 1, g3.createBubble('blue'));
  const o3 = resolveShot(g3, { color: 'red', special: null }, { row: 0, col: 2 }, 0);
  assert.strictEqual(o3.matched.length, 0); assert.strictEqual(g3.count(), 3);
}
ok('2 stay / 3 pop / disconnected bubbles fall');

// 4. every angle lands in a legal, empty, attached cell
{
  const lv = validateLevel(JSON.parse(require('fs').readFileSync(path.join(__dirname, '..', 'src', 'data', 'levels', 'level31.json'), 'utf8'))).level;
  const g = BubbleGrid.fromLevel(lv);
  for (let a = -1.3; a <= 1.3; a += 0.01) {
    const t = traceShot(g, a);
    assert(t.landing, `no landing at ${a}`);
    assert(g.inBounds(t.landing.row, t.landing.col) && !g.get(t.landing.row, t.landing.col));
    assert(t.landing.row === 0 || g.hasOccupiedNeighbor(t.landing.row, t.landing.col));
    assert(t.points[0].y === 856 && t.points.length >= 2);
  }
}
ok('130+ aim angles all land in valid empty attached cells');

// 5. bounces: steep-angle shot reflects and stays inside the walls
{
  const g = new BubbleGrid(); g.set(0, 5, g.createBubble('red'));
  const t = traceShot(g, 1.2);
  assert(t.bounces >= 1);
  for (const p of t.points) assert(p.x >= 29.9 && p.x <= 510.1, `x out of walls ${p.x}`);
}
ok('wall bounces stay within the board');

// 6. specials
{
  const g = new BubbleGrid();
  for (let c = 0; c < 11; c++) g.set(0, c, g.createBubble('red'));
  for (let c = 0; c < 10; c++) g.set(1, c, g.createBubble('blue'));
  for (let c = 0; c < 11; c++) g.set(2, c, g.createBubble('green'));
  const gb = g.clone(); gb.remove(1, 4); // landing cell is empty in real play
  const bomb = resolveShot(gb, { color: null, special: 'bomb' }, { row: 1, col: 4 }, 0);
  assert.strictEqual(bomb.blasted.length, 6, 'bomb clears the 6 neighbors');
  const gf = g.clone(); gf.remove(1, 4);
  const fire = resolveShot(gf, { color: null, special: 'fire' }, { row: 1, col: 4 }, 0);
  assert(fire.blasted.length > bomb.blasted.length, 'fire has a bigger radius');
  const lr = resolveShot(g.clone(), { color: null, special: 'lightning' }, { row: 1, col: 4 }, 1.0);
  assert.strictEqual(lr.lineMode, 'row'); assert.strictEqual(lr.blasted.length, 10);
  const lc = resolveShot(g.clone(), { color: null, special: 'lightning' }, { row: 1, col: 4 }, 0.0);
  assert.strictEqual(lc.lineMode, 'column'); assert(lc.blasted.length >= 3);
  const fr = resolveShot(g.clone(), { color: null, special: 'freeze' }, { row: 1, col: 4 }, 0);
  assert(fr.freeze && fr.blasted.length === 0);
  // rainbow picks the color that makes a match
  const h = new BubbleGrid();
  h.set(0, 0, h.createBubble('red')); h.set(0, 1, h.createBubble('red')); h.set(0, 3, h.createBubble('blue'));
  const rb = resolveShot(h, { color: null, special: 'rainbow' }, { row: 0, col: 2 }, 0);
  assert.strictEqual(rb.rainbowColor, 'red'); assert.strictEqual(rb.matched.length, 3);
}
ok('bomb / lightning (row+column) / freeze / rainbow behave');

// 7. obstacles
{
  const g = new BubbleGrid();
  g.set(0, 0, g.createBubble('red')); g.set(0, 1, g.createBubble('red'));
  const ice = g.createBubble('blue', 'ice'); g.set(1, 0, ice);
  const stone = g.createBubble(null, 'stone'); g.set(0, 5, stone);
  const chain = g.createBubble('green', 'chain'); g.set(0, 8, chain);
  const o = resolveShot(g, { color: 'red', special: null }, { row: 0, col: 2 }, 0);
  assert.strictEqual(o.matched.length, 3);
  assert.strictEqual(ice.hp, 1, 'ice cracked once'); assert.strictEqual(ice.kind, 'ice');
  const o2 = resolveShot(g, { color: 'yellow', special: null }, { row: 0, col: 7 }, 0);
  assert.strictEqual(chain.hp, 2, 'impact loosened chain');
  assert(g.get(0, 5) === stone, 'stone anchored to ceiling stays');
  const o3 = resolveShot(g, { color: 'purple', special: null }, { row: 0, col: 9 }, 0);
  assert.strictEqual(chain.hp, 1);
  const o4 = resolveShot(g, { color: 'orange', special: null }, { row: 1, col: 8 }, 0);
  assert.strictEqual(chain.kind, 'normal', 'chain freed after 3 impacts');
}
ok('ice (pop trigger) / chain (impact trigger) / stone behave');

// 8. validator resilience
{
  const bad = validateLevel({ id: 3, moves: 'x', colors: ['red', 'pink'], layout: [['red', 'wat', 'stone:red', 'ice:blue'], 5] });
  assert(bad.level && bad.warnings.length >= 4);
  assert.strictEqual(validateLevel({ id: 1, layout: [] }).level, null);
  assert.strictEqual(validateLevel({ id: 1, layout: [['.', '.']] , colors:['red']}).level, null);
  assert.strictEqual(validateLevel(null).level, null);
  const fb = createFallbackLevel(7); assert(fb && fb.cells.length === 4);
}
ok('invalid colors/tokens/empty layouts never crash');

// 9. scoring
assert.strictEqual(ScoreManager.matchPoints(3), 30); assert.strictEqual(ScoreManager.matchPoints(4), 50);
assert.strictEqual(ScoreManager.matchPoints(5), 80); assert(ScoreManager.matchPoints(6) > 80);
assert.strictEqual(ScoreManager.comboBonus(2), 250); assert.strictEqual(ScoreManager.comboBonus(4), 1000);
ok('score table (3=30, 4=50, 5=80, 6+ bonus, combo x2=250, x4=1000)');

// 10. special pity timer
{
  const rng = mulberry32(1); let seen = 0;
  for (let i = 0; i < 12; i++) if (rollSpecial(['bomb'], 0, i + 1, rng)) { seen++; break; }
  assert.strictEqual(seen, 1);
}
ok('pity timer guarantees a special');
console.log('ALL PASSED');
