import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { appState } from '../game/GameState';
import { AudioManager } from '../systems/AudioManager';
import { SaveManager } from '../systems/SaveManager';
import { GameStateId, type Settings } from '../types/GameTypes';
import { Background } from '../ui/Background';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { makeText } from '../ui/TextStyles';
import { fadeToScene } from '../utils/SceneUtils';

/** Toggles for music, sound, effects and aim guide. Works standalone or as an overlay on Pause. */
export class SettingsScene extends Phaser.Scene {
  private overlay = false;
  private returnTo = 'MainMenuScene';
  private bg: Background | null = null;

  constructor() {
    super('SettingsScene');
  }

  init(data: { overlay?: boolean; returnTo?: string }): void {
    this.overlay = !!data?.overlay;
    this.returnTo = data?.returnTo ?? 'MainMenuScene';
  }

  create(): void {
    appState.set(GameStateId.SETTINGS);
    if (this.overlay) {
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 2, GAME_HEIGHT * 2, 0x0b1b3a, 0.86).setInteractive();
    } else {
      this.cameras.main.fadeIn(250);
      this.bg = new Background(this);
    }

    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.22).fillRoundedRect(46, 146, 448, 640, 36);
    panel.fillStyle(0x1e4fa3, 1).fillRoundedRect(40, 136, 460, 650, 36);
    panel.fillStyle(0xf4fbff, 1).fillRoundedRect(48, 206, 444, 572, 28);
    makeText(this, GAME_WIDTH / 2, 172, 'SETTINGS', 40, '#ffffff', { stroke: '#12306b', strokeThickness: 6, shadow: true });

    this.addToggle(260, 'Music', 'music');
    this.addToggle(340, 'Sound effects', 'sound');
    this.addToggle(420, 'Reduced effects', 'reducedEffects');
    this.addToggle(500, 'Aim bounce guide', 'aimGuide');

    makeText(this, GAME_WIDTH / 2, 590, 'Aim: move the mouse or drag a finger.\nRelease / click to shoot. Tap NEXT to swap.\nKeyboard: arrow keys + Space.', 17, '#4a6597', { align: 'center', wrap: 400 });

    new Button(this, GAME_WIDTH / 2, 672, 'RESET PROGRESS', { width: 300, height: 56, fontSize: 22, style: 'danger', onClick: () => this.confirmReset() });
    new Button(this, GAME_WIDTH / 2, 872, 'BACK', { width: 260, height: 70, fontSize: 32, style: 'primary', onClick: () => this.back() }).setDepth(10);
    this.input.keyboard?.on('keydown-ESC', () => this.back());
  }

  private addToggle(y: number, label: string, key: keyof Settings): void {
    makeText(this, 84, y, label, 28, '#244070', { originX: 0 });
    const g = this.add.graphics();
    const state = makeText(this, 396, y, '', 14, '#ffffff');
    const draw = (): void => {
      const on = SaveManager.settings[key];
      g.clear();
      g.fillStyle(on ? 0x3fcf4f : 0x8a98b4, 1).fillRoundedRect(350, y - 20, 100, 40, 20);
      g.fillStyle(0xffffff, 1).fillCircle(on ? 430 : 370, y, 16);
      state.setText(on ? 'ON' : 'OFF').setX(on ? 384 : 416);
    };
    draw();
    const hit = this.add.rectangle(GAME_WIDTH / 2, y, 420, 64, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => {
      SaveManager.updateSettings({ [key]: !SaveManager.settings[key] } as Partial<Settings>);
      AudioManager.unlock();
      AudioManager.applySettings();
      AudioManager.play('click');
      draw();
    });
  }

  private confirmReset(): void {
    const dlg: Dialog = new Dialog(this, {
      title: 'RESET?',
      subtitle: 'All stars and progress will be erased.',
      buttons: [
        { label: 'YES, RESET', style: 'danger', onClick: () => { SaveManager.reset(); dlg.destroy(); this.scene.restart({ overlay: this.overlay, returnTo: this.returnTo }); } },
        { label: 'CANCEL', style: 'neutral', onClick: () => dlg.destroy() },
      ],
    });
    dlg.setDepth(300);
  }

  private back(): void {
    if (this.overlay) {
      appState.set(GameStateId.PAUSED);
      this.scene.stop();
      this.scene.resume('PauseScene');
    } else {
      fadeToScene(this, this.returnTo);
    }
  }

  update(_t: number, dt: number): void {
    this.bg?.update(dt, 0);
  }
}
