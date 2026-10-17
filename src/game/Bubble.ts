import Phaser from 'phaser';
import { BUBBLE_SCALE } from '../config/GameConfig';
import type { BubbleData, ShotBubble } from '../types/GameTypes';

/** Texture key for a bubble sitting in the grid (changes as obstacles take damage). */
export function textureKeyFor(b: BubbleData): string {
  switch (b.kind) {
    case 'stone': return 'b_stone';
    case 'ice': return `ice_${b.color}_${Math.max(1, b.hp)}`;
    case 'chain': return `chain_${b.color}_${Math.max(1, b.hp)}`;
    case 'locked': return `locked_${b.color}`;
    default: return `b_${b.color}`;
  }
}

export function shotTextureKey(s: ShotBubble): string {
  return s.special ? `sp_${s.special}` : `b_${s.color}`;
}

/** Sprite for one grid bubble. `bubbleId` links it to BubbleData.id. */
export class BubbleSprite extends Phaser.GameObjects.Image {
  readonly bubbleId: number;

  constructor(scene: Phaser.Scene, x: number, y: number, data: BubbleData) {
    super(scene, x, y, textureKeyFor(data));
    this.bubbleId = data.id;
    this.setScale(BUBBLE_SCALE).setDepth(10);
    scene.add.existing(this);
  }

  refresh(data: BubbleData): void {
    this.setTexture(textureKeyFor(data));
  }
}
