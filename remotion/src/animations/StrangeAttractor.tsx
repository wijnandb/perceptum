import React, { useRef, useEffect } from "react";
import { useCurrentFrame } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

const DOTS_PER_FRAME = 3000;

function mapX(v: number): number {
  return ((v + 3) / 6) * CANVAS_W;
}

function mapY(v: number): number {
  return ((v + 3) / 6) * CANVAS_H;
}

const StrangeAttractorCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Clifford attractor parameters
    let a = -1.4;
    let b = 1.6;
    const c = 1.0;
    const d = 0.7;

    // Use a density map for accumulation
    const densityW = Math.floor(CANVAS_W / 2);
    const densityH = Math.floor(CANVAS_H / 2);
    const density = new Float32Array(densityW * densityH);

    let x = 0;
    let y = 0;

    // Iterate from 0 to current frame's total points
    const totalPoints = frame * DOTS_PER_FRAME;
    for (let i = 0; i < totalPoints; i++) {
      const nx = Math.sin(a * y) + c * Math.cos(a * x);
      const ny = Math.sin(b * x) + d * Math.cos(b * y);
      x = nx;
      y = ny;

      const px = Math.floor(((x + 3) / 6) * densityW);
      const py = Math.floor(((y + 3) / 6) * densityH);
      if (px >= 0 && px < densityW && py >= 0 && py < densityH) {
        density[py * densityW + px] += 1;
      }

      // Very slowly drift parameters (deterministic based on iteration)
      if (i % DOTS_PER_FRAME === 0) {
        // Small deterministic drift per "frame"
        const frameIdx = Math.floor(i / DOTS_PER_FRAME);
        a = -1.4 + Math.sin(frameIdx * 0.005) * 0.03;
        b = 1.6 + Math.cos(frameIdx * 0.007) * 0.03;
      }
    }

    // Render density to canvas
    const imgData = ctx.createImageData(CANVAS_W, CANVAS_H);
    const data = imgData.data;
    const scaleX = densityW / CANVAS_W;
    const scaleY = densityH / CANVAS_H;

    // Find max density for normalization
    let maxDensity = 1;
    for (let i = 0; i < density.length; i++) {
      if (density[i] > maxDensity) maxDensity = density[i];
    }

    for (let py = 0; py < CANVAS_H; py++) {
      const dy = Math.min(Math.floor(py * scaleY), densityH - 1);
      for (let px = 0; px < CANVAS_W; px++) {
        const dx = Math.min(Math.floor(px * scaleX), densityW - 1);
        const val = density[dy * densityW + dx];
        const offset = (py * CANVAS_W + px) * 4;

        // Log scale for better visibility
        const intensity = Math.min(1, Math.log(1 + val) / Math.log(1 + maxDensity * 0.3));
        data[offset] = Math.floor(59 * intensity);
        data[offset + 1] = Math.floor(130 * intensity);
        data[offset + 2] = Math.floor(246 * intensity);
        data[offset + 3] = Math.floor(255 * Math.min(1, intensity * 1.5));
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

const CODE_SNIPPET = `// Clifford strange attractor
function iterate(x, y, a, b, c, d) {
  const nx = sin(a * y) + c * cos(a * x);
  const ny = sin(b * x) + d * cos(b * y);
  return [nx, ny];
}

// Plot thousands of points per frame
for (let i = 0; i < dotsPerFrame; i++) {
  [x, y] = iterate(x, y, a, b, c, d);
  plot(x, y);
}`;

export const StrangeAttractorReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Strange Attractor"
      subtitle="Orde verborgen in chaos"
      codeString={CODE_SNIPPET}
    >
      <StrangeAttractorCanvas />
    </ReelTemplate>
  );
};
