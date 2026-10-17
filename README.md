# Bubble Shooter

A complete Bubble Shooter built with **TypeScript + Phaser 3 + Vite**. 50 JSON levels, power-ups,
obstacles, combos, 3-star scoring, save system, procedural audio and art (no asset downloads).

## Setup / run / build

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-checks, then bundles to dist/
npm run preview   # serve the production build
```

Other scripts:

| Script | What it does |
| --- | --- |
| `npm test` | Headless checks of the core rules (hex grid, matching, floating, specials, obstacles, validation) |
| `npm run simulate` | A bot plays all 50 levels with the real rules and prints win rates (`-- --write` re-calibrates target scores) |
| `npm run levels` | Regenerates the 50 level JSON files from `tools/generate-levels.mjs` (then run `npm run simulate -- --write`) |
| `npm run typecheck` | `tsc --noEmit` |

## Controls

- **Mouse:** move to aim, click to shoot. **Touch:** press and drag to aim, release to shoot. Drag below the launcher to cancel.
- Tap the **NEXT** bubble to swap. Keyboard: arrow keys aim, Space shoots, Esc pauses.
- Dev builds only: `N` next level, `R` restart, `W` win, `G` grid debug, `P` pause. Add `?debug` to the URL for the FPS/state overlay. All of this is disabled in `npm run build` output.

## Rules

- Match 3+ of a color. Bubbles cut off from the ceiling fall. Each shot is limited (`moves`).
- Reach the level's `targetScore` to win, or clear the board. Stars depend on shots left (>=50% = 3, >=25% = 2).
- Every **miss** (a shot that pops nothing) fills the miss meter; when it is full a new row drops in. Bubbles reaching the red line end the game.
- Combos: consecutive popping shots build `COMBO xN` with bonus points. A miss resets it.
- Obstacles: **stone** (only specials or falling remove it), **ice** (2 adjacent pops), **locked** (1 adjacent pop), **chain** (3 shots landing next to it).
- Specials (rare, with a pity timer): **bomb** (1 ring), **fire** (2 rings), **lightning** (row, or column for steep shots), **rainbow** (becomes the best-matching color), **freeze** (misses do not count for 3 shots).

## Architecture

```
src/
  config/     GameConfig (all constants), BubbleConfig (colors, obstacles, power-ups), LevelConfig, AssetConfig, DebugConfig
  types/      GameTypes, LevelTypes
  game/       PURE logic, no Phaser:  BubbleGrid, CollisionSystem (shot tracer), MatchSystem, FloatingBubbleSystem,
              PowerUpSystem, ShotResolver, ScoreManager, ComboSystem, BubbleShooter (ammo queue), GameSession (a whole run),
              LevelValidator, GameState (state machine)
              Phaser-facing: Bubble, GridView, AimSystem, LevelManager
  entities/   Player (launcher), Projectile
  systems/    AudioManager (WebAudio synth), SaveManager (localStorage + memory fallback), ParticleManager (pooled),
              AnimationManager, InputManager, TextureFactory (all art, generated on canvas)
  ui/         HUD, Button, ProgressBar, Dialog, LevelCard, Background, DebugOverlay, TextStyles
  scenes/     Boot, Preload, MainMenu, LevelSelect, Game, Pause, LevelComplete, GameOver, Settings
  data/       GameData (bundles levels/*.json), levels/level01..50.json
```

Key ideas:

- **Rules are separate from rendering.** `GameSession` owns score, combo, misses, win/lose. `GameScene` calls `fire()` / `land()` and animates the returned `TurnResult`. The same code runs in the bot (`tools/simulate.mjs`) and tests.
- **The aim preview and the real shot use the same tracer** (`traceShot`), so what you see is what happens. The projectile just animates along the pre-computed path.
- **Hex grid:** rows alternate between 11 and 10 cells. `BubbleGrid.parity` flips when a row is inserted at the top so existing bubbles never move sideways.
- **Scoring lives only in `ScoreManager`**, tuned by the tables in `GameConfig`.
- **Resilience:** invalid colors/tokens/layouts are sanitized with console warnings; an unusable level is replaced by a fallback. Missing audio, localStorage or assets degrade gracefully.

## Add a level

Drop `level51.json` into `src/data/levels/`. No code changes: it is bundled and appears on the map automatically.

```json
{
  "id": 51,
  "name": "My Level",
  "moves": 24,
  "targetScore": 3000,
  "missLimit": 5,
  "colors": ["red", "blue", "green"],
  "specials": { "types": ["bomb", "rainbow"], "chance": 0.08 },
  "layout": [
    ["red", "red", "blue", "blue", "green", "green", "red", "red", "blue", "blue", "green"],
    ["blue", "stone", "ice:red", "locked:green", "chain:blue", ".", "red", "red", "blue", "blue"]
  ]
}
```

Row 0 has up to 11 cells, row 1 up to 10, alternating. Tokens: a color name, `.` (empty), `stone`, or `ice:|locked:|chain:` + color. `specials` is optional. Run `npm run simulate` to see how a bot fares and tune `targetScore`.

## Add a bubble color, obstacle or power-up

- **Color:** add an entry to `BUBBLE_COLORS` in `config/BubbleConfig.ts`. Textures are generated automatically; use its id in level files.
- **Obstacle:** add its kind to `ObstacleKind` (`types/GameTypes.ts`) and an `OBSTACLES` entry (hp + trigger: `pop`, `impact`, `none`). Add its token in `LevelValidator.parseToken` and a texture in `TextureFactory`.
- **Power-up:** add the id to `SpecialKind`, an entry in `POWERUPS` (kind `area` / `line` / `wild` / `status`, `rings`, `weight`), and a `sp_<id>` texture in `TextureFactory.specialBubble`. Area and line power-ups work from config alone; a new behavior goes in `ShotResolver.resolveShot`. Then list it in a level's `specials.types`.

## Assets

None are required. Everything is generated at startup. See `public/assets/README.md` and `src/config/AssetConfig.ts` to override with real files.
