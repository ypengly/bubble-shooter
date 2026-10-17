import Phaser from 'phaser';
import { BUBBLE_COLORS, POWERUPS } from '../config/BubbleConfig';
import {
  BOARD_LEFT, BOARD_RIGHT, DANGER_LINE_Y, GAME_WIDTH, GRID_TOP, LAUNCHER_Y, ROW_HEIGHT, SHOT,
} from '../config/GameConfig';
import { DEBUG_CONFIG, debugOverlayWanted } from '../config/DebugConfig';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { AimSystem } from '../game/AimSystem';
import { shotTextureKey, type BubbleSprite } from '../game/Bubble';
import { ComboSystem } from '../game/ComboSystem';
import { GameSession, type FireInfo, type RunStatus, type TurnResult } from '../game/GameSession';
import { appState } from '../game/GameState';
import { GridView } from '../game/GridView';
import { LevelManager } from '../game/LevelManager';
import { AnimationManager } from '../systems/AnimationManager';
import { AudioManager } from '../systems/AudioManager';
import { InputManager } from '../systems/InputManager';
import { ParticleManager } from '../systems/ParticleManager';
import { SaveManager } from '../systems/SaveManager';
import { GameStateId, type CellPos } from '../types/GameTypes';
import type { LevelDef } from '../types/LevelTypes';
import { Background } from '../ui/Background';
import { DebugOverlay } from '../ui/DebugOverlay';
import { HUD } from '../ui/HUD';
import { makeText } from '../ui/TextStyles';
import { cellX } from '../utils/GridUtils';
import { formatNumber } from '../utils/MathUtils';

const COMBO_COLORS = ['#ffffff', '#ffffff', '#ffe066', '#ffb347', '#ff7a59', '#ff4b8a', '#c06bff'];

/** Gameplay. Rules live in GameSession; this scene only animates and routes input. */
export class GameScene extends Phaser.Scene {
  private levelId = 1;
  private level!: LevelDef;
  private session!: GameSession;
  private gridView!: GridView;
  private player!: Player;
  private aim = new AimSystem();
  private hud!: HUD;
  private anim!: AnimationManager;
  private particles!: ParticleManager;
  private bg!: Background;
  private inputMgr!: InputManager;
  private aimGfx!: Phaser.GameObjects.Graphics;
  private projectile: Projectile | null = null;
  private projectileTint = 0xffffff;
  private busy = false;
  private ended = false;
  private aimVisible = false;
  private gridRevision = 0;
  private debug: DebugOverlay | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private ready = false;

  constructor() {
    super('GameScene');
  }

  init(data: { levelId?: number }): void {
    this.levelId = data?.levelId ?? 1;
    this.aim = new AimSystem();
    this.projectile = null;
    this.busy = false;
    this.ended = false;
    this.aimVisible = false;
    this.gridRevision = 0;
    this.debug = null;
    this.ready = false;
  }

  create(): void {
    try {
      this.build();
      this.ready = true;
    } catch (e) {
      console.error('[GameScene] failed to start level, returning to level select', e);
      this.scene.start('LevelSelectScene');
    }
  }

  private build(): void {
    appState.set(GameStateId.PLAYING);
    this.level = LevelManager.get(this.levelId);
    this.levelId = this.level.id;
    this.cameras.main.fadeIn(250);

    this.bg = new Background(this);
    this.drawBoard();
    this.session = new GameSession(this.level);
    this.gridView = new GridView(this, this.session.grid);
    this.gridView.build();
    this.particles = new ParticleManager(this);
    this.anim = new AnimationManager(this, this.particles);

    this.player = new Player(this, () => this.swap());
    this.player.setShots(this.session.queue.current, this.session.queue.next, true);
    this.aimGfx = this.add.graphics().setDepth(15);

    this.hud = new HUD(this, this.level.id, this.level.name, this.level.targetScore, this.level.missLimit, () => this.openPause());
    this.hud.setScore(0, false);
    this.hud.setMoves(this.level.moves);
    this.hud.setMisses(0, false);

    this.inputMgr = new InputManager(this, {
      onAim: (x, y) => {
        if (!this.canShoot()) return;
        this.aimVisible = this.aim.setPointer(x, y);
      },
      onRelease: (x, y, isTouch) => {
        if (!this.canShoot()) return;
        const valid = this.aim.setPointer(x, y);
        if (isTouch) this.aimVisible = false;
        if (!valid) return;
        this.aim.snap();
        this.shoot();
      },
    });

    this.setupKeys();
    if (debugOverlayWanted()) this.debug = new DebugOverlay(this, this.level.id);

    AudioManager.applySettings();
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.aimVisible = false;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.inputMgr?.destroy());

    const intro = this.anim.popup(GAME_WIDTH / 2, 560, this.level.name, 44, '#ffffff', 30, 1000);
    intro.setDepth(150);
    this.anim.popup(GAME_WIDTH / 2, 612, `Reach ${formatNumber(this.level.targetScore)} points in ${this.level.moves} shots`, 22, '#ffe066', 30, 1000);
  }

  private drawBoard(): void {
    const g = this.add.graphics().setDepth(1);
    const w = BOARD_RIGHT - BOARD_LEFT;
    g.fillStyle(0xffffff, 0.2);
    g.fillRoundedRect(BOARD_LEFT - 6, GRID_TOP - 14, w + 12, DANGER_LINE_Y + 70 - GRID_TOP + 14, 20);
    g.fillStyle(0x12306b, 0.85);
    g.fillRoundedRect(BOARD_LEFT - 8, GRID_TOP - 18, w + 16, 16, 8);
    g.lineStyle(3, 0xffffff, 0.45);
    g.lineBetween(BOARD_LEFT, GRID_TOP, BOARD_LEFT, LAUNCHER_Y - 40);
    g.lineBetween(BOARD_RIGHT, GRID_TOP, BOARD_RIGHT, LAUNCHER_Y - 40);
    g.lineStyle(4, 0xff4b5c, 0.7);
    for (let x = BOARD_LEFT; x < BOARD_RIGHT; x += 26) g.lineBetween(x, DANGER_LINE_Y, x + 14, DANGER_LINE_Y);
    makeText(this, BOARD_RIGHT - 34, DANGER_LINE_Y - 12, 'DANGER', 12, '#ff9aa4', { stroke: '#7a1020', strokeThickness: 3 }).setDepth(2);
  }

  private setupKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    this.cursors = kb.createCursorKeys();
    kb.on('keydown-SPACE', () => {
      if (!this.canShoot()) return;
      this.aim.snap();
      this.shoot();
    });
    kb.on('keydown-ESC', () => this.openPause());
    if (DEBUG_CONFIG.cheatKeys) {
      kb.on('keydown-N', () => this.scene.restart({ levelId: LevelManager.next(this.levelId) ?? this.levelId }));
      kb.on('keydown-R', () => this.scene.restart({ levelId: this.levelId }));
      kb.on('keydown-W', () => {
        if (this.ended) return;
        this.session.forceWin();
        this.ended = true;
        this.finish('won');
      });
      kb.on('keydown-G', () => {
        this.debug ??= new DebugOverlay(this, this.level.id);
        this.debug.toggleGrid(this.session.grid);
      });
      kb.on('keydown-P', () => this.openPause());
    }
  }

  private canShoot(): boolean {
    return this.ready && !this.busy && !this.ended && appState.is(GameStateId.PLAYING);
  }

  private openPause(): void {
    if (this.ended || !appState.is(GameStateId.PLAYING)) return;
    appState.set(GameStateId.PAUSED);
    AudioManager.play('click');
    this.scene.launch('PauseScene', { levelId: this.levelId });
    this.scene.pause();
  }

  private swap(): void {
    if (!this.canShoot()) return;
    this.session.queue.swap();
    this.player.setShots(this.session.queue.current, this.session.queue.next, false);
    AudioManager.play('click');
  }

  // ---- shooting ----

  private shoot(): void {
    const info = this.session.fire(this.aim.angle);
    if (!info) {
      if (this.session.status !== 'playing') {
        this.ended = true;
        this.finish(this.session.status);
      }
      return;
    }
    this.busy = true;
    this.aimVisible = false;
    this.aimGfx.clear();
    this.hud.setMoves(this.session.movesLeft);
    this.player.recoil();
    this.player.hideCurrent();
    AudioManager.play('shoot');
    this.projectileTint = info.shot.color ? BUBBLE_COLORS[info.shot.color]?.tint ?? 0xffffff : 0xfff2a0;
    this.projectile = new Projectile(
      this,
      shotTextureKey(info.shot),
      info.trace.points,
      SHOT.speed,
      () => {
        AudioManager.play('bounce');
        this.particles.sparkle(this.projectile?.sprite.x ?? 0, this.projectile?.sprite.y ?? 0, 2);
      },
      () => this.onLand(info),
    );
  }

  private onLand(info: FireInfo): void {
    this.projectile?.destroy();
    this.projectile = null;
    const turn = this.session.land(info);
    this.playTurn(info, turn);
  }

  /** Cell center BEFORE a possible top-row insertion (parity flips when a row is added). */
  private preInsertPos(cell: CellPos, turn: TurnResult): { x: number; y: number } {
    const grid = this.session.grid;
    const parity = turn.newRow ? grid.parity ^ 1 : grid.parity;
    return { x: cellX(cell.row, cell.col, parity), y: grid.y(cell.row) };
  }

  private playTurn(info: FireInfo, turn: TurnResult): void {
    const o = turn.outcome;
    const grid = this.session.grid;
    this.gridRevision++;
    AudioManager.play('hit');

    const landPos = this.preInsertPos(info.landing, turn);
    const removed = o.matched.concat(o.blasted);
    const removedIds = new Set(removed.map((r) => r.id));

    // 1. placed bubble snaps into its cell
    let placed: BubbleSprite | null = null;
    if (o.placed) {
      const end = info.trace.end;
      placed = this.gridView.add(o.placed.bubble, o.placed.pos.row, o.placed.pos.col, end.x, end.y);
      if (removedIds.has(o.placed.bubble.id)) placed.setPosition(landPos.x, landPos.y);
      else this.anim.snap(placed, landPos.x, landPos.y);
      if (!turn.newRow) {
        grid.forEachNeighbor(info.landing.row, info.landing.col, (r, c) => {
          const nb = grid.get(r, c);
          const s = nb ? this.gridView.get(nb.id) : undefined;
          if (s) this.anim.wobble(s, landPos.x, landPos.y);
        });
      }
    }

    // 2. special effects
    if (o.special && o.effectCenter) this.playSpecialEffect(turn, landPos);
    if (o.special === 'rainbow') {
      this.anim.popup(landPos.x, landPos.y - 30, 'RAINBOW!', 28, '#ffffff', 50);
      AudioManager.play('powerup');
    }

    // 3. pops
    if (o.effectCenter) removed.sort((a, b) => Math.hypot(a.pos.row - info.landing.row, a.pos.col - info.landing.col) - Math.hypot(b.pos.row - info.landing.row, b.pos.col - info.landing.col));
    let cx = 0;
    let cy = 0;
    removed.forEach((rem, i) => {
      const sprite = rem.id === o.placed?.bubble.id ? placed : this.gridView.take(rem.id);
      if (rem.id === o.placed?.bubble.id) this.gridView.take(rem.id);
      if (!sprite) return;
      cx += sprite.x;
      cy += sprite.y;
      this.anim.pop(sprite, 30 + Math.min(i * 26, 520), rem.color, i, removed.length >= 6);
    });
    if (removed.length) {
      cx /= removed.length;
      cy /= removed.length;
    } else {
      cx = landPos.x;
      cy = landPos.y;
    }

    // 4. floating bubbles fall
    o.floating.forEach((f, i) => {
      const s = this.gridView.take(f.id);
      if (s) this.anim.drop(s, 160 + i * 32);
    });

    // 5. obstacle damage
    for (const d of o.damaged) {
      this.gridView.refresh(d.bubble);
      const s = this.gridView.get(d.id);
      AudioManager.play('crack');
      if (s) {
        this.particles.burst(s.x, s.y, d.converted ? 0xffffff : 0xbfefff, d.converted ? 8 : 4, { speed: 200 });
        this.tweens.add({ targets: s, scale: s.scale * 1.18, duration: 90, yoyo: true });
      }
    }

    // 6. score + popups
    const popped = removed.length > 0;
    if (popped) {
      this.anim.popup(cx, Math.max(210, cy - 10), `+${formatNumber(turn.breakdown.total)}`, 34, '#ffe066', 70, 150);
      const label = this.turnLabel(turn);
      this.anim.popup(GAME_WIDTH / 2, Math.max(230, cy - 62), label, turn.comboLevel >= 2 ? 44 : 34, COMBO_COLORS[Math.min(turn.comboLevel, COMBO_COLORS.length - 1)], 60, 250);
      if (turn.comboLevel >= 2) {
        AudioManager.play('combo', { index: turn.comboLevel });
        this.anim.popup(GAME_WIDTH / 2, Math.max(270, cy - 16), `+${turn.breakdown.combo} bonus`, 22, '#ffffff', 50, 250);
      }
      if (o.floating.length >= 3) this.anim.popup(GAME_WIDTH / 2, Math.max(310, cy + 36), `DROP x${o.floating.length}!`, 26, '#9be8ff', 50, 300);
      const n = removed.length + o.floating.length;
      if (n >= 6 || o.special) this.anim.shake(Math.min(0.012, 0.003 + n * 0.0004));
    } else if (o.floating.length) {
      this.anim.popup(cx, cy, `+${turn.breakdown.total}`, 30, '#ffe066', 60);
    }
    this.hud.setScore(turn.score);

    // 7. misses / new row / freeze
    this.hud.setMisses(turn.missCount, turn.warning);
    this.hud.setFreeze(turn.freezeLeft);
    if (turn.warning) AudioManager.play('warning');
    if (turn.newRow) {
      const newRow = turn.newRow;
      this.time.delayedCall(170, () => {
        newRow.forEach((b, c) => this.gridView.add(b, 0, c, grid.x(0, c), grid.y(0) - ROW_HEIGHT));
        this.gridView.syncPositions(true);
        this.anim.shake(0.006);
        AudioManager.play('warning');
        this.anim.popup(GAME_WIDTH / 2, GRID_TOP + 40, 'NEW ROW!', 34, '#ff9aa4', 40, 400);
      });
    }
    this.debug?.refresh(grid);

    // 8. next bubble, or end of level
    if (turn.status === 'playing') {
      this.time.delayedCall(150, () => {
        this.player.setShots(this.session.queue.current, this.session.queue.next, true);
        this.busy = false;
      });
    } else {
      this.ended = true;
      this.time.delayedCall(350, () => this.finish(turn.status));
    }
  }

  private turnLabel(turn: TurnResult): string {
    const o = turn.outcome;
    if (turn.comboLevel >= 2) return `${ComboSystem.label(turn.comboLevel)} x${turn.comboLevel}`;
    if (o.special && POWERUPS[o.special].kind !== 'wild') return o.special === 'lightning' ? 'ZAP!' : 'BOOM!';
    return 'MATCH!';
  }

  private playSpecialEffect(turn: TurnResult, at: { x: number; y: number }): void {
    const o = turn.outcome;
    switch (o.special) {
      case 'bomb':
      case 'fire':
        this.anim.blast(at.x, at.y, o.special === 'fire' ? 0xff6a1f : 0xffd34d, o.special === 'fire' ? 1.4 : 1);
        AudioManager.play('explode');
        break;
      case 'lightning':
        if (o.lineMode === 'column') this.anim.bolt(at.x, GRID_TOP, at.x, LAUNCHER_Y - 60);
        else this.anim.bolt(BOARD_LEFT, at.y, BOARD_RIGHT, at.y);
        AudioManager.play('powerup');
        break;
      case 'freeze':
        this.cameras.main.flash(260, 160, 225, 255);
        this.anim.blast(at.x, at.y, 0x9fe4ff, 1.2);
        this.anim.popup(GAME_WIDTH / 2, 420, 'FROZEN!', 44, '#bfefff', 50, 400);
        AudioManager.play('freeze');
        break;
      default:
        break;
    }
  }

  // ---- end of level ----

  private finish(status: RunStatus): void {
    SaveManager.noteCombo(this.session.combo.best);
    this.particles.clear();
    if (status === 'won') {
      const s = this.session;
      const next = LevelManager.next(this.level.id);
      const res = SaveManager.recordWin(this.level.id, s.score, s.stars, next);
      appState.set(GameStateId.LEVEL_COMPLETE);
      this.hud.setScore(s.score);
      AudioManager.play('win');
      this.particles.confetti(GAME_WIDTH / 2, 520, 50);
      this.anim.popup(GAME_WIDTH / 2, 430, 'LEVEL CLEAR!', 52, '#ffe066', 40, 700);
      if (s.finalBonus > 0) this.anim.popup(GAME_WIDTH / 2, 500, `Shot bonus +${formatNumber(s.finalBonus)}`, 26, '#ffffff', 40, 700);
      this.time.delayedCall(1300, () => {
        this.particles.clear();
        this.scene.launch('LevelCompleteScene', { levelId: this.level.id, score: s.score, stars: s.stars, newBest: res.newBest, nextId: next, bestCombo: s.combo.best });
        this.scene.pause();
      });
    } else {
      appState.set(GameStateId.GAME_OVER);
      AudioManager.play('lose');
      this.anim.shake(0.008);
      this.time.delayedCall(1000, () => {
        this.scene.launch('GameOverScene', { levelId: this.level.id, score: this.session.score, target: this.level.targetScore, reason: this.session.loseReason });
        this.scene.pause();
      });
    }
  }

  // ---- frame loop ----

  update(time: number, delta: number): void {
    if (!this.ready) return;
    this.bg.update(delta, (this.input.activePointer.x / GAME_WIDTH - 0.5) * 2);
    this.particles.update(delta);
    this.anim.update(delta);

    if (this.cursors && this.canShoot()) {
      const dir = (this.cursors.right.isDown ? 1 : 0) - (this.cursors.left.isDown ? 1 : 0);
      if (dir !== 0) {
        this.aim.nudge(dir * 1.3 * (delta / 1000));
        this.aimVisible = true;
      }
    }
    if (!this.ended) this.aim.update(delta);
    this.player.setAngle(this.aim.angle);

    if (this.projectile) {
      const p = this.projectile;
      p.update(delta);
      if (this.projectile === p) this.particles.trail(p.sprite.x, p.sprite.y, this.projectileTint);
    }

    if (this.canShoot() && this.aimVisible) {
      const grid = this.session.grid;
      const bounces = SaveManager.settings.aimGuide ? SHOT.previewBounces : 0;
      const trace = this.aim.trace(grid, bounces, this.gridRevision);
      const ghost = trace.landing && trace.hit !== 'none' ? { x: grid.x(trace.landing.row, trace.landing.col), y: grid.y(trace.landing.row) } : undefined;
      this.aim.draw(this.aimGfx, trace, time, ghost);
      this.debug?.setTrace(trace);
    } else if (!this.projectile) {
      this.aimGfx.clear();
    }
    this.debug?.update(this.session.grid, this.session, this.input.activePointer);
  }
}
