import Phaser from 'phaser';
import { GAME_WIDTH, LAUNCHER_X, LAUNCHER_Y } from '../config/GameConfig';
import { formatNumber } from '../utils/MathUtils';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';
import { makeText } from './TextStyles';

/** Top bar (score, level, pause, target progress) plus shot counter and miss meter near the launcher. */
export class HUD {
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly movesText: Phaser.GameObjects.Text;
  private readonly bar: ProgressBar;
  private readonly missDots: Phaser.GameObjects.Image[] = [];
  private readonly warnText: Phaser.GameObjects.Text;
  private readonly freezeText: Phaser.GameObjects.Text;
  private readonly missLabel: Phaser.GameObjects.Text;
  private shownScore = 0;
  private scoreTween: Phaser.Tweens.Tween | null = null;
  private warnTween: Phaser.Tweens.Tween | null = null;
  private readonly pauseBtn: Button;
  private movesRing: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    levelId: number,
    levelName: string,
    private readonly target: number,
    missLimit: number,
    onPause: () => void,
  ) {
    const d = 100;
    const panel = scene.add.graphics().setDepth(d);
    panel.fillStyle(0x12306b, 0.5);
    panel.fillRoundedRect(12, 12, GAME_WIDTH - 24, 64, 22);
    panel.fillStyle(0xffffff, 0.1);
    panel.fillRoundedRect(18, 16, GAME_WIDTH - 36, 20, 10);

    scene.add.image(44, 44, 'star').setScale(0.55).setDepth(d + 1);
    this.scoreText = makeText(scene, 70, 44, '0', 30, '#ffffff', { originX: 0, stroke: '#12306b', strokeThickness: 5 }).setDepth(d + 1);
    makeText(scene, GAME_WIDTH / 2 + 8, 36, `LEVEL ${levelId}`, 24, '#ffffff', { stroke: '#12306b', strokeThickness: 5 }).setDepth(d + 1);
    makeText(scene, GAME_WIDTH / 2 + 8, 60, levelName, 13, '#cfe6ff').setDepth(d + 1);
    this.pauseBtn = new Button(scene, GAME_WIDTH - 52, 44, 'II', { width: 56, height: 46, fontSize: 24, style: 'neutral', onClick: onPause }).setDepth(d + 2);

    this.bar = new ProgressBar(scene, GAME_WIDTH / 2, 100, GAME_WIDTH - 60, 20);
    this.bar.setDepth(d);
    makeText(scene, GAME_WIDTH / 2, 126, `TARGET  ${formatNumber(target)}`, 15, '#ffffff', { stroke: '#12306b', strokeThickness: 4 }).setDepth(d);

    // shots counter (bottom-left)
    this.movesRing = scene.add.graphics().setDepth(d);
    this.movesRing.fillStyle(0x12306b, 0.55).fillCircle(66, 892, 40);
    this.movesRing.lineStyle(4, 0xffffff, 0.8).strokeCircle(66, 892, 40);
    this.movesText = makeText(scene, 66, 888, '0', 34, '#ffffff', { stroke: '#12306b', strokeThickness: 5 }).setDepth(d + 1);
    makeText(scene, 66, 914, 'SHOTS', 12, '#cfe6ff').setDepth(d + 1);

    // miss meter (bottom-right)
    this.missLabel = makeText(scene, GAME_WIDTH - 84, 868, 'MISSES', 14, '#ffffff', { stroke: '#12306b', strokeThickness: 4 }).setDepth(d + 1);
    for (let i = 0; i < missLimit; i++) {
      const gap = Math.min(26, 128 / missLimit);
      const x = GAME_WIDTH - 84 + (i - (missLimit - 1) / 2) * gap;
      this.missDots.push(scene.add.image(x, 896, 'dot').setScale(0.7).setDepth(d + 1).setTint(0x5d7099));
    }
    this.warnText = makeText(scene, LAUNCHER_X, LAUNCHER_Y - 100, 'NEXT MISS ADDS A ROW!', 20, '#ffe066', { stroke: '#8a1020', strokeThickness: 6 }).setDepth(d + 1).setAlpha(0);
    this.freezeText = makeText(scene, GAME_WIDTH - 84, 926, '', 14, '#bfefff', { stroke: '#0e4a78', strokeThickness: 4 }).setDepth(d + 1);
  }

  setScore(score: number, animate = true): void {
    this.scoreTween?.stop();
    if (!animate) {
      this.shownScore = score;
      this.scoreText.setText(formatNumber(score));
    } else {
      const from = this.shownScore;
      this.scoreTween = this.scene.tweens.addCounter({
        from, to: score, duration: 450, ease: 'Cubic.easeOut',
        onUpdate: (t: Phaser.Tweens.Tween) => { this.shownScore = t.getValue() ?? score; this.scoreText.setText(formatNumber(this.shownScore)); },
        onComplete: () => { this.shownScore = score; this.scoreText.setText(formatNumber(score)); },
      });
      this.scene.tweens.add({ targets: this.scoreText, scale: 1.18, duration: 90, yoyo: true });
    }
    this.bar.setValue(score / this.target, animate);
  }

  setMoves(n: number): void {
    this.movesText.setText(String(n));
    this.movesText.setColor(n <= 5 ? '#ffd0d0' : '#ffffff');
    this.scene.tweens.add({ targets: this.movesText, scale: 1.25, duration: 80, yoyo: true });
  }

  setMisses(count: number, warn: boolean): void {
    this.missDots.forEach((d, i) => {
      d.setTint(i < count ? (warn ? 0xff4b5c : 0xffb347) : 0x5d7099);
      if (i === count - 1) this.scene.tweens.add({ targets: d, scale: 1.1, duration: 100, yoyo: true });
    });
    this.warnTween?.stop();
    this.warnTween = null;
    if (warn) {
      this.warnText.setAlpha(1);
      this.warnTween = this.scene.tweens.add({ targets: this.warnText, alpha: 0.35, duration: 380, yoyo: true, repeat: -1 });
      this.scene.tweens.add({ targets: this.missLabel, scale: 1.2, duration: 120, yoyo: true, repeat: 2 });
    } else {
      this.warnText.setAlpha(0);
    }
  }

  setFreeze(shots: number): void {
    this.freezeText.setText(shots > 0 ? `FROZEN x${shots}` : '');
  }

  setPauseVisible(v: boolean): void {
    this.pauseBtn.setVisible(v);
  }
}
