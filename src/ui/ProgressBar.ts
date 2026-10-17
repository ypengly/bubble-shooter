import Phaser from 'phaser';

/** Horizontal rounded progress bar with an animated fill. */
export class ProgressBar extends Phaser.GameObjects.Container {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private shown = 0;
  private tween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly bw: number, private readonly bh: number, private readonly color = 0xffd93b) {
    super(scene, x, y);
    this.gfx = scene.add.graphics();
    this.add(this.gfx);
    this.redraw();
    scene.add.existing(this);
  }

  setValue(ratio: number, animate = true): void {
    const target = Phaser.Math.Clamp(ratio, 0, 1);
    this.tween?.stop();
    if (!animate) {
      this.shown = target;
      this.redraw();
      return;
    }
    this.tween = this.scene.tweens.add({
      targets: this,
      duration: 350,
      ease: 'Cubic.easeOut',
      onUpdate: (tw: Phaser.Tweens.Tween) => {
        this.shown = Phaser.Math.Linear(this.shown, target, tw.progress);
        this.redraw();
      },
      onComplete: () => {
        this.shown = target;
        this.redraw();
      },
    });
  }

  private redraw(): void {
    const g = this.gfx;
    const r = this.bh / 2;
    g.clear();
    g.fillStyle(0x15305e, 0.55);
    g.fillRoundedRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh, r);
    const w = Math.max(this.bh, (this.bw - 6) * this.shown);
    if (this.shown > 0.001) {
      g.fillStyle(this.color, 1);
      g.fillRoundedRect(-this.bw / 2 + 3, -this.bh / 2 + 3, w, this.bh - 6, r - 3);
      g.fillStyle(0xffffff, 0.35);
      g.fillRoundedRect(-this.bw / 2 + 8, -this.bh / 2 + 5, Math.max(0, w - 10), (this.bh - 6) * 0.35, 4);
    }
  }
}
