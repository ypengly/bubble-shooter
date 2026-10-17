import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';
import { makeText } from './TextStyles';

export type ButtonStyle = 'primary' | 'secondary' | 'danger' | 'neutral';

const PALETTE: Record<ButtonStyle, { top: number; mid: number; shadow: number; text: string }> = {
  primary: { top: 0x8dff7a, mid: 0x3fcf4f, shadow: 0x1f8a31, text: '#ffffff' },
  secondary: { top: 0x7fd0ff, mid: 0x2e8fe8, shadow: 0x185aa8, text: '#ffffff' },
  danger: { top: 0xff9a9a, mid: 0xf0485a, shadow: 0xa02334, text: '#ffffff' },
  neutral: { top: 0xffffff, mid: 0xdce8f7, shadow: 0x8aa0c0, text: '#244070' },
};

export interface ButtonOptions {
  width?: number;
  height?: number;
  style?: ButtonStyle;
  fontSize?: number;
  onClick: () => void;
  silent?: boolean;
}

/** Rounded, gradient-style button with hover/press animation. Fires on release inside. */
export class Button extends Phaser.GameObjects.Container {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly style: ButtonStyle;
  private readonly bw: number;
  private readonly bh: number;
  private pressed = false;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, opts: ButtonOptions) {
    super(scene, x, y);
    this.bw = opts.width ?? 260;
    this.bh = opts.height ?? 70;
    this.style = opts.style ?? 'primary';
    this.gfx = scene.add.graphics();
    this.label = makeText(scene, 0, -2, text, opts.fontSize ?? 30, PALETTE[this.style].text, {
      stroke: this.style === 'neutral' ? undefined : `#${PALETTE[this.style].shadow.toString(16).padStart(6, '0')}`,
      strokeThickness: this.style === 'neutral' ? 0 : 5,
    });
    this.add([this.gfx, this.label]);
    this.setSize(this.bw, this.bh);
    this.draw();
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => this.enabled && this.tweenScale(1.05));
    this.on('pointerout', () => {
      this.pressed = false;
      this.draw();
      this.tweenScale(1);
    });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      this.pressed = true;
      this.draw();
      this.tweenScale(0.94, 60);
    });
    this.on('pointerup', () => {
      if (!this.enabled || !this.pressed) return;
      this.pressed = false;
      this.draw();
      this.tweenScale(1.04, 80);
      if (!opts.silent) AudioManager.play('click');
      opts.onClick();
    });
    scene.add.existing(this);
  }

  private tweenScale(s: number, d = 110): void {
    this.scene.tweens.add({ targets: this, scale: s, duration: d, ease: 'Quad.easeOut' });
  }

  private draw(): void {
    const p = PALETTE[this.style];
    const w = this.bw;
    const h = this.bh;
    const r = Math.min(26, h / 2.2);
    const dy = this.pressed ? 2 : 0;
    const g = this.gfx;
    g.clear();
    g.fillStyle(0x000000, 0.18);
    g.fillRoundedRect(-w / 2, -h / 2 + 8, w, h, r);
    g.fillStyle(p.shadow, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + 6 - dy, w, h, r);
    g.fillStyle(p.mid, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + (this.pressed ? 4 : 0), w, h, r);
    g.fillStyle(p.top, 0.55);
    g.fillRoundedRect(-w / 2 + 6, -h / 2 + 5 + (this.pressed ? 4 : 0), w - 12, h * 0.42, r * 0.8);
    this.label.y = -2 + (this.pressed ? 4 : 0);
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  setEnabled(on: boolean): this {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.5);
    return this;
  }
}
