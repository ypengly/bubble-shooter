import Phaser from 'phaser';
import { BUBBLE_DIAMETER, GAME_HEIGHT, GAME_WIDTH, TEX_RES } from '../config/GameConfig';
import { BUBBLE_COLORS, SPECIAL_IDS, type BubbleColorDef, type SymbolShape } from '../config/BubbleConfig';
import type { SpecialKind } from '../types/GameTypes';

const S = BUBBLE_DIAMETER * TEX_RES; // bubble texture size (96)
const C = S / 2;
const R = C - 2;
const TAU = Math.PI * 2;

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  draw(tex.getContext(), w, h);
  tex.refresh();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}

function bubbleBase(ctx: CanvasRenderingContext2D, fill: string, light: string, dark: string): void {
  circle(ctx, C, C + 2, R);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();
  const g = ctx.createRadialGradient(C - R * 0.35, C - R * 0.4, R * 0.1, C, C, R);
  g.addColorStop(0, light);
  g.addColorStop(0.55, fill);
  g.addColorStop(1, dark);
  circle(ctx, C, C, R);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = dark;
  ctx.stroke();
  gloss(ctx);
}

function gloss(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.ellipse(C - R * 0.3, C - R * 0.46, R * 0.38, R * 0.2, -0.6, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(C, C, R * 0.82, Math.PI * 0.25, Math.PI * 0.75);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function symbol(ctx: CanvasRenderingContext2D, shape: SymbolShape, alpha = 0.6): void {
  const s = S * 0.24;
  ctx.save();
  ctx.translate(C, C + 2);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  switch (shape) {
    case 'circle': ctx.arc(0, 0, s * 0.5, 0, TAU); break;
    case 'square': ctx.rect(-s * 0.45, -s * 0.45, s * 0.9, s * 0.9); break;
    case 'triangle': ctx.moveTo(0, -s * 0.55); ctx.lineTo(s * 0.55, s * 0.45); ctx.lineTo(-s * 0.55, s * 0.45); ctx.closePath(); break;
    case 'diamond': ctx.moveTo(0, -s * 0.62); ctx.lineTo(s * 0.5, 0); ctx.lineTo(0, s * 0.62); ctx.lineTo(-s * 0.5, 0); ctx.closePath(); break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? s * 0.62 : s * 0.27;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      break;
    case 'cross': {
      const t = s * 0.2;
      const l = s * 0.55;
      ctx.moveTo(-t, -l); ctx.lineTo(t, -l); ctx.lineTo(t, -t); ctx.lineTo(l, -t); ctx.lineTo(l, t); ctx.lineTo(t, t);
      ctx.lineTo(t, l); ctx.lineTo(-t, l); ctx.lineTo(-t, t); ctx.lineTo(-l, t); ctx.lineTo(-l, -t); ctx.lineTo(-t, -t);
      ctx.closePath();
      break;
    }
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function coloredBubble(ctx: CanvasRenderingContext2D, def: BubbleColorDef): void {
  bubbleBase(ctx, def.fill, def.light, def.dark);
  symbol(ctx, def.symbol);
}

function iceOverlay(ctx: CanvasRenderingContext2D, hp: number): void {
  circle(ctx, C, C, R);
  ctx.fillStyle = hp >= 2 ? 'rgba(205,240,255,0.58)' : 'rgba(205,240,255,0.32)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  if (hp >= 2) {
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i * TAU) / 3;
      ctx.moveTo(C + Math.cos(a) * R * 0.45, C + Math.sin(a) * R * 0.45);
      ctx.lineTo(C + Math.cos(a) * R * 0.88, C + Math.sin(a) * R * 0.88);
    }
  } else {
    ctx.strokeStyle = 'rgba(40,90,160,0.85)';
    ctx.moveTo(C - R * 0.2, C - R * 0.85); ctx.lineTo(C + R * 0.05, C - R * 0.3); ctx.lineTo(C - R * 0.15, C + R * 0.1);
    ctx.lineTo(C + R * 0.2, C + R * 0.5); ctx.lineTo(C + R * 0.05, C + R * 0.85);
    ctx.moveTo(C + R * 0.05, C - R * 0.3); ctx.lineTo(C + R * 0.55, C - R * 0.1);
  }
  ctx.stroke();
}

function chainLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, links: number): void {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  for (let i = 0; i < links; i++) {
    const t = links === 1 ? 0.5 : i / (links - 1);
    ctx.save();
    ctx.translate(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
    ctx.rotate(ang + (i % 2 === 0 ? 0 : Math.PI / 2));
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 6, 0, 0, TAU);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#4b5563';
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();
    ctx.restore();
  }
}

function chainOverlay(ctx: CanvasRenderingContext2D, hp: number): void {
  const d = R * 0.72;
  if (hp >= 3) {
    chainLine(ctx, C - d, C - d, C + d, C + d, 5);
    chainLine(ctx, C + d, C - d, C - d, C + d, 5);
  } else if (hp === 2) {
    chainLine(ctx, C - d, C - d, C + d, C + d, 5);
  } else {
    chainLine(ctx, C - d * 0.7, C - d * 0.7, C - d * 0.05, C - d * 0.05, 2);
    chainLine(ctx, C + d * 0.15, C + d * 0.15, C + d * 0.7, C + d * 0.7, 2);
  }
}

function lockOverlay(ctx: CanvasRenderingContext2D): void {
  circle(ctx, C, C, R);
  ctx.fillStyle = 'rgba(20,20,45,0.3)';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#b8860b';
  ctx.beginPath();
  ctx.arc(C, C - 2, 11, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#ffcf3a';
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(C - 16, C - 2, 32, 24, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#6b4a00';
  circle(ctx, C, C + 9, 4);
  ctx.fill();
  ctx.fillRect(C - 1.5, C + 9, 3, 8);
}

function stoneBubble(ctx: CanvasRenderingContext2D): void {
  bubbleBase(ctx, '#9aa3ad', '#d8dee4', '#586069');
  ctx.strokeStyle = 'rgba(40,48,58,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(C - 24, C - 8); ctx.lineTo(C - 8, C - 2); ctx.lineTo(C - 14, C + 14); ctx.lineTo(C + 4, C + 24);
  ctx.moveTo(C + 8, C - 26); ctx.lineTo(C + 14, C - 8); ctx.lineTo(C + 28, C - 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(40,48,58,0.35)';
  for (const [x, y] of [[-20, 16], [18, 14], [6, -14], [-6, 28]]) {
    circle(ctx, C + x, C + y, 3);
    ctx.fill();
  }
}

function specialBubble(ctx: CanvasRenderingContext2D, kind: SpecialKind): void {
  switch (kind) {
    case 'bomb':
      bubbleBase(ctx, '#2b3550', '#7a89aa', '#0c1020');
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(C + 14, C - 30); ctx.quadraticCurveTo(C + 22, C - 40, C + 30, C - 34);
      ctx.stroke();
      ctx.fillStyle = '#ffe066';
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8;
        const rad = i % 2 === 0 ? 9 : 4;
        const x = C + 31 + Math.cos(a) * rad;
        const y = C - 35 + Math.sin(a) * rad;
        if (i === 0) { ctx.beginPath(); ctx.moveTo(x, y); } else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = `bold ${S * 0.3}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', C, C + 4);
      break;
    case 'rainbow': {
      const cols = Object.values(BUBBLE_COLORS);
      cols.forEach((c, i) => {
        ctx.beginPath();
        ctx.moveTo(C, C);
        ctx.arc(C, C, R, -Math.PI / 2 + (i * TAU) / cols.length, -Math.PI / 2 + ((i + 1) * TAU) / cols.length);
        ctx.closePath();
        ctx.fillStyle = c.fill;
        ctx.fill();
      });
      circle(ctx, C, C, R * 0.34);
      ctx.fillStyle = '#fff';
      ctx.fill();
      circle(ctx, C, C, R);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.stroke();
      gloss(ctx);
      break;
    }
    case 'lightning':
      bubbleBase(ctx, '#ffd93b', '#fff4a8', '#c98a00');
      ctx.beginPath();
      [[0.12, -0.7], [-0.3, 0.06], [-0.02, 0.06], [-0.16, 0.74], [0.32, -0.12], [0.04, -0.12]].forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(C + x * R, C + y * R);
        else ctx.lineTo(C + x * R, C + y * R);
      });
      ctx.closePath();
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#d48a00';
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    case 'fire':
      bubbleBase(ctx, '#ff6a1f', '#ffd34d', '#b21f00');
      ctx.beginPath();
      ctx.moveTo(C, C - R * 0.66);
      ctx.quadraticCurveTo(C + R * 0.62, C - R * 0.1, C + R * 0.3, C + R * 0.42);
      ctx.quadraticCurveTo(C, C + R * 0.72, C - R * 0.3, C + R * 0.42);
      ctx.quadraticCurveTo(C - R * 0.6, C - R * 0.05, C, C - R * 0.66);
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(C, C + R * 0.25, R * 0.16, R * 0.24, 0, 0, TAU);
      ctx.fillStyle = '#ffb000';
      ctx.fill();
      break;
    case 'freeze':
      bubbleBase(ctx, '#7fd6ff', '#e6f9ff', '#2a8fc4');
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(C - Math.cos(a) * R * 0.62, C - Math.sin(a) * R * 0.62);
        ctx.lineTo(C + Math.cos(a) * R * 0.62, C + Math.sin(a) * R * 0.62);
        ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      circle(ctx, C, C, 6);
      ctx.fill();
      break;
  }
}

function starShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

/** Generates every texture the game uses. Safe to call more than once. */
export function generateAllTextures(scene: Phaser.Scene): void {
  for (const def of Object.values(BUBBLE_COLORS)) {
    make(scene, `b_${def.id}`, S, S, (ctx) => coloredBubble(ctx, def));
    for (const hp of [2, 1]) {
      make(scene, `ice_${def.id}_${hp}`, S, S, (ctx) => { coloredBubble(ctx, def); iceOverlay(ctx, hp); });
    }
    for (const hp of [3, 2, 1]) {
      make(scene, `chain_${def.id}_${hp}`, S, S, (ctx) => { coloredBubble(ctx, def); chainOverlay(ctx, hp); });
    }
    make(scene, `locked_${def.id}`, S, S, (ctx) => { coloredBubble(ctx, def); lockOverlay(ctx); });
  }
  make(scene, 'b_stone', S, S, stoneBubble);
  for (const kind of SPECIAL_IDS) make(scene, `sp_${kind}`, S, S, (ctx) => specialBubble(ctx, kind));

  make(scene, 'dot', 24, 24, (ctx) => { circle(ctx, 12, 12, 11); ctx.fillStyle = '#fff'; ctx.fill(); });
  make(scene, 'spark', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  make(scene, 'glow', 160, 160, (ctx) => {
    const g = ctx.createRadialGradient(80, 80, 0, 80, 80, 80);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 160, 160);
  });
  make(scene, 'ring', 128, 128, (ctx) => { circle(ctx, 64, 64, 58); ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.stroke(); });
  make(scene, 'confetti', 16, 8, (ctx) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 16, 8); });
  make(scene, 'star', 72, 72, (ctx) => {
    starShape(ctx, 36, 38, 32, 14);
    const g = ctx.createLinearGradient(0, 6, 0, 70);
    g.addColorStop(0, '#fff3a0'); g.addColorStop(1, '#ffb800');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#c77800'; ctx.lineJoin = 'round'; ctx.stroke();
  });
  make(scene, 'star_off', 72, 72, (ctx) => {
    starShape(ctx, 36, 38, 32, 14);
    ctx.fillStyle = 'rgba(30,60,110,0.35)'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineJoin = 'round'; ctx.stroke();
  });
  make(scene, 'padlock', 48, 56, (ctx) => {
    ctx.lineWidth = 6; ctx.strokeStyle = '#8a97a8';
    ctx.beginPath(); ctx.arc(24, 22, 12, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#b8c3d1'; ctx.strokeStyle = '#7b8798'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(6, 22, 36, 28, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5b6677'; circle(ctx, 24, 34, 4); ctx.fill(); ctx.fillRect(22.5, 34, 3, 9);
  });
  make(scene, 'cloud', 320, 140, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    for (const [x, y, r] of [[80, 90, 50], [140, 70, 62], [210, 84, 54], [260, 100, 36], [50, 104, 34]]) { circle(ctx, x, y, r); ctx.fill(); }
    ctx.fillRect(50, 96, 230, 40);
  });
  make(scene, 'deco', 64, 64, (ctx) => {
    circle(ctx, 32, 32, 28);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(22, 20, 8, 4, -0.6, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
  });
  make(scene, 'bg_sky', GAME_WIDTH, GAME_HEIGHT, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#4db8ff'); g.addColorStop(0.55, '#8fd8ff'); g.addColorStop(1, '#e4f7ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const sun = ctx.createRadialGradient(w * 0.82, h * 0.1, 0, w * 0.82, h * 0.1, 260);
    sun.addColorStop(0, 'rgba(255,255,220,0.8)'); sun.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
  });
  make(scene, 'launcher_base', 240, 96, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 96);
    g.addColorStop(0, '#7a8ba8'); g.addColorStop(1, '#2d3a55');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(8, 30, 224, 60, 30); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#1b2640'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.roundRect(24, 36, 192, 14, 7); ctx.fill();
  });
  make(scene, 'launcher_barrel', 64, 150, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, '#5b6b8a'); g.addColorStop(0.5, '#a9b8d4'); g.addColorStop(1, '#4a5a78');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(8, 4, 48, 142, 16); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#1b2640'; ctx.stroke();
    ctx.fillStyle = '#ff5c8a';
    ctx.beginPath(); ctx.roundRect(4, 4, 56, 22, 10); ctx.fill();
    ctx.stroke();
  });
}
