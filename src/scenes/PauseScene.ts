import Phaser from 'phaser';
import { appState } from '../game/GameState';
import { GameStateId } from '../types/GameTypes';
import { Dialog } from '../ui/Dialog';
import { fadeToScene } from '../utils/SceneUtils';

/** Overlay shown on top of a paused GameScene. */
export class PauseScene extends Phaser.Scene {
  private levelId = 1;

  constructor() {
    super('PauseScene');
  }

  init(data: { levelId?: number }): void {
    this.levelId = data?.levelId ?? 1;
  }

  create(): void {
    appState.set(GameStateId.PAUSED);
    new Dialog(this, {
      title: 'PAUSED',
      buttons: [
        { label: 'RESUME', style: 'primary', onClick: () => this.resume() },
        { label: 'RESTART', style: 'secondary', onClick: () => this.restart() },
        { label: 'SETTINGS', style: 'neutral', onClick: () => { this.scene.launch('SettingsScene', { overlay: true }); this.scene.pause(); } },
        { label: 'LEVELS', style: 'secondary', onClick: () => fadeToScene(this, 'LevelSelectScene', { focusCurrent: true }, ['GameScene']) },
        { label: 'MAIN MENU', style: 'danger', onClick: () => fadeToScene(this, 'MainMenuScene', undefined, ['GameScene']) },
      ],
    });
    this.input.keyboard?.on('keydown-ESC', () => this.resume());
    this.events.on(Phaser.Scenes.Events.RESUME, () => appState.set(GameStateId.PAUSED));
  }

  private resume(): void {
    appState.set(GameStateId.PLAYING);
    this.scene.stop();
    this.scene.resume('GameScene');
  }

  private restart(): void {
    this.scene.stop('GameScene');
    this.scene.start('GameScene', { levelId: this.levelId });
  }
}
