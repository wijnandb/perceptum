import React, { useRef, useEffect, useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

const fibs = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

interface Square {
  x: number;
  y: number;
  size: number;
  fibNum: number;
  arcCx: number;
  arcCy: number;
  startAngle: number;
  endAngle: number;
}

function computeSquares(w: number, h: number): Square[] {
  const squares: Square[] = [];
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < fibs.length; i++) {
    const s = fibs[i];
    const prev = i > 0 ? fibs[i - 1] : 0;
    const dir = i % 4;
    let sx: number, sy: number;

    if (i === 0) {
      sx = 0;
      sy = 0;
    } else if (dir === 0) {
      sx = cx + prev;
      sy = cy + prev - s;
    } else if (dir === 1) {
      sx = cx;
      sy = cy - s;
    } else if (dir === 2) {
      sx = cx - s;
      sy = cy;
    } else {
      sx = cx + prev - s;
      sy = cy + prev;
    }

    cx = sx;
    cy = sy;

    let arcCx: number, arcCy: number, startAngle: number, endAngle: number;
    if (dir === 0) {
      arcCx = sx;
      arcCy = sy + s;
      startAngle = -Math.PI / 2;
      endAngle = 0;
    } else if (dir === 1) {
      arcCx = sx + s;
      arcCy = sy + s;
      startAngle = Math.PI;
      endAngle = 1.5 * Math.PI;
    } else if (dir === 2) {
      arcCx = sx + s;
      arcCy = sy;
      startAngle = Math.PI / 2;
      endAngle = Math.PI;
    } else {
      arcCx = sx;
      arcCy = sy;
      startAngle = 0;
      endAngle = Math.PI / 2;
    }

    squares.push({
      x: sx,
      y: sy,
      size: s,
      fibNum: fibs[i],
      arcCx,
      arcCy,
      startAngle,
      endAngle,
    });
  }

  // Scale and center
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const sq of squares) {
    minX = Math.min(minX, sq.x);
    minY = Math.min(minY, sq.y);
    maxX = Math.max(maxX, sq.x + sq.size);
    maxY = Math.max(maxY, sq.y + sq.size);
  }

  const totalW = maxX - minX;
  const totalH = maxY - minY;
  const scale = Math.min((w * 0.75) / totalW, (h * 0.75) / totalH);
  const offsetX = (w - totalW * scale) / 2 - minX * scale;
  const offsetY = (h - totalH * scale) / 2 - minY * scale;

  for (const sq of squares) {
    sq.x = sq.x * scale + offsetX;
    sq.y = sq.y * scale + offsetY;
    sq.size *= scale;
    sq.arcCx = sq.arcCx * scale + offsetX;
    sq.arcCy = sq.arcCy * scale + offsetY;
  }

  return squares;
}

function drawSquare(
  ctx: CanvasRenderingContext2D,
  sq: Square,
  alpha: number
) {
  ctx.strokeStyle = `rgba(59, 130, 246, ${0.35 * alpha})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(sq.x, sq.y, sq.size, sq.size);

  ctx.fillStyle = `rgba(59, 130, 246, ${0.03 * alpha})`;
  ctx.fillRect(sq.x, sq.y, sq.size, sq.size);

  ctx.beginPath();
  ctx.arc(sq.arcCx, sq.arcCy, sq.size, sq.startAngle, sq.endAngle);
  ctx.strokeStyle = `rgba(251, 191, 36, ${0.8 * alpha})`;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  if (sq.size > 25) {
    const fontSize = Math.max(11, Math.min(sq.size * 0.25, 40));
    ctx.font = `300 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = `rgba(148, 163, 184, ${0.5 * alpha})`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      String(sq.fibNum),
      sq.x + sq.size / 2,
      sq.y + sq.size / 2
    );
  }
}

const FibonacciCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const squares = useMemo(() => computeSquares(CANVAS_W, CANVAS_H), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = CANVAS_W;
    const h = CANVAS_H;

    // Timing: reveal one square every ~1.2 seconds, then hold, then fade and restart
    const revealFrames = Math.round(fps * 1.2);
    const totalRevealFrames = revealFrames * squares.length;
    const holdFrames = Math.round(fps * 3);
    const fadeFrames = Math.round(fps * 1.5);
    const cycleLength = totalRevealFrames + holdFrames + fadeFrames;

    const cycleFrame = frame % cycleLength;

    let revealedCount: number;
    let globalAlpha = 1;

    if (cycleFrame < totalRevealFrames) {
      revealedCount = Math.floor(cycleFrame / revealFrames) + 1;
    } else if (cycleFrame < totalRevealFrames + holdFrames) {
      revealedCount = squares.length;
    } else {
      revealedCount = squares.length;
      const fadeProgress =
        (cycleFrame - totalRevealFrames - holdFrames) / fadeFrames;
      globalAlpha = Math.max(0, 1 - fadeProgress);
    }

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < revealedCount && i < squares.length; i++) {
      let alpha = globalAlpha;
      // Fade in the newest square
      if (i === revealedCount - 1 && cycleFrame < totalRevealFrames) {
        const localFrame = cycleFrame % revealFrames;
        alpha = Math.min(1, localFrame / (fps * 0.35)) * globalAlpha;
      }
      drawSquare(ctx, squares[i], alpha);
    }
  }, [frame, fps, squares]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

const CODE_SNIPPET = `// Fibonacci spiral
const fibs = [1, 1, 2, 3, 5, 8, 13...];

for (const fib of fibs) {
  drawSquare(x, y, fib * scale);
  drawArc(corner, fib * scale);
  // Rotate placement direction
  direction = (direction + 1) % 4;
}`;

export const FibonacciReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Fibonacci Spiral"
      subtitle="De gulden rechthoek en haar spiraal"
      codeString={CODE_SNIPPET}
    >
      <FibonacciCanvas />
    </ReelTemplate>
  );
};
