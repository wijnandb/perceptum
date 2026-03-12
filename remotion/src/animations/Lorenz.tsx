import React, { useRef, useEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

// Lorenz parameters
const sigma = 10;
const rho = 28;
const beta = 8 / 3;
const dt = 0.005;
const stepsPerFrame = 6;
const maxTrail = 2000;

function project(p: { x: number; y: number; z: number }): [number, number] {
  const angle = 0.3;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const px = p.x * cosA + p.z * sinA;
  const py = p.y;
  return [px, py];
}

const LorenzCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = CANVAS_W;
    const h = CANVAS_H;
    const centerX = w / 2;
    const centerY = h * 0.5;
    const scale = Math.min(w, h) / 55;

    // Simulate Lorenz system from initial conditions up to current frame
    let x = 0.1;
    let y = 0;
    let z = 0;

    const totalSteps = frame * stepsPerFrame;
    const trail: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < totalSteps; i++) {
      const dx = sigma * (y - x);
      const dy = x * (rho - z) - y;
      const dz = x * y - beta * z;
      x += dx * dt;
      y += dy * dt;
      z += dz * dt;
      trail.push({ x, y, z });
    }

    // Only keep the last maxTrail points
    const visibleTrail =
      trail.length > maxTrail ? trail.slice(trail.length - maxTrail) : trail;

    ctx.clearRect(0, 0, w, h);

    if (visibleTrail.length < 2) return;

    for (let i = 1; i < visibleTrail.length; i++) {
      const alpha = (i / visibleTrail.length) * 0.9 + 0.1;
      const [x0, y0] = project(visibleTrail[i - 1]);
      const [x1, y1] = project(visibleTrail[i]);

      ctx.beginPath();
      ctx.moveTo(centerX + x0 * scale, centerY - y0 * scale);
      ctx.lineTo(centerX + x1 * scale, centerY - y1 * scale);
      ctx.strokeStyle = `rgba(59,130,246,${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
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

const CODE_SNIPPET = `// Lorenz attractor
const sigma = 10, rho = 28;
const beta = 8 / 3;

dx = sigma * (y - x);
dy = x * (rho - z) - y;
dz = x * y - beta * z;

x += dx * dt;
y += dy * dt;
z += dz * dt;`;

export const LorenzReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Lorenz Attractor"
      subtitle="Chaotische baan die nooit herhaalt"
      codeString={CODE_SNIPPET}
    >
      <LorenzCanvas />
    </ReelTemplate>
  );
};
