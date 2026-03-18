import { GameState, CollisionEvent } from './types';

const TRAIL_ALPHA = 0.15;
const VIBRATION_DECAY = 0.92;
const FLASH_DURATION = 8; // frames

interface Flash {
  x: number;
  y: number;
  color: string;
  life: number;
}

let flashes: Flash[] = [];
let ballGlowCanvas: OffscreenCanvas | null = null;
let ballGlowCtx: OffscreenCanvasRenderingContext2D | null = null;

function ensureBallGlow(radius: number) {
  if (ballGlowCanvas) return;
  const size = radius * 8;
  ballGlowCanvas = new OffscreenCanvas(size, size);
  ballGlowCtx = ballGlowCanvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;

  // Pre-render radial gradient glow (stamp-based, no runtime shadowBlur)
  const grad = ballGlowCtx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  grad.addColorStop(0, 'rgba(147, 197, 253, 0.9)');
  grad.addColorStop(0.3, 'rgba(147, 197, 253, 0.4)');
  grad.addColorStop(0.6, 'rgba(96, 165, 250, 0.1)');
  grad.addColorStop(1, 'rgba(96, 165, 250, 0)');
  ballGlowCtx.fillStyle = grad;
  ballGlowCtx.fillRect(0, 0, size, size);

  // Solid core
  ballGlowCtx.beginPath();
  ballGlowCtx.arc(cx, cy, radius, 0, Math.PI * 2);
  ballGlowCtx.fillStyle = 'rgba(191, 219, 254, 0.95)';
  ballGlowCtx.fill();
}

export function addCollisionFlashes(events: CollisionEvent[]) {
  for (const e of events) {
    flashes.push({
      x: e.contactX,
      y: e.contactY,
      color: e.string.color,
      life: FLASH_DURATION,
    });
    e.string.vibration = 1;
  }
}

export function render(ctx: CanvasRenderingContext2D, state: GameState) {
  const { canvasWidth: w, canvasHeight: h } = state;

  // --- Background with trail effect ---
  // Semi-transparent clear for motion trails
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, 'rgba(6, 13, 24, ' + (1 - TRAIL_ALPHA) + ')');
  gradient.addColorStop(1, 'rgba(12, 25, 41, ' + (1 - TRAIL_ALPHA) + ')');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // --- Draw strings ---
  for (const s of state.strings) {
    ctx.save();

    if (s.vibration > 0.01) {
      // Vibrating string: draw with perpendicular oscillation
      const segments = 12;
      const amp = s.vibration * 6;
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const baseX = s.x1 + (s.x2 - s.x1) * t;
        const baseY = s.y1 + (s.y2 - s.y1) * t;
        // Sine wave along the string, perpendicular to it
        const wave = Math.sin(t * Math.PI * 3 + Date.now() * 0.02) * amp * Math.sin(t * Math.PI);
        const px = baseX + s.nx * wave;
        const py = baseY + s.ny * wave;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.6 + s.vibration * 0.4;
      ctx.stroke();

      // Glow effect via double-stroke
      ctx.globalAlpha = s.vibration * 0.3;
      ctx.lineWidth = 6;
      ctx.stroke();

      s.vibration *= VIBRATION_DECAY;
    } else {
      // Static string
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.strokeStyle = 'rgba(191, 219, 254, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();

    // --- Endpoint handles ---
    ctx.save();
    ctx.globalAlpha = 0.7;
    for (const [ex, ey] of [[s.x1, s.y1], [s.x2, s.y2]]) {
      ctx.beginPath();
      ctx.arc(ex, ey, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(191, 219, 254, 0.5)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Draw preview line ---
  if (state.isDrawing && state.drawStart && state.drawCurrent) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(state.drawStart.x, state.drawStart.y);
    ctx.lineTo(state.drawCurrent.x, state.drawCurrent.y);
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // --- Draw balls ---
  const ballRadius = 6;
  ensureBallGlow(ballRadius);
  if (ballGlowCanvas) {
    const glowSize = ballRadius * 8;
    for (const ball of state.balls) {
      ctx.save();
      ctx.globalAlpha = ball.opacity;
      ctx.drawImage(
        ballGlowCanvas,
        ball.x - glowSize / 2,
        ball.y - glowSize / 2,
        glowSize,
        glowSize
      );
      ctx.restore();
    }
  }

  // --- Draw collision flashes ---
  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i];
    const alpha = f.life / FLASH_DURATION;
    const radius = 12 + (1 - alpha) * 20;
    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    ctx.beginPath();
    ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = f.color;
    ctx.fill();
    ctx.restore();

    f.life--;
    if (f.life <= 0) {
      flashes.splice(i, 1);
    }
  }
}

export function clearTrails(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#060d18');
  gradient.addColorStop(1, '#0c1929');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}
