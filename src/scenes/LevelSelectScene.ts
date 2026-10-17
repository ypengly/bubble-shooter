import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { appState } from '../game/GameState';
import { LevelManager } from '../game/LevelManager';
import { SaveManager } from '../systems/SaveManager';
import { GameStateId } from '../types/GameTypes';
import { Background } from '../ui/Background';
import { Button } from '../ui/Button';
import { LevelCard } from '../ui/LevelCard';
import { makeText } from '../ui/TextStyles';
import { fadeToScene } from '../utils/SceneUtils';
import { formatNumber } from '../utils/MathUtils';

const SPACING = 128;
const TOP_PAD = 160;
const BOTTOM_PAD = 150;

/** Scrollable winding level map. Drag to scroll; tap a level to play. */
export class LevelSelectScene extends Phaser.Scene {
  private bg!: Background;
  private dragStartY = 0;
  private dragCamStart = 0;
  private dragging = false;
  private moved = 0;
  private starting = false;

  constructor() {
    super('LevelSelectScene');
  }

  create(data: { focusCurrent?: boolean }): void {
    appState.set(GameStateId.LEVEL_SELECT);
    this.starting = false;
    this.cameras.main.fadeIn(250);
    this.bg = new Background(this);
    this.bg.update(0);

    const ids = LevelManager.ids;
    const worldH = TOP_PAD + BOTTOM_PAD + (ids.length - 1) * SPACING + 100;
    const cam = this.cameras.main;
    cam.setBounds(0, 0, GAME_WIDTH, Math.max(worldH, GAME_HEIGHT));
    // The sky background is drawn at screen size; keep it fixed to the camera.
    this.children.list.forEach((c: Phaser.GameObjects.GameObject) => (c as Phaser.GameObjects.Image).setScrollFactor?.(0));

    const posOf = (i: number): { x: number; y: number } => ({
      x: GAME_WIDTH / 2 + Math.sin(i * 0.95) * 130,
      y: worldH - BOTTOM_PAD - i * SPACING,
    });

    const path = this.add.graphics().setDepth(1);
    path.lineStyle(10, 0xffffff, 0.45);
    ids.forEach((_, i) => {
      const p = posOf(i);
      if (i === 0) path.beginPath().moveTo(p.x, p.y);
      else path.lineTo(p.x, p.y);
    });
    path.strokePath();

    const current = Math.min(SaveManager.unlockedLevel, ids[ids.length - 1]);
    let focusY = worldH;
    ids.forEach((id, i) => {
      const p = posOf(i);
      const prog = SaveManager.getProgress(id);
      const state = !SaveManager.isUnlocked(id) ? 'locked' : prog ? 'done' : 'open';
      const card = new LevelCard(this, p.x, p.y, id, state, prog?.stars ?? 0, id === current && state !== 'locked', (lvl) => this.play(lvl));
      card.setDepth(2);
      if (id === current) focusY = p.y;
    });

    cam.scrollY = data?.focusCurrent === false ? Math.max(0, worldH - GAME_HEIGHT) : Phaser.Math.Clamp(focusY - GAME_HEIGHT * 0.55, 0, Math.max(0, worldH - GAME_HEIGHT));

    // Fixed header
    const header = this.add.graphics().setScrollFactor(0).setDepth(50);
    header.fillStyle(0x12306b, 0.6).fillRoundedRect(12, 12, GAME_WIDTH - 24, 70, 24);
    makeText(this, GAME_WIDTH / 2, 47, 'SELECT LEVEL', 34, '#ffffff', { stroke: '#12306b', strokeThickness: 6 }).setScrollFactor(0).setDepth(51);
    const back = new Button(this, 66, 47, 'BACK', { width: 100, height: 46, fontSize: 20, style: 'neutral', onClick: () => fadeToScene(this, 'MainMenuScene') });
    back.setScrollFactor(0).setDepth(52);
    this.add.image(GAME_WIDTH - 96, 47, 'star').setScale(0.5).setScrollFactor(0).setDepth(52);
    makeText(this, GAME_WIDTH - 72, 47, formatNumber(SaveManager.totalStars), 26, '#ffffff', { originX: 0, stroke: '#12306b', strokeThickness: 5 }).setScrollFactor(0).setDepth(52);

    // Drag-to-scroll
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.moved = 0;
      this.dragStartY = p.y;
      this.dragCamStart = cam.scrollY;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      const dy = p.y - this.dragStartY;
      this.moved = Math.max(this.moved, Math.abs(dy));
      cam.scrollY = Phaser.Math.Clamp(this.dragCamStart - dy, 0, Math.max(0, worldH - GAME_HEIGHT));
    });
    this.input.on('pointerup', () => (this.dragging = false));
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY + dy, 0, Math.max(0, worldH - GAME_HEIGHT));
    });
  }

  private play(levelId: number): void {
    if (this.moved > 12 || this.starting) return; // it was a drag, not a tap
    this.starting = true;
    fadeToScene(this, 'GameScene', { levelId });
  }

  update(_t: number, dt: number): void {
    this.bg.update(dt, 0);
  }
}
