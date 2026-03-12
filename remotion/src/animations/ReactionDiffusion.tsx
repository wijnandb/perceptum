import React, { useRef, useEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

// Grid dimensions (downscaled for performance)
const COLS = 120;
const ROWS = Math.round(COLS * (CANVAS_H / CANVAS_W));

// Gray-Scott parameters
const F = 0.055;
const k = 0.062;
const Du = 1.0;
const Dv = 0.5;
const STEPS_PER_FRAME = 8;

function idx(x: number, y: number): number {
  return y * COLS + x;
}

function createInitialState(seed: number) {
  const size = COLS * ROWS;
  const u = new Float32Array(size).fill(1);
  const v = new Float32Array(size).fill(0);

  // Deterministic seeding using simple hash
  function pseudoRandom(i: number): number {
    let x = Math.sin(seed * 9301 + i * 49297 + 233280) * 49297;
    return x - Math.floor(x);
  }

  // Scatter tiny perturbations
  for (let i = 0; i < size; i++) {
    if (pseudoRandom(i) < 0.01) {
      const val = 0.05 + pseudoRandom(i + size) * 0.1;
      v[i] = val;
      u[i] = 1 - val;
    }
  }

  // Add nucleation clusters
  for (let p = 0; p < 5; p++) {
    const cx = Math.floor(pseudoRandom(p * 1000 + 1) * (COLS - 10)) + 5;
    const cy = Math.floor(pseudoRandom(p * 1000 + 2) * (ROWS - 10)) + 5;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const i = idx(cx + dx, cy + dy);
        v[i] = 0.15;
        u[i] = 0.85;
      }
    }
  }

  return { u, v };
}

function step(
  u: Float32Array,
  v: Float32Array,
  uNext: Float32Array,
  vNext: Float32Array
) {
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      const i = idx(x, y);
      const uVal = u[i];
      const vVal = v[i];

      const lapU =
        u[idx(x - 1, y)] +
        u[idx(x + 1, y)] +
        u[idx(x, y - 1)] +
        u[idx(x, y + 1)] -
        4 * uVal;
      const lapV =
        v[idx(x - 1, y)] +
        v[idx(x + 1, y)] +
        v[idx(x, y - 1)] +
        v[idx(x, y + 1)] -
        4 * vVal;

      const uvv = uVal * vVal * vVal;
      uNext[i] = uVal + Du * lapU - uvv + F * (1 - uVal);
      vNext[i] = vVal + Dv * lapV + uvv - (F + k) * vVal;
    }
  }
}

const ReactionDiffusionCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Recompute state from scratch up to current frame
    const { u: uInit, v: vInit } = createInitialState(42);
    const size = COLS * ROWS;
    let u = new Float32Array(uInit);
    let v = new Float32Array(vInit);
    let uNext = new Float32Array(size);
    let vNext = new Float32Array(size);

    const totalSteps = frame * STEPS_PER_FRAME;
    for (let s = 0; s < totalSteps; s++) {
      step(u, v, uNext, vNext);
      // Swap
      const tmpU = u;
      u = uNext;
      uNext = tmpU;
      const tmpV = v;
      v = vNext;
      vNext = tmpV;
    }

    // Render
    const imgData = ctx.createImageData(CANVAS_W, CANVAS_H);
    const data = imgData.data;
    const scaleX = COLS / CANVAS_W;
    const scaleY = ROWS / CANVAS_H;

    for (let py = 0; py < CANVAS_H; py++) {
      const gy = Math.min(Math.floor(py * scaleY), ROWS - 1);
      for (let px = 0; px < CANVAS_W; px++) {
        const gx = Math.min(Math.floor(px * scaleX), COLS - 1);
        const vVal = v[idx(gx, gy)];
        const offset = (py * CANVAS_W + px) * 4;
        const intensity = Math.min(1, vVal * 3);
        data[offset] = Math.floor(59 * intensity);
        data[offset + 1] = Math.floor(130 * intensity);
        data[offset + 2] = Math.floor(246 * intensity);
        data[offset + 3] = Math.floor(255 * intensity);
      }
    }

    ctx.putImageData(imgData, 0, 0);
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

const CODE_SNIPPET = `// Gray-Scott reaction-diffusion
const uvv = u * v * v;
u += Du * laplacian(u) - uvv + F*(1-u);
v += Dv * laplacian(v) + uvv - (F+k)*v;

// 5-point Laplacian stencil
lap = grid[x-1][y] + grid[x+1][y]
    + grid[x][y-1] + grid[x][y+1]
    - 4 * grid[x][y];`;

export const ReactionDiffusionReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Reaction-Diffusion"
      subtitle="Turing-patronen uit chemische reacties"
      codeString={CODE_SNIPPET}
    >
      <ReactionDiffusionCanvas />
    </ReelTemplate>
  );
};
