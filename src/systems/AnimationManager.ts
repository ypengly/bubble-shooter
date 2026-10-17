import Phaser from 'phaser';
import { BUBBLE_SCALE, GAME_HEIGHT } from '../config/GameConfig';
import { BUBBLE_COLORS } from '../config/BubbleConfig';
import type { BubbleSprite } from '../game/Bubble';
import { makeText } from '../ui/TextStyles';
import { AudioManager } from './AudioManager';
import type { ParticleManager } from './ParticleManager';
import { SaveManager } from './SaveManager';
import { vibrate } from '../utils/DeviceUtils';

interface Faller {
  sprite: Phaser.GameObjects.Image;
  delay: number;
  vx: number;
  vy: number;
  spin: number;
  started: boolean;
}

const tintOf = (color: string | null): number => (color ? BUBBLE_COLORS[color]?.tint ?? 0xffffff : 0xffffff);

/** Reusable animations: pops, falling bubbles, popups, shakes. */
export class AnimationManager {
  private fallers: Faller[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly particles: ParticleManager) {}

  private get reduced(): boolean {
    return SaveManager.settings.reducedEffects;
  }

  /** scale 1 -> 1.2 -> 0 with rotation, then particles. */
  pop(sprite: BubbleSprite, delay: number, color: string | null, index: number, strong = false): void {
    sprite.setDepth(14);
    this.scene.tweens.add({
      targets: sprite,
      delay,
      duration: 90,
      scale: BUBBLE_SCALE * 1.22,
      ease: 'Quad.easeOut',
      onStart: () => {
        AudioManager.play('pop', { index });
        this.particles.burst(sprite.x, sprite.y, tintOf(color), strong ? 9 : 6, { speed: strong ? 340 : 260 });
        this.particles.sparkle(sprite.x, sprite.y, 2);
      },
      onComplete: () => {
        this.scene.tweens.add({
          targets: sprite,
          duration: 110,
          scale: 0,
          angle: (Math.random() - 0.5) * (this.reduced ? 0 : 120),
          alpha: 0.2,
          ease: 'Back.easeIn',
          onComplete: () => sprite.destroy(),
        });
      },
    });
  }

  /** Gravity + rotation + scale wobble, destroyed once off-screen. */
  drop(sprite: Phaser.GameObjects.Image, delay: number): void {
    sprite.setDepth(13);
    this.fallers.push({ sprite, delay, vx: (Math.random() - 0.5) * 140, vy: -60 - Math.random() * 80, spin: (Math.random() - 0.5) * 7, started: false });
  }

  wobble(sprite: Phaser.GameObjects.Image, fromX: number, fromY: number): void {
    if (this.reduced) return;
    const dx = sprite.x - fromX;
    const dy = sprite.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    const bx = sprite.x;
    const by = sprite.y;
    this.scene.tweens.add({
      targets: sprite,
      x: bx + (dx / len) * 4,
      y: by + (dy / len) * 4,
      duration: 70,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => { sprite.x = bx; sprite.y = by; },
    });
  }

  /** Squash-and-stretch used when a bubble snaps into place. */
  snap(sprite: Phaser.GameObjects.Image, toX: number, toY: number): void {
    this.scene.tweens.add({
      targets: sprite,
      x: toX,
      y: toY,
      duration: 70,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (!sprite.active) return;
        sprite.setScale(BUBBLE_SCALE * 1.15, BUBBLE_SCALE * 0.88);
        this.scene.tweens.add({ targets: sprite, scaleX: BUBBLE_SCALE, scaleY: BUBBLE_SCALE, duration: 160, ease: 'Back.easeOut' });
      },
    });
  }

  popup(x: number, y: number, text: string, size: number, color: string, rise = 70, hold = 0): Phaser.GameObjects.Text {
    const t = makeText(this.scene, x, y, text, size, color, { stroke: '#1b2c52', strokeThickness: Math.max(4, size / 6), shadow: true }).setDepth(120).setScale(0.3);
    this.scene.tweens.add({
      targets: t,
      scale: 1,
      duration: 160,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({ targets: t, y: y - rise, alpha: 0, duration: 750, delay: hold, ease: 'Sine.easeIn', onComplete: () => t.destroy() });
      },
    });
    return t;
  }

  shake(intensity: number): void {
    if (this.reduced) return;
    this.scene.cameras.main.shake(180, Math.min(0.012, intensity), true);
    vibrate(Math.round(intensity * 3000));
  }

  /** Expanding ring + flash for explosions and power-ups. */
  blast(x: number, y: number, tint: number, size = 1): void {
    const ring = this.scene.add.image(x, y, 'ring').setTint(tint).setDepth(40).setScale(0.2).setAlpha(0.95);
    this.scene.tweens.add({ targets: ring, scale: 1.6 * size, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    if (!this.reduced) {
      const glow = this.scene.add.image(x, y, 'glow').setTint(tint).setDepth(39).setScale(0.4).setAlpha(0.9);
      this.scene.tweens.add({ targets: glow, scale: 2.4 * size, alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => glow.destroy() });
    }
    this.particles.burst(x, y, tint, 14, { speed: 420 });
  }

  /** Zig-zag bolt along a line, fading out. */
  bolt(x1: number, y1: number, x2: number, y2: number): void {
    const g = this.scene.add.graphics().setDepth(45);
    const pts: { x: number; y: number }[] = [];
    const n = 12;
    const nx = -(y2 - y1);
    const ny = x2 - x1;
    const len = Math.hypot(nx, ny) || 1;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const off = i === 0 || i === n ? 0 : (Math.random() - 0.5) * 26;
      pts.push({ x: x1 + (x2 - x1) * t + (nx / len) * off, y: y1 + (y2 - y1) * t + (ny / len) * off });
    }
    for (const [w, c, a] of [[12, 0xfff29a, 0.5], [5, 0xffffff, 1]] as const) {
      g.lineStyle(w, c, a);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach((p) => g.lineTo(p.x, p.y));
      g.strokePath();
    }
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 380, onComplete: () => g.destroy() });
  }

  update(dtMs: number): void {
    const dt = Math.min(dtMs, 50);
    for (let i = this.fallers.length - 1; i >= 0; i--) {
      const f = this.fallers[i];
      if (!f.sprite.active) {
        this.fallers.splice(i, 1);
        continue;
      }
      if (f.delay > 0) {
        f.delay -= dt;
        continue;
      }
      if (!f.started) {
        f.started = true;
        AudioManager.play('fall');
        this.particles.burst(f.sprite.x, f.sprite.y, 0xffffff, 3, { speed: 120, scale: 0.3 });
      }
      const s = dt / 1000;
      f.vy += 1900 * s;
      f.sprite.x += f.vx * s;
      f.sprite.y += f.vy * s;
      f.sprite.rotation += f.spin * s;
      if (!this.reduced) f.sprite.setScale(BUBBLE_SCALE * (1 + Math.min(0.18, f.vy / 6000)));
      if (f.sprite.y > GAME_HEIGHT + 60) {
        f.sprite.destroy();
        this.fallers.splice(i, 1);
      }
    }
  }
}
