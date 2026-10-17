import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';
import { makeText } from './TextStyles';

export type LevelCardState = 'locked' | 'open' | 'done';

/** A round level node on the level map. */
export class LevelCard extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, readonly levelId: number, state: LevelCardState, stars: number, isCurrent: boolean, onTap: (id: number) => void) {
    super(scene, x, y);
    const g = scene.add.graphics();
    const colors = state === 'locked' ? [0x7b8aa6, 0x55627c] : state === 'done' ? [0x4cd964, 0x1f9a37] : [0x3aa0ff, 0x1b64c2];
    g.fillStyle(0x000000, 0.22);
    g.fillCircle(0, 8, 44);
    g.fillStyle(colors[1], 1);
    g.fillCircle(0, 5, 44);
    g.fillStyle(colors[0], 1);
    g.fillCircle(0, 0, 42);
    g.fillStyle(0xffffff, 0.3);
    g.fillEllipse(-10, -20, 40, 18);
    g.lineStyle(4, 0xffffff, 0.85);
    g.strokeCircle(0, 0, 42);
    this.add(g);

    if (state === 'locked') {
      this.add(scene.add.image(0, 0, 'padlock').setScale(0.8));
    } else {
      this.add(makeText(scene, 0, -2, String(levelId), 38, '#ffffff', { stroke: '#12306b', strokeThickness: 6 }));
      for (let i = 0; i < 3; i++) {
        this.add(scene.add.image((i - 1) * 26, 50 + (i === 1 ? 4 : 0), i < stars ? 'star' : 'star_off').setScale(0.4));
      }
    }
    this.setSize(92, 92);
    if (state !== 'locked') {
      this.setInteractive({ useHandCursor: true });
      this.on('pointerup', () => {
        AudioManager.play('click');
        onTap(levelId);
      });
    }
    if (isCurrent) {
      const ring = scene.add.image(0, 0, 'ring').setScale(0.85).setTint(0xffffff);
      this.addAt(ring, 0);
      scene.tweens.add({ targets: ring, scale: 1.1, alpha: 0.2, duration: 800, yoyo: true, repeat: -1 });
      scene.tweens.add({ targets: this, y: y - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    scene.add.existing(this);
  }
}
