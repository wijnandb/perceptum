import React, { useRef, useEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

const patterns = [
  { R: 200, r: 80, d: 60 },
  { R: 200, r: 130, d: 75 },
  { R: 200, r: 55, d: 50 },
];

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

function getMaxT(R: number, r: number): number {
  const g = gcd(R, r);
  return (r / g) * 2 * Math.PI;
}

// Frames allocated per pattern: drawing + fade + wait
const FRAMES_PER_PATTERN = 160;
const FADE_FRAMES = 20;
const WAIT_FRAMES = 10;
const DRAW_FRAMES = FRAMES_PER_PATTERN - FADE_FRAMES - WAIT_FRAMES;

const SpirographCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    const scale = Math.min(CANVAS_W, CANVAS_H) / 600;

    const patternIndex = Math.floor(frame / FRAMES_PER_PATTERN) % patterns.length;
    const localFrame = frame % FRAMES_PER_PATTERN;
    const p = patterns[patternIndex];
    const R = p.R * scale;
    const r = p.r * scale;
    const d = p.d * scale;
    const maxT = getMaxT(p.R, p.r);

    let phase: "drawing" | "fading" | "waiting";
    let drawProgress: number;
    let fadeAlpha: number;

    if (localFrame < DRAW_FRAMES) {
      phase = "drawing";
      drawProgress = localFrame / DRAW_FRAMES;
      fadeAlpha = 1;
    } else if (localFrame < DRAW_FRAMES + FADE_FRAMES) {
      phase = "fading";
      drawProgress = 1;
      fadeAlpha = 1 - (localFrame - DRAW_FRAMES) / FADE_FRAMES;
    } else {
      phase = "waiting";
      drawProgress = 0;
      fadeAlpha = 0;
    }

    if (phase === "waiting") return;

    const tMax = maxT * Math.min(1, drawProgress);
    const step = 0.02;
    const points: { x: number; y: number }[] = [];

    for (let t = 0; t <= tMax; t += step) {
      const x = cx + (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
      const y = cy + (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
      points.push({ x, y });
    }

    // Draw guide circles during drawing phase
    if (phase === "drawing") {
      const currentT = tMax;
      const innerCx = cx + (R - r) * Math.cos(currentT);
      const innerCy = cy + (R - r) * Math.sin(currentT);

      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(innerCx, innerCy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw curve
    if (points.length > 1) {
      const alpha = fadeAlpha;
      for (let i = 1; i < points.length; i++) {
        const segAlpha = (i / points.length) * 0.8 * alpha;
        ctx.beginPath();
        ctx.moveTo(points[i - 1].x, points[i - 1].y);
        ctx.lineTo(points[i].x, points[i].y);
        ctx.strokeStyle = `rgba(59, 130, 246, ${segAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Pen point
      if (phase === "drawing" && points.length > 0) {
        const last = points[points.length - 1];
        ctx.beginPath();
        ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
        ctx.fill();
      }
    }
  }, [frame, fps]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

const CODE_SNIPPET = `// Hypotrochoid (spirograph) curve
function spirograph(t, R, r, d) {
  const x = (R-r) * cos(t)
          + d * cos((R-r)/r * t);
  const y = (R-r) * sin(t)
          - d * sin((R-r)/r * t);
  return [x, y];
}
// Complete after t = (r/gcd(R,r)) * 2*PI`;

export const SpirographReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Spirograph"
      subtitle="Roulettecurven van rollende cirkels"
      codeString={CODE_SNIPPET}
    >
      <SpirographCanvas />
    </ReelTemplate>
  );
};
