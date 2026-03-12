import React, { useRef, useEffect } from "react";
import { useCurrentFrame } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

const G = 80;
const MIN_DIST = 50;
const TRAIL_LEN = 50;
const MAX_ACCEL = 0.4;
const MAX_PARTICLES = 100;

interface Planet {
  x: number;
  y: number;
  mass: number;
  r: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
  life: number;
  maxLife: number;
  dead: boolean;
}

function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const spread = Math.min(CANVAS_W, CANVAS_H) * 0.25;
const cx = CANVAS_W / 2;
const cy = CANVAS_H / 2;

const planets: Planet[] = [
  { x: cx - spread * 0.7, y: cy - spread * 0.2, mass: 4000, r: 24 },
  { x: cx + spread * 0.5, y: cy + spread * 0.5, mass: 3000, r: 18 },
  { x: cx + spread * 0.2, y: cy - spread * 0.6, mass: 3500, r: 20 },
  { x: cx - spread * 0.4, y: cy + spread * 0.7, mass: 2500, r: 16 },
];

function emitParticle(rng: () => number, particles: Particle[]) {
  if (particles.length >= MAX_PARTICLES) return;
  const edge = Math.floor(rng() * 4);
  const speed = 2 + rng() * 2.5;
  let x: number, y: number, vx: number, vy: number;

  if (edge === 0) {
    x = rng() * CANVAS_W; y = -5;
    vx = (rng() - 0.5) * 2; vy = speed;
  } else if (edge === 1) {
    x = CANVAS_W + 5; y = rng() * CANVAS_H;
    vx = -speed; vy = (rng() - 0.5) * 2;
  } else if (edge === 2) {
    x = rng() * CANVAS_W; y = CANVAS_H + 5;
    vx = (rng() - 0.5) * 2; vy = -speed;
  } else {
    x = -5; y = rng() * CANVAS_H;
    vx = speed; vy = (rng() - 0.5) * 2;
  }

  particles.push({
    x, y, vx, vy,
    trail: [],
    life: 0,
    maxLife: 400 + rng() * 200,
    dead: false,
  });
}

function stepParticles(particles: Particle[]) {
  const margin = 150;
  for (const p of particles) {
    if (p.dead) continue;
    for (const pl of planets) {
      const dx = pl.x - p.x;
      const dy = pl.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;
      const clampDist = Math.max(dist, MIN_DIST);
      const force = (G * pl.mass) / (clampDist * clampDist);
      let ax = (force * dx) / dist;
      let ay = (force * dy) / dist;
      const mag = Math.sqrt(ax * ax + ay * ay);
      if (mag > MAX_ACCEL) {
        ax = (ax / mag) * MAX_ACCEL;
        ay = (ay / mag) * MAX_ACCEL;
      }
      p.vx += ax;
      p.vy += ay;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.life++;
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > TRAIL_LEN) p.trail.shift();

    if (
      p.life > p.maxLife ||
      p.x < -margin ||
      p.x > CANVAS_W + margin ||
      p.y < -margin ||
      p.y > CANVAS_H + margin
    ) {
      p.dead = true;
    }
  }
}

interface SimState {
  particles: Particle[];
  rngState: number;
}

function simulateToFrame(targetFrame: number): SimState {
  let rngSeed = 12345;
  const rng = () => {
    rngSeed = (rngSeed * 1103515245 + 12345) & 0x7fffffff;
    return rngSeed / 0x7fffffff;
  };

  const particles: Particle[] = [];

  for (let f = 0; f < targetFrame; f++) {
    // Emit ~0.6 particles per frame deterministically
    if (rng() < 0.3) emitParticle(rng, particles);
    if (rng() < 0.3) emitParticle(rng, particles);

    stepParticles(particles);

    // Remove dead particles
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].dead) particles.splice(i, 1);
    }
  }

  return { particles, rngState: rngSeed };
}

const GravitySlingshotCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const stateRef = useRef<{ particles: Particle[]; rngState: number } | null>(null);
  const lastFrameRef = useRef(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[];

    if (stateRef.current && lastFrameRef.current === frame - 1) {
      // Incremental step
      let rngSeed = stateRef.current.rngState;
      const rng = () => {
        rngSeed = (rngSeed * 1103515245 + 12345) & 0x7fffffff;
        return rngSeed / 0x7fffffff;
      };
      particles = stateRef.current.particles;
      if (rng() < 0.3) emitParticle(rng, particles);
      if (rng() < 0.3) emitParticle(rng, particles);
      stepParticles(particles);
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].dead) particles.splice(i, 1);
      }
      stateRef.current = { particles, rngState: rngSeed };
    } else {
      const state = simulateToFrame(frame);
      particles = state.particles;
      stateRef.current = state;
    }
    lastFrameRef.current = frame;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw trails
    for (const p of particles) {
      if (p.trail.length < 2) continue;
      for (let i = 0; i < p.trail.length - 1; i++) {
        const alpha = ((i + 1) / p.trail.length) * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.trail[i].x, p.trail[i].y);
        ctx.lineTo(p.trail[i + 1].x, p.trail[i + 1].y);
        ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      const h = p.trail[p.trail.length - 1];
      ctx.beginPath();
      ctx.arc(h.x, h.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(59, 130, 246, 0.9)";
      ctx.fill();
    }

    // Draw planets
    for (const pl of planets) {
      const grad = ctx.createRadialGradient(
        pl.x, pl.y, pl.r * 0.5,
        pl.x, pl.y, pl.r * 4
      );
      grad.addColorStop(0, "rgba(251, 191, 36, 0.25)");
      grad.addColorStop(1, "rgba(251, 191, 36, 0)");
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, pl.r * 4, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pl.x, pl.y, pl.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(251, 191, 36, 0.8)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pl.x - pl.r * 0.2, pl.y - pl.r * 0.2, pl.r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.fill();
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

const CODE_SNIPPET = `for (const planet of planets) {
  const dx = planet.x - p.x;
  const dy = planet.y - p.y;
  const dist = max(sqrt(dx*dx+dy*dy), MIN);
  const F = G * planet.mass / (dist * dist);
  p.vx += F * dx / dist;
  p.vy += F * dy / dist;
}`;

export const GravitySlingshotReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Gravity Slingshot"
      subtitle="F = G * m1 * m2 / r^2"
      codeString={CODE_SNIPPET}
    >
      <GravitySlingshotCanvas />
    </ReelTemplate>
  );
};
