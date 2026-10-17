import Phaser from 'phaser';

export interface InputCallbacks {
  onAim: (x: number, y: number, isTouch: boolean) => void;
  onRelease: (x: number, y: number, isTouch: boolean) => void;
}

/**
 * Pointer input for aiming: mouse hover/click and touch (press & drag to aim, release to shoot).
 * Presses that land on UI buttons are ignored.
 */
export class InputManager {
  enabled = true;
  private pressing = false;

  constructor(private readonly scene: Phaser.Scene, private readonly cb: InputCallbacks) {
    scene.input.on('pointerdown', this.down, this);
    scene.input.on('pointermove', this.move, this);
    scene.input.on('pointerup', this.up, this);
  }

  private down(p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (!this.enabled || over.length > 0) return;
    this.pressing = true;
    this.cb.onAim(p.worldX, p.worldY, p.wasTouch);
  }

  private move(p: Phaser.Input.Pointer): void {
    if (!this.enabled) return;
    if (this.pressing || !p.wasTouch) this.cb.onAim(p.worldX, p.worldY, p.wasTouch);
  }

  private up(p: Phaser.Input.Pointer): void {
    if (!this.pressing) return;
    this.pressing = false;
    if (this.enabled) this.cb.onRelease(p.worldX, p.worldY, p.wasTouch);
  }

  get isPressing(): boolean {
    return this.pressing;
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.down, this);
    this.scene.input.off('pointermove', this.move, this);
    this.scene.input.off('pointerup', this.up, this);
  }
}
