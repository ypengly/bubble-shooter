import Phaser from 'phaser';
import './style.css';
import { GAME_HEIGHT, GAME_WIDTH } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { LevelCompleteScene } from './scenes/LevelCompleteScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { PauseScene } from './scenes/PauseScene';
import { PreloadScene } from './scenes/PreloadScene';
import { SettingsScene } from './scenes/SettingsScene';
import { AudioManager } from './systems/AudioManager';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#4db8ff',
  // Fixed 540x960 design space, scaled to fit any screen while keeping the aspect ratio.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  render: { antialias: true, powerPreference: 'high-performance' },
  disableContextMenu: true,
  scene: [BootScene, PreloadScene, MainMenuScene, LevelSelectScene, GameScene, PauseScene, LevelCompleteScene, GameOverScene, SettingsScene],
});

// Browsers only allow audio after a user gesture.
const unlock = (): void => AudioManager.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);
window.addEventListener('touchend', unlock);

// Keep the page from scrolling/bouncing while playing on touch devices.
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

window.addEventListener('resize', () => game.scale.refresh());
