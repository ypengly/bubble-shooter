import Phaser from 'phaser';
import { OPTIONAL_IMAGES } from '../config/AssetConfig';
import { SaveManager } from '../systems/SaveManager';
import { makeText } from '../ui/TextStyles';

/** Reads the save file, starts optional asset loading and shows a loading bar. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    SaveManager.settings; // touching it loads the save
    this.cameras.main.setBackgroundColor('#4db8ff');
    const text = makeText(this, 270, 440, 'Loading...', 36, '#ffffff', { stroke: '#12306b', strokeThickness: 6 });
    const bar = this.add.graphics();
    const draw = (v: number): void => {
      bar.clear();
      bar.fillStyle(0x12306b, 0.5).fillRoundedRect(90, 490, 360, 22, 11);
      bar.fillStyle(0xffffff, 1).fillRoundedRect(94, 494, Math.max(14, 352 * v), 14, 7);
    };
    draw(0);
    this.load.on('progress', draw);
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn(`[assets] could not load "${file.key}", using generated fallback`));
    for (const img of OPTIONAL_IMAGES) this.load.image(img.key, img.url);
    this.events.once('shutdown', () => text.destroy());
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}
