import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { SaveManager } from './SaveManager';

interface Particle {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
  spin: number;
  s0: number;
  s1: number;
  active: boolean;
}

export interface BurstOpts {
  speed?: number;
  gravity?: number;
  life?: number;
  scale?: number;
  tex?: string;
}

const CAP = 360;

/** Pooled, scene-update-driven particles. No per-particle tweens or allocations. */
export class ParticleManager {
  private pool: Particle[] = [];
  private free: number[] = [];

  constructor(scene: Phaser.Scene, depth = 30) {
    for (let i = 0; i < CAP; i++) {
      const img = scene.add.image(0, 0, 'dot').setVisible(false).setDepth(depth);
      this.pool.push({ img, vx: 0, vy: 0, gravity: 0, life: 0, maxLife: 1, spin: 0, s0: 1, s1: 0, active: false });
      this.free.push(i);
    }
  }

  private get factor(): number {
    return SaveManager.settings.reducedEffects ? 0.35 : 1;
  }

  private spawn(x: number, y: number, tex: string, tint: number, vx: number, vy: number, gravity: number, life: number, s0: number, s1: number, spin: number): void {
    const idx = this.free.pop();
    if (idx === undefined) return;
    const p = this.pool[idx];
    p.active = true;
    p.vx = vx; p.vy = vy; p.gravity = gravity;
    p.life = life; p.maxLife = life;
    p.s0 = s0; p.s1 = s1; p.spin = spin;
    p.img.setTexture(tex).setTint(tint).setPosition(x, y).setScale(s0).setAlpha(1).setRotation(Math.random() * 6).setVisible(true);
  }

  burst(x: number, y: number, tint: number, count: number, o: BurstOpts = {}): void {
    const n = Math.max(1, Math.round(count * this.factor));
    const speed = o.speed ?? 260;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.75);
      const sc = (o.scale ?? 0.45) * (0.6 + Math.random() * 0.6);
      this.spawn(x, y, o.tex ?? 'dot', tint, Math.cos(a) * v, Math.sin(a) * v - 60, o.gravity ?? 520, (o.life ?? 560) * (0.7 + Math.random() * 0.5), sc, 0.05, (Math.random() - 0.5) * 8);
    }
  }

  sparkle(x: number, y: number, count = 6): void {
    this.burst(x, y, 0xffffff, count, { tex: 'spark', speed: 120, gravity: 0, life: 520, scale: 0.7 });
  }

  /** Light trail behind a flying bubble. */
  trail(x: number, y: number, tint: number): void {
    if (SaveManager.settings.reducedEffects) return;
    this.spawn(x, y, 'spark', tint, 0, 0, 0, 260, 0.45, 0.05, 0);
  }

  confetti(x: number, y: number, count = 40): void {
    const colors = [0xff4b5c, 0x3aa0ff, 0x4cd964, 0xffd93b, 0xa65cff, 0xff9a2e];
    const n = Math.max(4, Math.round(count * this.factor));
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const v = 380 + Math.random() * 520;
      this.spawn(x, y, 'confetti', colors[i % colors.length], Math.cos(a) * v, Math.sin(a) * v, 780, 1700 + Math.random() * 700, 0.8 + Math.random() * 0.6, 0.7, (Math.random() - 0.5) * 14);
    }
  }

  /** Confetti raining from the top of the screen. */
  rain(count = 50): void {
    const colors = [0xff4b5c, 0x3aa0ff, 0x4cd964, 0xffd93b, 0xa65cff, 0xff9a2e];
    const n = Math.max(4, Math.round(count * this.factor));
    for (let i = 0; i < n; i++) {
      this.spawn(Math.random() * GAME_WIDTH, -20 - Math.random() * 200, 'confetti', colors[i % colors.length], (Math.random() - 0.5) * 120, 80 + Math.random() * 160, 160, 3200, 1, 1, (Math.random() - 0.5) * 10);
    }
  }

  update(dtMs: number): void {
    const dt = Math.min(dtMs, 50) / 1000;
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life -= dt * 1000;
      if (p.life <= 0 || p.img.y > GAME_HEIGHT + 60) {
        p.active = false;
        p.img.setVisible(false);
        this.free.push(i);
        continue;
      }
      p.vy += p.gravity * dt;
      const t = 1 - p.life / p.maxLife;
      p.img.x += p.vx * dt;
      p.img.y += p.vy * dt;
      p.img.rotation += p.spin * dt;
      p.img.setScale(p.s0 + (p.s1 - p.s0) * t);
      p.img.setAlpha(t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1);
    }
  }

  clear(): void {
    this.pool.forEach((p, i) => {
      if (p.active) {
        p.active = false;
        p.img.setVisible(false);
        this.free.push(i);
      }
    });
  }
}
