import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/GameConfig';
import { ParticleManager } from '../systems/ParticleManager';
import { Dialog, type DialogButton } from '../ui/Dialog';
import { fadeToScene } from '../utils/SceneUtils';
import { formatNumber } from '../utils/MathUtils';

interface Data {
  levelId: number;
  score: number;
  stars: number;
  newBest: boolean;
  nextId: number | null;
  bestCombo: number;
}

/** Stars, score and next-step buttons, with confetti. */
export class LevelCompleteScene extends Phaser.Scene {
  private particles!: ParticleManager;

  constructor() {
    super('LevelCompleteScene');
  }

  create(data: Data): void {
    this.particles = new ParticleManager(this, 250);
    const praise = data.stars >= 3 ? 'Perfect!' : data.stars === 2 ? 'Great job!' : 'Nice one!';
    const lines = [`Score: ${formatNumber(data.score)}`];
    if (data.newBest) lines.push('New best!');
    if (data.bestCombo >= 2) lines.push(`Best combo: x${data.bestCombo}`);
    const buttons: DialogButton[] = [];
    if (data.nextId !== null) buttons.push({ label: 'NEXT LEVEL', style: 'primary', onClick: () => this.go('GameScene', { levelId: data.nextId }) });
    buttons.push({ label: 'RETRY', style: 'secondary', onClick: () => this.go('GameScene', { levelId: data.levelId }) });
    buttons.push({ label: 'LEVELS', style: 'neutral', onClick: () => this.go('LevelSelectScene', { focusCurrent: true }) });
    new Dialog(this, {
      title: 'LEVEL COMPLETE',
      titleColor: '#b9ff9e',
      subtitle: praise,
      stars: data.stars,
      lines,
      buttons,
      onStarsDone: () => {
        this.particles.confetti(GAME_WIDTH / 2 - 120, 560, 40);
        this.particles.confetti(GAME_WIDTH / 2 + 120, 560, 40);
        if (data.stars >= 3) this.particles.rain(60);
      },
    });
  }

  private go(key: string, data: object): void {
    this.scene.stop('GameScene');
    if (key === 'GameScene') this.scene.start('GameScene', data);
    else fadeToScene(this, key, data);
  }

  update(_t: number, dt: number): void {
    this.particles.update(dt);
  }
}
