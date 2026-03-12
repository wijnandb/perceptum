import React, { useRef, useEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

const DROP_COUNT = 150;
const GRAVITY = 0.15;
const SPLASH_FLOOR_RATIO = 0.85;

// Deterministic seeded PRNG
function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

interface Drop {
  x: number;
  y: number;
  vy: number;
  vx: number;
  width: number;
  height: number;
  opacity: number;
  golden: boolean;
}

interface SplashParticle {
  vx: number;
  vy: number;
  x: number;
  y: number;
  life: number;
}

interface Splash {
  x: number;
  y: number;
  particles: SplashParticle[];
  golden: boolean;
  age: number;
}

function simulateRain(totalFrames: number): { drops: Drop[]; splashes: Splash[] }[] {
  const rng = createRng(12345);
  const W = CANVAS_W;
  const H = CANVAS_H;
  const floorY = H * SPLASH_FLOOR_RATIO;

  function createDrop(fromTop: boolean): Drop {
    return {
      x: rng() * W,
      y: fromTop ? -rng() * 100 - 20 : rng() * H,
      vy: 3 + rng() * 4,
      vx: -0.5 + rng() * 0.3,
      width: 1 + rng() * 2,
      height: 8 + rng() * 12,
      opacity: 0.2 + rng() * 0.4,
      golden: rng() < 1 / 30,
    };
  }

  const drops: Drop[] = [];
  for (let i = 0; i < DROP_COUNT; i++) {
    drops.push(createDrop(false));
  }
  const splashes: Splash[] = [];

  const snapshots: { drops: Drop[]; splashes: Splash[] }[] = [];

  for (let f = 0; f < totalFrames; f++) {
    // Update drops
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      d.vy += GRAVITY;
      d.x += d.vx;
      d.y += d.vy;

      if (d.y > floorY + rng() * (H - floorY)) {
        // Create splash
        const count = 3 + Math.floor(rng() * 2);
        const particles: SplashParticle[] = [];
        for (let p = 0; p < count; p++) {
          const angle = -Math.PI * (0.15 + rng() * 0.7);
          const speed = 1.5 + rng() * 2;
          particles.push({
            vx: Math.cos(angle) * speed * (rng() > 0.5 ? 1 : -1),
            vy: Math.sin(angle) * speed,
            x: 0,
            y: 0,
            life: 1,
          });
        }
        splashes.push({ x: d.x, y: d.y, particles, golden: d.golden, age: 0 });
        drops[i] = createDrop(true);
      }

      if (d.x < -10 || d.x > W + 10) {
        drops[i] = createDrop(true);
      }
    }

    // Update splashes
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      s.age++;
      let allDead = true;
      for (const p of s.particles) {
        p.vy += 0.08;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        if (p.life > 0) allDead = false;
      }
      if (allDead) {
        splashes.splice(i, 1);
      }
    }

    // Deep copy snapshot
    snapshots.push({
      drops: drops.map((d) => ({ ...d })),
      splashes: splashes.map((s) => ({
        ...s,
        particles: s.particles.map((p) => ({ ...p })),
      })),
    });
  }

  return snapshots;
}

const RainCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotsRef = useRef<ReturnType<typeof simulateRain> | null>(null);
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Pre-compute all frames on first render
  if (!snapshotsRef.current) {
    snapshotsRef.current = simulateRain(durationInFrames);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const snapshots = snapshotsRef.current;
    if (!snapshots) return;

    const idx = Math.min(frame, snapshots.length - 1);
    const { drops, splashes } = snapshots[idx];

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw drops
    for (const d of drops) {
      if (d.golden) {
        ctx.fillStyle = `rgba(251, 191, 36, ${d.opacity + 0.15})`;
      } else {
        ctx.fillStyle = `rgba(59, 130, 246, ${d.opacity})`;
      }
      ctx.save();
      ctx.translate(d.x, d.y);
      const angle = Math.atan2(d.vy, d.vx);
      ctx.rotate(angle - Math.PI / 2);
      ctx.fillRect(-d.width / 2, -d.height / 2, d.width, d.height);
      ctx.restore();
    }

    // Draw splashes
    for (const s of splashes) {
      for (const p of s.particles) {
        if (p.life <= 0) continue;
        const alpha = p.life * 0.7;
        if (s.golden) {
          ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
        }
        const size = 1.5 * p.life;
        ctx.beginPath();
        ctx.arc(s.x + p.x, s.y + p.y, size, 0, Math.PI * 2);
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

const CODE_SNIPPET = `for (const drop of drops) {
  drop.vy += GRAVITY;   // v = v₀ + g·t
  drop.x  += drop.vx;
  drop.y  += drop.vy;

  if (drop.y > floor) {
    createSplash(drop.x, drop.y);
    resetDrop(drop);
  }
}`;

export const RainReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Regenval"
      subtitle="v = v₀ + g·t"
      codeString={CODE_SNIPPET}
    >
      <RainCanvas />
    </ReelTemplate>
  );
};
