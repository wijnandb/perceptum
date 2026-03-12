import React, { useRef, useEffect, useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

// Generate infinity symbol (lemniscate) sample points
const N = 128;
const SHAPE_SCALE = 150;

interface FourierTerm {
  freq: number;
  amp: number;
  phase: number;
}

function generateShapePoints(): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < N; i++) {
    const t = (2 * Math.PI * i) / N;
    const s = Math.sin(t);
    const c = Math.cos(t);
    const denom = 1 + s * s;
    points.push({
      x: (c / denom) * SHAPE_SCALE,
      y: ((s * c) / denom) * SHAPE_SCALE,
    });
  }
  return points;
}

function dft(points: { x: number; y: number }[]): FourierTerm[] {
  const n = points.length;
  const result: FourierTerm[] = [];
  for (let k = 0; k < n; k++) {
    let re = 0;
    let im = 0;
    for (let j = 0; j < n; j++) {
      const angle = (2 * Math.PI * k * j) / n;
      re += points[j].x * Math.cos(angle) + points[j].y * Math.sin(angle);
      im += points[j].y * Math.cos(angle) - points[j].x * Math.sin(angle);
    }
    re /= n;
    im /= n;
    result.push({
      freq: k,
      amp: Math.sqrt(re * re + im * im),
      phase: Math.atan2(im, re),
    });
  }
  return result;
}

const NUM_EPICYCLES = 50;

function computeTerms(): FourierTerm[] {
  const points = generateShapePoints();
  const allTerms = dft(points);
  allTerms.sort((a, b) => b.amp - a.amp);
  return allTerms.slice(0, NUM_EPICYCLES);
}

const FourierCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const terms = useMemo(() => computeTerms(), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = CANVAS_W;
    const h = CANVAS_H;
    const centerX = w / 2;
    const centerY = h / 2;

    const speed = (2 * Math.PI) / N;

    // One full cycle takes N frames; allow multiple cycles over the duration
    // Map frame to time, cycling through 2*PI
    const totalCycleFrames = N; // one full revolution
    const cycleFrame = frame % totalCycleFrames;
    const time = cycleFrame * speed;

    ctx.clearRect(0, 0, w, h);

    // Compute the traced path up to current point in this cycle
    const path: { x: number; y: number }[] = [];
    for (let f = 0; f <= cycleFrame; f++) {
      const t = f * speed;
      let px = 0;
      let py = 0;
      for (const term of terms) {
        const angle = term.freq * t + term.phase;
        px += term.amp * Math.cos(angle);
        py += term.amp * Math.sin(angle);
      }
      path.push({ x: px, y: py });
    }

    // Draw epicycle circles and radius lines for current frame
    let x = 0;
    let y = 0;

    for (let i = 0; i < terms.length; i++) {
      const prevX = x;
      const prevY = y;
      const { freq, amp, phase } = terms[i];
      const angle = freq * time + phase;
      x += amp * Math.cos(angle);
      y += amp * Math.sin(angle);

      // Draw circle
      ctx.beginPath();
      ctx.arc(centerX + prevX, centerY + prevY, amp, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(59,130,246,0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw radius line
      ctx.beginPath();
      ctx.moveTo(centerX + prevX, centerY + prevY);
      ctx.lineTo(centerX + x, centerY + y);
      ctx.strokeStyle = "rgba(59,130,246,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw dot at tip
    ctx.beginPath();
    ctx.arc(centerX + x, centerY + y, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(59,130,246,0.9)";
    ctx.fill();

    // Draw traced path
    if (path.length > 1) {
      ctx.beginPath();
      ctx.moveTo(centerX + path[0].x, centerY + path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(centerX + path[i].x, centerY + path[i].y);
      }
      ctx.strokeStyle = "rgba(59,130,246,0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [frame, fps, terms]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

const CODE_SNIPPET = `// Discrete Fourier Transform
for (let k = 0; k < N; k++) {
  let re = 0, im = 0;
  for (let j = 0; j < N; j++) {
    const angle = 2*PI * k * j / N;
    re += x[j]*cos(angle);
    im -= x[j]*sin(angle);
  }
  terms[k] = { freq: k, amp, phase };
}`;

export const FourierReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Fourier Epicycles"
      subtitle="Elke vorm als som van roterende cirkels"
      codeString={CODE_SNIPPET}
    >
      <FourierCanvas />
    </ReelTemplate>
  );
};
