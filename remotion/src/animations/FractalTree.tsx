import React, { useRef, useEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

const MAX_DEPTH = 11;
const BRANCH_ANGLE = 27 * (Math.PI / 180);
const LENGTH_RATIO = 0.67;

interface Branch {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  depth: number;
  lineWidth: number;
}

function buildTree(
  W: number,
  H: number,
  windOffset: number
): Branch[][] {
  const result: Branch[][] = [];
  const trunkLen = Math.min(W, H) * 0.22;
  const startX = W / 2;
  const startY = H * 0.88;

  function branch(
    x1: number,
    y1: number,
    length: number,
    angle: number,
    depth: number
  ) {
    if (depth > MAX_DEPTH || length < 2) return;

    const sway = windOffset * (depth / MAX_DEPTH) * 0.06;
    const swayedAngle = angle + sway;

    const x2 = x1 + Math.cos(swayedAngle) * length;
    const y2 = y1 + Math.sin(swayedAngle) * length;
    const lw = Math.max(1, (MAX_DEPTH - depth) * 1.2);

    if (!result[depth]) result[depth] = [];
    result[depth].push({ x1, y1, x2, y2, depth, lineWidth: lw });

    branch(x2, y2, length * LENGTH_RATIO, swayedAngle - BRANCH_ANGLE, depth + 1);
    branch(x2, y2, length * LENGTH_RATIO, swayedAngle + BRANCH_ANGLE, depth + 1);
  }

  branch(startX, startY, trunkLen, -Math.PI / 2, 0);
  return result;
}

function drawBranches(
  ctx: CanvasRenderingContext2D,
  branches: Branch[][],
  maxDepth: number,
  alpha: number
) {
  for (let d = 0; d <= Math.min(maxDepth, branches.length - 1); d++) {
    if (!branches[d]) continue;
    for (const b of branches[d]) {
      const isLeaf = d >= MAX_DEPTH - 2;
      if (isLeaf) {
        ctx.strokeStyle = `rgba(251, 191, 36, ${0.8 * alpha})`;
      } else {
        const brightness = 0.5 + (d / MAX_DEPTH) * 0.4;
        ctx.strokeStyle = `rgba(59, 130, 246, ${brightness * alpha})`;
      }
      ctx.lineWidth = b.lineWidth;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
    }
  }
}

const FractalTreeCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = CANVAS_W;
    const H = CANVAS_H;

    // Phase timing (in frames)
    const growFramesPerLevel = Math.round(fps * 0.7); // ~0.7s per depth level
    const totalGrowFrames = growFramesPerLevel * (MAX_DEPTH + 1);
    const swayFrames = Math.round(fps * 5); // 5s of swaying
    const fadeFrames = Math.round(fps * 1.5);

    ctx.clearRect(0, 0, W, H);

    if (frame < totalGrowFrames) {
      // Growing phase
      const currentDepth = Math.min(
        Math.floor(frame / growFramesPerLevel),
        MAX_DEPTH
      );
      const branches = buildTree(W, H, 0);
      drawBranches(ctx, branches, currentDepth, 1);
    } else if (frame < totalGrowFrames + swayFrames) {
      // Swaying phase
      const elapsed = frame - totalGrowFrames;
      const t = elapsed / fps; // time in seconds
      const windOffset =
        Math.sin(t * 2 * Math.PI * 0.5) * 2 +
        Math.sin(t * 2 * Math.PI * 0.325) * 1.5;
      const branches = buildTree(W, H, windOffset);
      drawBranches(ctx, branches, MAX_DEPTH, 1);
    } else if (frame < totalGrowFrames + swayFrames + fadeFrames) {
      // Fading phase
      const elapsed = frame - totalGrowFrames - swayFrames;
      const alpha = Math.max(0, 1 - elapsed / fadeFrames);
      const t = (frame - totalGrowFrames) / fps;
      const windOffset = Math.sin(t * 2 * Math.PI * 0.5) * 2;
      const branches = buildTree(W, H, windOffset);
      drawBranches(ctx, branches, MAX_DEPTH, alpha);
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

const CODE_SNIPPET = `function branch(x, y, len, angle, depth) {
  if (depth > MAX_DEPTH) return;
  const x2 = x + cos(angle) * len;
  const y2 = y + sin(angle) * len;
  draw(x, y, x2, y2);

  branch(x2, y2, len * 0.67, angle - 27°, depth + 1);
  branch(x2, y2, len * 0.67, angle + 27°, depth + 1);
}`;

export const FractalTreeReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Fractal Tree"
      subtitle="Recursieve vertakkingen"
      codeString={CODE_SNIPPET}
    >
      <FractalTreeCanvas />
    </ReelTemplate>
  );
};
