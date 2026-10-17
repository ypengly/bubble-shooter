import Phaser from 'phaser';
import { generateAllTextures } from '../systems/TextureFactory';
import { makeText } from '../ui/TextStyles';

/** Generates every procedural texture, then opens the menu. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#4db8ff');
    makeText(this, 270, 440, 'Loading...', 36, '#ffffff', { stroke: '#12306b', strokeThickness: 6 });
    // Let one frame render so the text appears before the (short) texture work.
    this.time.delayedCall(30, () => {
      try {
        generateAllTextures(this);
      } catch (e) {
        console.error('[textures] generation failed', e);
      }
      this.scene.start('MainMenuScene');
    });
  }
}
