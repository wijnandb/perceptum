import React, { useRef, useEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

const NUM_PENDULUMS = 15;
const CYCLE_PERIOD = 60;
const BASE_FREQ = 24;
const MAX_ANGLE = Math.PI / 4;

const PendulumWaveCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const t = frame / fps;

    const marginX = CANVAS_W * 0.1;
    const spacing = (CANVAS_W - 2 * marginX) / (NUM_PENDULUMS - 1);
    const pivotY = CANVAS_H * 0.08;
    const maxLength = CANVAS_H * 0.65;
    const minLength = CANVAS_H * 0.35;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw pivot bar
    ctx.beginPath();
    ctx.moveTo(marginX - 20, pivotY);
    ctx.lineTo(CANVAS_W - marginX + 20, pivotY);
    ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // For trails, compute a few past positions
    const TRAIL_LENGTH = 8;

    for (let i = 0; i < NUM_PENDULUMS; i++) {
      const freq = BASE_FREQ + i;
      const omega = (2 * Math.PI * freq) / CYCLE_PERIOD;
      const length =
        minLength +
        ((maxLength - minLength) * (NUM_PENDULUMS - 1 - i)) /
          (NUM_PENDULUMS - 1);

      const pivotX = marginX + i * spacing;
      const bobR = 8 + (i / NUM_PENDULUMS) * 6;
      const isAmber = i % 4 === 0;

      // Draw trail
      for (let tr = TRAIL_LENGTH; tr >= 1; tr--) {
        const pastT = t - (tr * 0.033);
        if (pastT < 0) continue;
        const pastAngle = MAX_ANGLE * Math.sin(omega * pastT);
        const trX = pivotX + length * Math.sin(pastAngle);
        const trY = pivotY + length * Math.cos(pastAngle);
        const alpha = ((TRAIL_LENGTH - tr + 1) / TRAIL_LENGTH) * 0.25;
        ctx.beginPath();
        ctx.arc(trX, trY, bobR * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
        ctx.fill();
      }

      const angle = MAX_ANGLE * Math.sin(omega * t);
      const bobX = pivotX + length * Math.sin(angle);
      const bobY = pivotY + length * Math.cos(angle);

      // String
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(bobX, bobY);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Bob
      ctx.beginPath();
      ctx.arc(bobX, bobY, bobR, 0, Math.PI * 2);
      ctx.fillStyle = isAmber
        ? "rgba(251, 191, 36, 0.8)"
        : "rgba(59, 130, 246, 0.7)";
      ctx.fill();

      // Glow
      ctx.beginPath();
      ctx.arc(bobX, bobY, bobR + 4, 0, Math.PI * 2);
      ctx.fillStyle = isAmber
        ? "rgba(251, 191, 36, 0.15)"
        : "rgba(59, 130, 246, 0.15)";
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.arc(
        bobX - bobR * 0.25,
        bobY - bobR * 0.3,
        bobR * 0.3,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fill();

      // Pivot point
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(59, 130, 246, 0.6)";
      ctx.fill();
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

const CODE_SNIPPET = `const NUM = 15;
const BASE_FREQ = 24;

for (let i = 0; i < NUM; i++) {
  const freq = BASE_FREQ + i;
  const omega = 2 * PI * freq / PERIOD;
  const angle = MAX_ANGLE * sin(omega * t);
  bobX = pivot + L * sin(angle);
  bobY = pivot + L * cos(angle);
}`;

export const PendulumWaveReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Pendulum Wave"
      subtitle="T = 2*pi*sqrt(L/g) -- elk net iets anders"
      codeString={CODE_SNIPPET}
    >
      <PendulumWaveCanvas />
    </ReelTemplate>
  );
};
