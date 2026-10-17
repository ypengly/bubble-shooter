import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { AudioManager } from '../systems/AudioManager';
import { Button, type ButtonStyle } from './Button';
import { makeText } from './TextStyles';

export interface DialogButton {
  label: string;
  style?: ButtonStyle;
  onClick: () => void;
}

export interface DialogOptions {
  title: string;
  titleColor?: string;
  subtitle?: string;
  lines?: string[];
  /** 0-3 shows an animated star row. */
  stars?: number;
  buttons: DialogButton[];
  dim?: number;
  onStarsDone?: () => void;
}

/** Modal panel with title, optional stars, text lines and stacked buttons. */
export class Dialog extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, opts: DialogOptions) {
    super(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    const dim = scene.add.rectangle(0, 0, GAME_WIDTH * 2, GAME_HEIGHT * 2, 0x0b1b3a, opts.dim ?? 0.62).setInteractive();
    this.add(dim);

    const lines = opts.lines ?? [];
    const hasStars = opts.stars !== undefined;
    const btnH = 66;
    const gap = 16;
    const panelW = 440;
    const contentH = (opts.subtitle ? 44 : 0) + (hasStars ? 120 : 0) + lines.length * 40 + (lines.length ? 12 : 0);
    const panelH = 110 + contentH + opts.buttons.length * (btnH + gap) + 20;
    const top = -panelH / 2;

    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(-panelW / 2, top + 10, panelW, panelH, 36);
    g.fillStyle(0x1e4fa3, 1);
    g.fillRoundedRect(-panelW / 2, top, panelW, panelH, 36);
    g.fillStyle(0xf4fbff, 1);
    g.fillRoundedRect(-panelW / 2 + 8, top + 70, panelW - 16, panelH - 78, 28);
    g.fillStyle(0xffffff, 0.12);
    g.fillRoundedRect(-panelW / 2 + 14, top + 8, panelW - 28, 30, 15);
    this.add(g);
    this.add(makeText(scene, 0, top + 36, opts.title, 38, opts.titleColor ?? '#ffffff', { stroke: '#12306b', strokeThickness: 6, shadow: true }));

    let y = top + 92;
    if (opts.subtitle) {
      this.add(makeText(scene, 0, y + 12, opts.subtitle, 26, '#2a4f8f'));
      y += 44;
    }
    if (hasStars) {
      const n = Phaser.Math.Clamp(opts.stars ?? 0, 0, 3);
      for (let i = 0; i < 3; i++) {
        const sx = (i - 1) * 100;
        const sy = y + 58 + (i === 1 ? -14 : 0);
        this.add(scene.add.image(sx, sy, 'star_off').setScale(1.15));
        if (i < n) {
          const s = scene.add.image(sx, sy, 'star').setScale(0).setAngle(-30);
          this.add(s);
          scene.tweens.add({
            targets: s,
            scale: i === 1 ? 1.5 : 1.15,
            angle: 0,
            delay: 500 + i * 330,
            duration: 380,
            ease: 'Back.easeOut',
            onStart: () => AudioManager.play('star', { index: i }),
            onComplete: () => {
              if (i === n - 1) opts.onStarsDone?.();
            },
          });
        }
      }
      if (n === 0) opts.onStarsDone?.();
      y += 120;
    }
    for (const line of lines) {
      this.add(makeText(scene, 0, y + 18, line, 27, '#244070'));
      y += 40;
    }
    if (lines.length) y += 12;
    y += 8;
    opts.buttons.forEach((b, i) => {
      this.add(new Button(scene, 0, y + btnH / 2 + i * (btnH + gap), b.label, { width: 320, height: btnH, fontSize: 28, style: b.style ?? 'secondary', onClick: b.onClick }));
    });

    this.setDepth(200);
    this.setScale(0.7).setAlpha(0);
    scene.tweens.add({ targets: this, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    scene.add.existing(this);
  }
}
