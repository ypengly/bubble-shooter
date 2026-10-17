import Phaser from 'phaser';
import { BUBBLE_SCALE, LAUNCHER_X, LAUNCHER_Y } from '../config/GameConfig';
import { shotTextureKey } from '../game/Bubble';
import type { ShotBubble } from '../types/GameTypes';
import { makeText } from '../ui/TextStyles';

/** The launcher: rotating barrel, loaded bubble, and the "next" bubble. */
export class Player {
  private readonly barrel: Phaser.GameObjects.Image;
  private readonly base: Phaser.GameObjects.Image;
  private readonly current: Phaser.GameObjects.Image;
  private readonly next: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly nextLabel: Phaser.GameObjects.Text;
  private glowTween: Phaser.Tweens.Tween | null = null;

  constructor(private readonly scene: Phaser.Scene, onSwap: () => void) {
    this.base = scene.add.image(LAUNCHER_X, LAUNCHER_Y + 34, 'launcher_base').setScale(0.9).setDepth(11);
    this.barrel = scene.add.image(LAUNCHER_X, LAUNCHER_Y, 'launcher_barrel').setOrigin(0.5, 0.86).setScale(0.82).setDepth(12);
    this.glow = scene.add.image(LAUNCHER_X, LAUNCHER_Y, 'glow').setDepth(12).setScale(0.5).setVisible(false).setTint(0xfff2a0);
    this.current = scene.add.image(LAUNCHER_X, LAUNCHER_Y, 'b_red').setScale(BUBBLE_SCALE).setDepth(13);
    const nx = LAUNCHER_X - 118;
    const ny = LAUNCHER_Y + 40;
    scene.add.image(nx, ny + 3, 'dot').setTint(0x1b2c52).setAlpha(0.35).setScale(2.1).setDepth(11);
    this.next = scene.add.image(nx, ny, 'b_red').setScale(BUBBLE_SCALE * 0.8).setDepth(13).setInteractive({ useHandCursor: true });
    this.next.on('pointerdown', () => onSwap());
    this.nextLabel = makeText(scene, nx, ny - 36, 'NEXT', 13, '#ffffff', { stroke: '#1b2c52', strokeThickness: 4 }).setDepth(13);
  }

  setAngle(angle: number): void {
    this.barrel.setRotation(angle);
  }

  /** Updates both bubbles. `pop` plays a small pop-in on the current bubble. */
  setShots(current: ShotBubble, next: ShotBubble, pop = false): void {
    this.current.setTexture(shotTextureKey(current)).setVisible(true).setAngle(0);
    this.next.setTexture(shotTextureKey(next));
    const isSpecial = current.special !== null;
    this.glow.setVisible(isSpecial);
    this.glowTween?.stop();
    this.glowTween = null;
    if (isSpecial) {
      this.glowTween = this.scene.tweens.add({ targets: this.glow, scale: { from: 0.45, to: 0.75 }, alpha: { from: 0.9, to: 0.35 }, duration: 520, yoyo: true, repeat: -1 });
    }
    if (pop) {
      this.current.setScale(0.1);
      this.scene.tweens.add({ targets: this.current, scale: BUBBLE_SCALE, duration: 200, ease: 'Back.easeOut' });
      this.next.setScale(BUBBLE_SCALE * 0.3);
      this.scene.tweens.add({ targets: this.next, scale: BUBBLE_SCALE * 0.8, duration: 220, ease: 'Back.easeOut' });
    } else {
      this.current.setScale(BUBBLE_SCALE);
      this.next.setScale(BUBBLE_SCALE * 0.8);
    }
  }

  hideCurrent(): void {
    this.current.setVisible(false);
    this.glow.setVisible(false);
  }

  /** Muzzle position for spawning effects. */
  recoil(): void {
    this.scene.tweens.add({ targets: this.barrel, scaleY: 0.74, duration: 60, yoyo: true, ease: 'Quad.easeOut' });
  }

  setVisible(v: boolean): void {
    [this.barrel, this.base, this.current, this.next, this.nextLabel].forEach((o) => o.setVisible(v));
  }
}
