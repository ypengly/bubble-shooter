import Phaser from 'phaser';

export const FONT = '"Arial Rounded MT Bold", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';

export interface TextOpts {
  stroke?: string;
  strokeThickness?: number;
  originX?: number;
  originY?: number;
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  shadow?: boolean;
}

/** Bold, crisp (2x resolution) text with an optional outline. */
export function makeText(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color = '#ffffff', opts: TextOpts = {}): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, text, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: 'bold',
    color,
    stroke: opts.stroke,
    strokeThickness: opts.strokeThickness ?? 0,
    align: opts.align ?? 'center',
    wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    resolution: 2,
  });
  t.setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5);
  if (opts.shadow) t.setShadow(0, 3, 'rgba(0,0,0,0.25)', 0, false, true);
  return t;
}
