import Phaser from 'phaser';
import { BUBBLE_COLORS } from '../config/BubbleConfig';
import { GAME_WIDTH } from '../config/GameConfig';
import { appState } from '../game/GameState';
import { LevelManager } from '../game/LevelManager';
import { AudioManager } from '../systems/AudioManager';
import { SaveManager } from '../systems/SaveManager';
import { GameStateId } from '../types/GameTypes';
import { Background } from '../ui/Background';
import { Button } from '../ui/Button';
import { makeText } from '../ui/TextStyles';
import { fadeToScene } from '../utils/SceneUtils';
import { formatNumber } from '../utils/MathUtils';

export class MainMenuScene extends Phaser.Scene {
  private bg!: Background;

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    appState.set(GameStateId.MENU);
    this.cameras.main.fadeIn(250);
    this.bg = new Background(this);
    AudioManager.applySettings();

    // Title: colorful bubble letters bobbing gently.
    const palette = Object.values(BUBBLE_COLORS);
    const title = (word: string, y: number, size: number, offset: number): void => {
      const step = size * 0.78;
      const startX = GAME_WIDTH / 2 - ((word.length - 1) * step) / 2;
      [...word].forEach((ch, i) => {
        const x = startX + i * step;
        const color = palette[(i + offset) % palette.length];
        const disc = this.add.image(x, y, `b_${color.id}`).setScale(size / 115);
        const letter = makeText(this, x, y - 2, ch, size * 0.62, '#ffffff', { stroke: `#${color.dark.slice(1)}`, strokeThickness: 6 });
        this.tweens.add({ targets: [disc, letter], y: `-=${8}`, duration: 900, delay: i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      });
    };
    title('BUBBLE', 190, 82, 0);
    title('SHOOTER', 300, 82, 3);

    const play = new Button(this, GAME_WIDTH / 2, 480, 'PLAY', { width: 300, height: 88, fontSize: 44, style: 'primary', onClick: () => this.open(true) });
    new Button(this, GAME_WIDTH / 2, 590, 'LEVELS', { width: 300, height: 74, fontSize: 32, style: 'secondary', onClick: () => this.open(false) });
    new Button(this, GAME_WIDTH / 2, 686, 'SETTINGS', { width: 300, height: 74, fontSize: 32, style: 'neutral', onClick: () => fadeToScene(this, 'SettingsScene', { returnTo: 'MainMenuScene' }) });
    this.tweens.add({ targets: play, scale: 1.04, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const pill = this.add.graphics();
    pill.fillStyle(0x12306b, 0.55).fillRoundedRect(GAME_WIDTH / 2 - 120, 764, 240, 56, 28);
    this.add.image(GAME_WIDTH / 2 - 78, 792, 'star').setScale(0.6);
    makeText(this, GAME_WIDTH / 2 + 14, 792, formatNumber(SaveManager.totalStars), 32, '#ffffff', { stroke: '#12306b', strokeThickness: 5 });
    makeText(this, GAME_WIDTH / 2, 850, `Best score ${formatNumber(SaveManager.highScore)}   |   Best combo x${SaveManager.bestCombo}`, 18, '#ffffff', { stroke: '#12306b', strokeThickness: 4 });
    makeText(this, GAME_WIDTH / 2, 930, `${LevelManager.count} levels`, 15, '#e6f4ff');
  }

  private open(focusCurrent: boolean): void {
    fadeToScene(this, 'LevelSelectScene', { focusCurrent });
  }

  update(_t: number, dt: number): void {
    this.bg.update(dt, (this.input.activePointer.x / GAME_WIDTH - 0.5) * 2);
  }
}
