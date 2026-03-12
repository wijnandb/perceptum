import React, { useRef, useEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

const LissajousCanvas: React.FC = () => {
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
    const A = w * 0.38;
    const B = h * 0.38;
    const cx = w / 2;
    const cy = h / 2;

    const speed = 0.02;
    const drift = 0.0003;

    // Current time derived from frame
    const t = frame * speed;

    const a = 3 + Math.sin(t * drift / speed);
    const b = 2 + Math.cos(t * drift * 0.7 / speed);
    const delta = t * drift * 2 / speed;

    ctx.clearRect(0, 0, w, h);

    // Draw trail by going backwards from current t
    const trailLength = 1200;
    for (let i = 0; i < trailLength - 1; i++) {
      const alpha = (i / trailLength) * 0.7;
      const s1 = t - (trailLength - i) * 0.01;
      const s2 = t - (trailLength - i - 1) * 0.01;
      const x1 = cx + A * Math.sin(a * s1 + delta);
      const y1 = cy + B * Math.sin(b * s1);
      const x2 = cx + A * Math.sin(a * s2 + delta);
      const y2 = cy + B * Math.sin(b * s2);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
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

const CODE_SNIPPET = `// Lissajous curve
const a = 3 + sin(t * drift);
const b = 2 + cos(t * drift * 0.7);
const delta = t * drift * 2;

x = A * sin(a * t + delta);
y = B * sin(b * t);

// Trail: draw segments from
// t-trailLength to t`;

export const LissajousReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Lissajous Curves"
      subtitle="Twee sinusgolven, een complex patroon"
      codeString={CODE_SNIPPET}
    >
      <LissajousCanvas />
    </ReelTemplate>
  );
};
