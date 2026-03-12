import React, { useRef, useEffect, useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);
const SCALE = 4;
const SEED_COUNT = 20;

const palette = [
  [59, 130, 246, 0.30],
  [99, 102, 241, 0.25],
  [67, 56, 202, 0.28],
  [79, 70, 229, 0.22],
  [55, 48, 163, 0.26],
  [30, 64, 175, 0.30],
  [37, 99, 235, 0.24],
  [96, 165, 250, 0.20],
  [129, 140, 248, 0.22],
  [49, 46, 129, 0.28],
  [30, 58, 138, 0.32],
  [56, 89, 182, 0.25],
  [63, 63, 201, 0.27],
  [45, 85, 200, 0.23],
  [72, 118, 230, 0.26],
  [88, 80, 216, 0.24],
  [41, 72, 188, 0.29],
  [52, 110, 235, 0.21],
  [75, 60, 195, 0.27],
  [34, 80, 220, 0.25],
];

// Deterministic seed generation using a simple PRNG
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Seed {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number[];
}

function initSeeds(w: number, h: number): Seed[] {
  const rng = mulberry32(42);
  const seeds: Seed[] = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    seeds.push({
      x: rng() * w,
      y: rng() * h,
      vx: (rng() - 0.5) * 0.6,
      vy: (rng() - 0.5) * 0.6,
      color: palette[i % palette.length],
    });
  }
  return seeds;
}

const VoronoiCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();

  // Precompute initial seeds once
  const initialSeeds = useMemo(() => initSeeds(CANVAS_W, CANVAS_H), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = CANVAS_W;
    const h = CANVAS_H;
    const sw = Math.ceil(w / SCALE);
    const sh = Math.ceil(h / SCALE);

    // Simulate seeds forward to current frame
    const seeds = initialSeeds.map((s) => ({ ...s }));
    for (let f = 0; f < frame; f++) {
      for (const s of seeds) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x += w;
        if (s.x >= w) s.x -= w;
        if (s.y < 0) s.y += h;
        if (s.y >= h) s.y -= h;
      }
    }

    // Render Voronoi
    const imgData = ctx.createImageData(sw, sh);
    const data = imgData.data;
    const ownerGrid = new Uint8Array(sw * sh);

    const scaledSeeds = seeds.map((s) => ({
      sx: s.x / SCALE,
      sy: s.y / SCALE,
    }));

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        let minDist = Infinity;
        let nearest = 0;
        for (let i = 0; i < SEED_COUNT; i++) {
          const dx = x - scaledSeeds[i].sx;
          const dy = y - scaledSeeds[i].sy;
          const d = dx * dx + dy * dy;
          if (d < minDist) {
            minDist = d;
            nearest = i;
          }
        }
        ownerGrid[y * sw + x] = nearest;
        const c = seeds[nearest].color;
        const idx = (y * sw + x) * 4;
        data[idx] = c[0];
        data[idx + 1] = c[1];
        data[idx + 2] = c[2];
        data[idx + 3] = Math.round(c[3] * 255);
      }
    }

    // Boundary edges
    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        const owner = ownerGrid[y * sw + x];
        const right = ownerGrid[y * sw + x + 1];
        const below = ownerGrid[(y + 1) * sw + x];
        if (owner !== right || owner !== below) {
          const idx = (y * sw + x) * 4;
          data[idx] = 148;
          data[idx + 1] = 163;
          data[idx + 2] = 184;
          data[idx + 3] = 100;
        }
      }
    }

    // Draw scaled up
    const offscreen = new OffscreenCanvas(sw, sh);
    const offCtx = offscreen.getContext("2d")!;
    offCtx.putImageData(imgData, 0, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, 0, 0, w, h);
  }, [frame, initialSeeds]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

const CODE_SNIPPET = `// Voronoi: nearest seed wins
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    let minDist = Infinity;
    let nearest = 0;
    for (const seed of seeds) {
      const d = dist(x, y, seed);
      if (d < minDist) {
        minDist = d;
        nearest = seed.id;
      }
    }
    pixel[x][y] = nearest;
  }
}`;

export const VoronoiReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Voronoi Diagram"
      subtitle="Elke pixel zoekt de dichtstbijzijnde zaadpunt"
      codeString={CODE_SNIPPET}
    >
      <VoronoiCanvas />
    </ReelTemplate>
  );
};
