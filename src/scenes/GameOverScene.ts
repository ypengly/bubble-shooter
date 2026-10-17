import Phaser from 'phaser';
import { Dialog } from '../ui/Dialog';
import { fadeToScene } from '../utils/SceneUtils';
import { formatNumber } from '../utils/MathUtils';

interface Data {
  levelId: number;
  score: number;
  target: number;
  reason: 'moves' | 'overflow' | null;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data: Data): void {
    const why = data.reason === 'moves' ? 'Out of shots!' : 'The bubbles reached the bottom!';
    new Dialog(this, {
      title: 'GAME OVER',
      titleColor: '#ffb3b3',
      subtitle: why,
      lines: [`Score: ${formatNumber(data.score)}`, `Target: ${formatNumber(data.target)}`],
      buttons: [
        { label: 'RETRY', style: 'primary', onClick: () => { this.scene.stop('GameScene'); this.scene.start('GameScene', { levelId: data.levelId }); } },
        { label: 'LEVELS', style: 'secondary', onClick: () => fadeToScene(this, 'LevelSelectScene', { focusCurrent: true }, ['GameScene']) },
        { label: 'MAIN MENU', style: 'neutral', onClick: () => fadeToScene(this, 'MainMenuScene', undefined, ['GameScene']) },
      ],
    });
  }
}
