import React, { useRef, useEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);
const DRAW_SPEED = 2;
const HOLD_FRAMES = 45;
const FADE_FRAMES = 30;

type DrawFn = (ctx: CanvasRenderingContext2D, radius: number, sides?: number) => void;

const figureFns: Record<string, DrawFn> = {
  polygon(ctx, radius, sides = 4) {
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
      if (i === 0) ctx.moveTo(radius * Math.cos(a), radius * Math.sin(a));
      else ctx.lineTo(radius * Math.cos(a), radius * Math.sin(a));
    }
    ctx.closePath();
  },
  circle(ctx, radius) {
    ctx.beginPath();
    ctx.arc(radius * 0.5, 0, radius * 0.5, 0, Math.PI * 2);
    ctx.closePath();
  },
  ellipse(ctx, radius) {
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.closePath();
  },
  star(ctx, radius) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      const r = i % 2 === 0 ? radius : radius * 0.4;
      if (i === 0) ctx.moveTo(r * Math.cos(a), r * Math.sin(a));
      else ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
    }
    ctx.closePath();
  },
  cross(ctx, radius) {
    const w = radius * 0.2;
    ctx.beginPath();
    ctx.moveTo(-w, -radius); ctx.lineTo(w, -radius);
    ctx.lineTo(w, -w); ctx.lineTo(radius, -w);
    ctx.lineTo(radius, w); ctx.lineTo(w, w);
    ctx.lineTo(w, radius); ctx.lineTo(-w, radius);
    ctx.lineTo(-w, w); ctx.lineTo(-radius, w);
    ctx.lineTo(-radius, -w); ctx.lineTo(-w, -w);
    ctx.closePath();
  },
  arc(ctx, radius) {
    ctx.beginPath();
    ctx.arc(radius * 0.4, 0, radius * 0.6, -Math.PI * 0.5, Math.PI * 0.5);
  },
  crescent(ctx, radius) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.arc(radius * 0.3, 0, radius * 0.75, Math.PI * 0.35, -Math.PI * 0.35, true);
    ctx.closePath();
  },
  line(ctx, radius) {
    ctx.beginPath();
    ctx.moveTo(-radius, 0);
    ctx.lineTo(radius, 0);
  },
  lemniscate(ctx, radius) {
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const t = (Math.PI * 2 * i) / 80;
      const d = 1 + Math.sin(t) * Math.sin(t);
      const x = (radius * Math.cos(t)) / d;
      const y = (radius * Math.sin(t) * Math.cos(t)) / d;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  },
  spiral(ctx, radius) {
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = (2 * Math.PI * 2 * i) / 60;
      const r = (radius * i) / 60;
      if (i === 0) ctx.moveTo(r * Math.cos(t), r * Math.sin(t));
      else ctx.lineTo(r * Math.cos(t), r * Math.sin(t));
    }
  },
};

interface Pattern {
  figure: string;
  sides?: number;
  angle: number;
  label: string;
}

// Curated selection for Reel — best visual variety in 18s
const PATTERNS: Pattern[] = [
  { figure: "circle", angle: 15, label: "Cirkel · 15°" },
  { figure: "star", angle: 9, label: "Ster · 9°" },
  { figure: "ellipse", angle: 12, label: "Ellips · 12°" },
  { figure: "crescent", angle: 18, label: "Halve maan · 18°" },
  { figure: "lemniscate", angle: 15, label: "Lemniscaat · 15°" },
  { figure: "polygon", sides: 4, angle: 10, label: "Vierkant · 10°" },
  { figure: "spiral", angle: 24, label: "Spiraal · 24°" },
  { figure: "cross", angle: 15, label: "Kruis · 15°" },
];

function getPatternFrames(p: Pattern): number {
  const totalSteps = 360 / p.angle;
  return totalSteps * DRAW_SPEED + HOLD_FRAMES + FADE_FRAMES;
}

const GeometricSpirographCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2 + 60;
    const radius = Math.min(CANVAS_W, CANVAS_H) * 0.28;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Find current pattern from frame
    let remaining = frame;
    let patternIdx = 0;
    for (let i = 0; i < PATTERNS.length; i++) {
      const pf = getPatternFrames(PATTERNS[i]);
      if (remaining < pf) {
        patternIdx = i;
        break;
      }
      remaining -= pf;
      patternIdx = i + 1;
    }
    if (patternIdx >= PATTERNS.length) {
      patternIdx = PATTERNS.length - 1;
      remaining = getPatternFrames(PATTERNS[patternIdx]);
    }

    const p = PATTERNS[patternIdx];
    const totalSteps = 360 / p.angle;
    const drawFrames = totalSteps * DRAW_SPEED;

    let fadeAlpha = 1;
    let stepsToShow = totalSteps;

    if (remaining < drawFrames) {
      stepsToShow = Math.min(Math.floor(remaining / DRAW_SPEED) + 1, totalSteps);
    } else if (remaining < drawFrames + HOLD_FRAMES) {
      stepsToShow = totalSteps;
    } else {
      stepsToShow = totalSteps;
      fadeAlpha = Math.max(0, 1 - (remaining - drawFrames - HOLD_FRAMES) / FADE_FRAMES);
    }

    // Draw visible steps
    for (let i = 0; i < stepsToShow; i++) {
      const rotation = (i * p.angle * Math.PI) / 180;
      const hue = (i / totalSteps) * 360;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.globalAlpha = 0.7 * fadeAlpha;
      ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
      ctx.lineWidth = 2;

      const fn = figureFns[p.figure];
      if (fn) fn(ctx, radius, p.sides);
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Label
    ctx.globalAlpha = fadeAlpha * 0.8;
    ctx.font = "bold 32px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#fbbf24";
    ctx.textAlign = "center";
    ctx.fillText(p.label, cx, CANVAS_H - 60);
    if (remaining < drawFrames) {
      ctx.font = "24px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`${stepsToShow} / ${totalSteps}`, cx, CANVAS_H - 28);
    }
    ctx.globalAlpha = 1;
  }, [frame]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

const CODE_SNIPPET = `function rotateAndDraw(figure, angle) {
  const steps = 360 / angle;
  for (let i = 0; i < steps; i++) {
    ctx.rotate(angle * Math.PI / 180);
    draw(figure);
  }
}

// Works with any figure:
// circle, star, ellipse, crescent,
// lemniscate, spiral, cross...`;

export const GeometricSpirographReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Geometrische Spirograaf"
      subtitle="Teken, draai, herhaal"
      codeString={CODE_SNIPPET}
    >
      <GeometricSpirographCanvas />
    </ReelTemplate>
  );
};
