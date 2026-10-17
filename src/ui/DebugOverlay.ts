import Phaser from 'phaser';
import { BUBBLE_RADIUS } from '../config/GameConfig';
import type { BubbleGrid } from '../game/BubbleGrid';
import type { TraceResult } from '../game/CollisionSystem';
import { appState } from '../game/GameState';
import { makeText } from './TextStyles';

/** Dev-only overlay: FPS, state, level, grid coordinates, bubble positions and collision points. */
export class DebugOverlay {
  private readonly info: Phaser.GameObjects.Text;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  gridVisible = false;
  private lastTrace: TraceResult | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly levelId: number) {
    this.info = makeText(scene, 8, 134, '', 13, '#00ff9c', { originX: 0, originY: 0, align: 'left', stroke: '#000', strokeThickness: 3 }).setDepth(500);
    this.gfx = scene.add.graphics().setDepth(499);
  }

  toggleGrid(grid: BubbleGrid): void {
    this.gridVisible = !this.gridVisible;
    this.refresh(grid);
  }

  setTrace(t: TraceResult | null): void {
    this.lastTrace = t;
  }

  refresh(grid: BubbleGrid): void {
    this.labels.forEach((l) => l.destroy());
    this.labels = [];
    this.gfx.clear();
    if (!this.gridVisible) return;
    for (let r = 0; r < grid.rows.length; r++) {
      for (let c = 0; c < grid.colsIn(r); c++) {
        const x = grid.x(r, c);
        const y = grid.y(r);
        this.gfx.lineStyle(1, grid.get(r, c) ? 0x00ff9c : 0xffffff, grid.get(r, c) ? 0.9 : 0.25);
        this.gfx.strokeCircle(x, y, BUBBLE_RADIUS);
        if (r < 14) this.labels.push(makeText(this.scene, x, y, `${r},${c}`, 10, '#fff', { stroke: '#000', strokeThickness: 2 }).setDepth(501));
      }
    }
  }

  update(grid: BubbleGrid, session: { movesLeft: number; score: number }, pointer: Phaser.Input.Pointer): void {
    const t = this.lastTrace;
    this.info.setText(
      [
        `FPS ${Math.round(this.scene.game.loop.actualFps)}`,
        `state ${appState.state}  level ${this.levelId}`,
        `moves ${session.movesLeft}  score ${session.score}`,
        `pointer ${Math.round(pointer.worldX)},${Math.round(pointer.worldY)}`,
        t ? `end ${Math.round(t.end.x)},${Math.round(t.end.y)} cell ${t.landing ? `${t.landing.row},${t.landing.col}` : '-'} bounces ${t.bounces}` : '',
        `parity ${grid.parity}  bubbles ${grid.count()}`,
      ].join('\n'),
    );
    if (!this.gridVisible && t) {
      this.gfx.clear();
      t.points.forEach((p) => {
        this.gfx.fillStyle(0xff3366, 1);
        this.gfx.fillCircle(p.x, p.y, 5);
      });
    }
  }
}
