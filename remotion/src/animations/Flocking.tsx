import React, { useRef, useEffect } from "react";
import { useCurrentFrame } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

const BOID_COUNT = 120;
const PERCEPTION = 50;
const MAX_SPEED = 2.8;
const MAX_FORCE = 0.05;

interface Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  leader: boolean;
}

function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function limit(vx: number, vy: number, max: number): [number, number] {
  const mag = Math.sqrt(vx * vx + vy * vy);
  if (mag > max && mag > 0) {
    return [(vx / mag) * max, (vy / mag) * max];
  }
  return [vx, vy];
}

function createBoids(rng: () => number): Boid[] {
  const boids: Boid[] = [];
  for (let i = 0; i < BOID_COUNT; i++) {
    const angle = rng() * Math.PI * 2;
    const speed = 1 + rng() * 1.5;
    boids.push({
      x: rng() * CANVAS_W,
      y: rng() * CANVAS_H,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      leader: i % 10 === 0,
    });
  }
  return boids;
}

function stepBoids(boids: Boid[]) {
  const W = CANVAS_W;
  const H = CANVAS_H;

  for (let i = 0; i < boids.length; i++) {
    const b = boids[i];
    let alignX = 0,
      alignY = 0;
    let cohX = 0,
      cohY = 0;
    let sepX = 0,
      sepY = 0;
    let neighbors = 0;

    for (let j = 0; j < boids.length; j++) {
      if (i === j) continue;
      const o = boids[j];
      let dx = o.x - b.x;
      let dy = o.y - b.y;
      if (dx > W / 2) dx -= W;
      if (dx < -W / 2) dx += W;
      if (dy > H / 2) dy -= H;
      if (dy < -H / 2) dy += H;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PERCEPTION && dist > 0) {
        neighbors++;
        alignX += o.vx;
        alignY += o.vy;
        cohX += dx;
        cohY += dy;
        sepX -= dx / dist;
        sepY -= dy / dist;
      }
    }

    let ax = 0,
      ay = 0;
    if (neighbors > 0) {
      alignX /= neighbors;
      alignY /= neighbors;
      const aMag = Math.sqrt(alignX * alignX + alignY * alignY);
      if (aMag > 0) {
        alignX = (alignX / aMag) * MAX_SPEED - b.vx;
        alignY = (alignY / aMag) * MAX_SPEED - b.vy;
        [alignX, alignY] = limit(alignX, alignY, MAX_FORCE);
      }
      cohX /= neighbors;
      cohY /= neighbors;
      const cMag = Math.sqrt(cohX * cohX + cohY * cohY);
      if (cMag > 0) {
        cohX = (cohX / cMag) * MAX_SPEED - b.vx;
        cohY = (cohY / cMag) * MAX_SPEED - b.vy;
        [cohX, cohY] = limit(cohX, cohY, MAX_FORCE);
      }
      sepX /= neighbors;
      sepY /= neighbors;
      const sMag = Math.sqrt(sepX * sepX + sepY * sepY);
      if (sMag > 0) {
        sepX = (sepX / sMag) * MAX_SPEED - b.vx;
        sepY = (sepY / sMag) * MAX_SPEED - b.vy;
        [sepX, sepY] = limit(sepX, sepY, MAX_FORCE);
      }
      ax = alignX * 1.0 + cohX * 1.0 + sepX * 1.5;
      ay = alignY * 1.0 + cohY * 1.0 + sepY * 1.5;
    }

    b.vx += ax;
    b.vy += ay;
    [b.vx, b.vy] = limit(b.vx, b.vy, MAX_SPEED);
    b.x += b.vx;
    b.y += b.vy;
    if (b.x < 0) b.x += W;
    if (b.x > W) b.x -= W;
    if (b.y < 0) b.y += H;
    if (b.y > H) b.y -= H;
  }
}

const FlockingCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const boidsRef = useRef<Boid[] | null>(null);
  const lastFrameRef = useRef(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Incremental: step from last frame or simulate from scratch
    let boids: Boid[];
    if (boidsRef.current && lastFrameRef.current === frame - 1) {
      boids = boidsRef.current;
      stepBoids(boids);
    } else {
      const rng = createRng(12345);
      boids = createBoids(rng);
      for (let f = 0; f < frame; f++) {
        stepBoids(boids);
      }
    }
    boidsRef.current = boids;
    lastFrameRef.current = frame;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    for (const b of boids) {
      const angle = Math.atan2(b.vy, b.vx);
      const size = b.leader ? 7 : 5;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(-size * 0.6, -size * 0.4);
      ctx.lineTo(-size * 0.3, 0);
      ctx.lineTo(-size * 0.6, size * 0.4);
      ctx.closePath();
      ctx.fillStyle = b.leader
        ? "rgba(251, 191, 36, 0.9)"
        : "rgba(59, 130, 246, 0.7)";
      ctx.fill();
      ctx.restore();
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

const CODE_SNIPPET = `for (const neighbor of nearby) {
  align += neighbor.velocity;
  cohesion += neighbor.position;
  separation -= delta / dist;
}

boid.accel = align + cohesion
           + separation * 1.5;
boid.vel = limit(boid.vel, MAX_SPEED);`;

export const FlockingReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Flocking"
      subtitle="align + cohere + separate = zwerm"
      codeString={CODE_SNIPPET}
    >
      <FlockingCanvas />
    </ReelTemplate>
  );
};
