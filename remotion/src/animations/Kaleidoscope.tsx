import React, { useRef, useEffect } from "react";
import { useCurrentFrame } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);
const SEGMENTS = 6;
const MAX_DOTS = 40;

interface Dot {
  angle: number;
  radius: number;
  size: number;
  color: "blue" | "amber";
  speed: number;
  radialSpeed: number;
  birthFrame: number;
  maxLife: number;
}

// Deterministic pseudo-random from seed
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function createDots(): Dot[] {
  const rng = seededRandom(12345);
  const dots: Dot[] = [];

  // Pre-generate all dots that will appear during the animation
  // Spawn initial 20, then occasionally add more
  for (let i = 0; i < 20; i++) {
    dots.push({
      angle: rng() * (Math.PI / SEGMENTS),
      radius: 20 + rng() * CANVAS_H * 0.35 * 0.8,
      size: 2 + rng() * 5,
      color: rng() > 0.4 ? "blue" : "amber",
      speed: (rng() - 0.5) * 0.003,
      radialSpeed: (rng() - 0.5) * 0.3,
      birthFrame: 0,
      maxLife: 200 + rng() * 400,
    });
  }

  // Spawn additional dots over time (deterministic)
  const rng2 = seededRandom(67890);
  for (let f = 1; f <= 540; f++) {
    if (dots.length < 80 && rng2() < 0.08) {
      dots.push({
        angle: rng2() * (Math.PI / SEGMENTS),
        radius: 20 + rng2() * CANVAS_H * 0.35 * 0.8,
        size: 2 + rng2() * 5,
        color: rng2() > 0.4 ? "blue" : "amber",
        speed: (rng2() - 0.5) * 0.003,
        radialSpeed: (rng2() - 0.5) * 0.3,
        birthFrame: f,
        maxLife: 200 + rng2() * 400,
      });
    } else {
      // Consume random values to keep sequence deterministic
      rng2(); rng2(); rng2(); rng2(); rng2(); rng2();
    }
  }

  return dots;
}

// Pre-compute all dots once (module-level)
const ALL_DOTS = createDots();

const KaleidoscopeCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const cxCenter = CANVAS_W / 2;
    const cyCenter = CANVAS_H / 2;
    const maxR = Math.min(CANVAS_W, CANVAS_H) * 0.35;
    const wedge = Math.PI / SEGMENTS;

    // Draw subtle guide lines
    for (let s = 0; s < SEGMENTS; s++) {
      const a = (s * 2 * Math.PI) / SEGMENTS;
      const lineR = Math.min(CANVAS_W, CANVAS_H) * 0.38;
      ctx.beginPath();
      ctx.moveTo(cxCenter, cyCenter);
      ctx.lineTo(cxCenter + lineR * Math.cos(a), cyCenter + lineR * Math.sin(a));
      ctx.strokeStyle = "rgba(59, 130, 246, 0.05)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Process each dot
    for (const dot of ALL_DOTS) {
      if (dot.birthFrame > frame) continue;
      const life = frame - dot.birthFrame;
      if (life > dot.maxLife) continue;

      // Simulate dot state at current frame
      let angle = dot.angle + dot.speed * life;
      let radius = dot.radius + dot.radialSpeed * life;

      // Bounce angle within wedge (simplified)
      // Wrap angle to stay within [0, wedge]
      const totalAngleTravel = dot.speed * life;
      const rawAngle = dot.angle + totalAngleTravel;
      // Use triangle wave to bounce between 0 and wedge
      const period = wedge * 2;
      const phase = ((rawAngle % period) + period) % period;
      angle = phase <= wedge ? phase : period - phase;

      // Bounce radius
      const rawRadius = dot.radius + dot.radialSpeed * life;
      // Triangle wave between 15 and maxR
      const rRange = maxR - 15;
      const rPhase = ((rawRadius - 15) % (rRange * 2) + rRange * 2) % (rRange * 2);
      radius = rPhase <= rRange ? 15 + rPhase : 15 + rRange * 2 - rPhase;

      // Fade in/out
      const fadeIn = Math.min(life / 60, 1);
      const fadeOut = life > dot.maxLife - 60
        ? Math.max(0, 1 - (life - (dot.maxLife - 60)) / 60)
        : 1;
      const alpha = fadeIn * fadeOut;

      const fillColor =
        dot.color === "blue"
          ? `rgba(59, 130, 246, ${alpha * 0.7})`
          : `rgba(251, 191, 36, ${alpha * 0.6})`;

      // Draw in all segments with mirrors
      for (let s = 0; s < SEGMENTS; s++) {
        const baseAngle = (s * 2 * Math.PI) / SEGMENTS;

        // Normal
        const a1 = baseAngle + angle;
        const x1 = cxCenter + radius * Math.cos(a1);
        const y1 = cyCenter + radius * Math.sin(a1);
        ctx.beginPath();
        ctx.arc(x1, y1, dot.size, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();

        // Mirrored
        const a2 = baseAngle - angle;
        const x2 = cxCenter + radius * Math.cos(a2);
        const y2 = cyCenter + radius * Math.sin(a2);
        ctx.beginPath();
        ctx.arc(x2, y2, dot.size, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
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

const CODE_SNIPPET = `// 6-fold mirror symmetry
const SEGMENTS = 6;
for (let s = 0; s < SEGMENTS; s++) {
  const base = s * 2 * PI / SEGMENTS;
  // Original dot
  draw(cx + r*cos(base + angle),
       cy + r*sin(base + angle));
  // Mirror
  draw(cx + r*cos(base - angle),
       cy + r*sin(base - angle));
}`;

export const KaleidoscopeReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Kaleidoscope"
      subtitle="Symmetrie in beweging"
      codeString={CODE_SNIPPET}
    >
      <KaleidoscopeCanvas />
    </ReelTemplate>
  );
};
