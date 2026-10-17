import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { SaveManager } from '../systems/SaveManager';

interface Layer {
  obj: Phaser.GameObjects.Image;
  speed: number;
  parallax: number;
  baseX: number;
}

/** Soft sky, drifting clouds, floating decorative bubbles, and gentle pointer parallax. */
export class Background {
  private layers: Layer[] = [];
  private parallaxX = 0;

  constructor(scene: Phaser.Scene) {
    scene.add.image(0, 0, 'bg_sky').setOrigin(0).setDepth(-100);
    for (let i = 0; i < 5; i++) {
      const cloud = scene.add
        .image(Math.random() * GAME_WIDTH, 80 + i * 170 + Math.random() * 60, 'cloud')
        .setAlpha(0.55 + Math.random() * 0.3)
        .setScale(0.5 + Math.random() * 0.7)
        .setDepth(-90 + i);
      this.layers.push({ obj: cloud, speed: 4 + Math.random() * 8, parallax: 6 + i * 3, baseX: cloud.x });
    }
    for (let i = 0; i < 12; i++) {
      const b = scene.add
        .image(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, 'deco')
        .setScale(0.35 + Math.random() * 0.8)
        .setAlpha(0.35 + Math.random() * 0.35)
        .setDepth(-70);
      this.layers.push({ obj: b, speed: -(10 + Math.random() * 20), parallax: 10 + Math.random() * 14, baseX: b.x });
    }
  }

  update(dtMs: number, pointerNormX = 0): void {
    if (SaveManager.settings.reducedEffects) return;
    const dt = dtMs / 1000;
    this.parallaxX += (pointerNormX - this.parallaxX) * Math.min(1, dt * 3);
    for (const l of this.layers) {
      const o = l.obj;
      if (l.speed > 0) {
        l.baseX += l.speed * dt;
        if (l.baseX > GAME_WIDTH + 200) l.baseX = -200;
      } else {
        o.y += l.speed * dt;
        if (o.y < -50) {
          o.y = GAME_HEIGHT + 50;
          l.baseX = Math.random() * GAME_WIDTH;
        }
      }
      o.x = l.baseX - this.parallaxX * l.parallax;
    }
  }
}
