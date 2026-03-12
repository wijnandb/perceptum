import React, { useRef, useEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

type Tri = [[number, number], [number, number], [number, number]];

const FILL_COLOR = "rgba(59, 130, 246, 0.7)";
const CUTOUT_COLOR = "#0f172a";
const EDGE_COLOR = "rgba(251, 191, 36, 0.5)";
const MAX_DEPTH = 7;

function midpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function computeCutouts(
  tri: Tri,
  depth: number,
  maxDepth: number,
  levels: Tri[][]
) {
  if (depth >= maxDepth) return;
  const [a, b, c] = tri;
  const ab = midpoint(a, b);
  const bc = midpoint(b, c);
  const ac = midpoint(a, c);

  if (!levels[depth]) levels[depth] = [];
  levels[depth].push([ab, bc, ac]);

  computeCutouts([a, ab, ac], depth + 1, maxDepth, levels);
  computeCutouts([ab, b, bc], depth + 1, maxDepth, levels);
  computeCutouts([ac, bc, c], depth + 1, maxDepth, levels);
}

function drawTri(
  ctx: CanvasRenderingContext2D,
  tri: Tri,
  color: string,
  alpha = 1
) {
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(tri[0][0], tri[0][1]);
  ctx.lineTo(tri[1][0], tri[1][1]);
  ctx.lineTo(tri[2][0], tri[2][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawEdges(
  ctx: CanvasRenderingContext2D,
  tri: Tri,
  alpha = 1
) {
  ctx.globalAlpha = alpha * 0.4;
  ctx.beginPath();
  ctx.moveTo(tri[0][0], tri[0][1]);
  ctx.lineTo(tri[1][0], tri[1][1]);
  ctx.lineTo(tri[2][0], tri[2][1]);
  ctx.closePath();
  ctx.strokeStyle = EDGE_COLOR;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Canvas width/height for the animation area (top 60% of 1080x1920)
const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

const SierpinskiCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = CANVAS_W;
    const h = CANVAS_H;
    const padding = 80;
    const triW = Math.min(w - padding * 2, (h - padding * 2) * 1.15);
    const cx = w / 2;
    const bottom = h - padding;
    const top = bottom - (triW * Math.sqrt(3)) / 2;

    const vertices: Tri = [
      [cx, Math.max(padding + 120, top)], // offset down for title area
      [cx - triW / 2, bottom],
      [cx + triW / 2, bottom],
    ];

    const cutoutsByLevel: Tri[][] = [];
    computeCutouts(vertices, 0, MAX_DEPTH, cutoutsByLevel);

    // Timing: each level takes ~27 frames (0.9s at 30fps)
    const framesPerLevel = Math.round(fps * 0.9);
    const fadeInFrames = Math.round(fps * 0.3);

    // Calculate current depth and fade progress from frame
    const buildFrame = frame; // animation starts immediately
    const currentLevel = Math.floor(buildFrame / framesPerLevel);
    const levelProgress = (buildFrame % framesPerLevel) / fadeInFrames;
    const levelAlpha = Math.min(1, Math.max(0, levelProgress));

    ctx.clearRect(0, 0, w, h);

    // Draw the big filled triangle
    drawTri(ctx, vertices, FILL_COLOR);
    drawEdges(ctx, vertices);

    // Draw completed levels
    const completedLevels = Math.min(currentLevel, MAX_DEPTH);
    for (let d = 0; d < completedLevels; d++) {
      if (cutoutsByLevel[d]) {
        for (const tri of cutoutsByLevel[d]) {
          drawTri(ctx, tri, CUTOUT_COLOR);
          drawEdges(ctx, tri, 0.6);
        }
      }
    }

    // Animate current level fading in
    if (currentLevel < MAX_DEPTH && cutoutsByLevel[currentLevel]) {
      for (const tri of cutoutsByLevel[currentLevel]) {
        drawTri(ctx, tri, CUTOUT_COLOR, levelAlpha);
        drawEdges(ctx, tri, levelAlpha * 0.6);
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

const CODE_SNIPPET = `function sierpinski(tri, depth) {
  if (depth === 0) return;
  const [a, b, c] = tri;
  const ab = midpoint(a, b);
  const bc = midpoint(b, c);
  const ac = midpoint(a, c);

  cutout(ab, bc, ac);

  sierpinski([a, ab, ac], depth - 1);
  sierpinski([ab, b, bc], depth - 1);
  sierpinski([ac, bc, c], depth - 1);
}`;

export const SierpinskiReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Sierpinski Driehoek"
      subtitle="Verdeel, verwijder, herhaal"
      codeString={CODE_SNIPPET}
    >
      <SierpinskiCanvas />
    </ReelTemplate>
  );
};
