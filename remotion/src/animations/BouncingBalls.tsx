import React, { useRef, useEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

const GRAVITY = 0.3;
const DAMPING = 0.95;
const TRAIL_LENGTH = 20;
const BALL_COUNT = 18;

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  baseColor: string;
  trail: { x: number; y: number }[];
}

// Seeded LCG random
function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function createBalls(rng: () => number): Ball[] {
  const balls: Ball[] = [];
  for (let i = 0; i < BALL_COUNT; i++) {
    const r = 8 + rng() * 17;
    const isAmber = i % 5 === 0;
    const alpha = 0.5 + rng() * 0.3;
    const baseColor = isAmber ? "251, 191, 36" : "59, 130, 246";
    const color = `rgba(${baseColor}, ${alpha})`;
    balls.push({
      x: r + rng() * (CANVAS_W - 2 * r),
      y: r + rng() * (CANVAS_H * 0.4),
      vx: (rng() - 0.5) * 4,
      vy: (rng() - 0.5) * 2,
      r,
      color,
      baseColor,
      trail: [],
    });
  }
  return balls;
}

function stepPhysics(balls: Ball[]) {
  for (const ball of balls) {
    ball.vy += GRAVITY;
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x - ball.r < 0) {
      ball.x = ball.r;
      ball.vx = Math.abs(ball.vx) * DAMPING;
    }
    if (ball.x + ball.r > CANVAS_W) {
      ball.x = CANVAS_W - ball.r;
      ball.vx = -Math.abs(ball.vx) * DAMPING;
    }
    if (ball.y - ball.r < 0) {
      ball.y = ball.r;
      ball.vy = Math.abs(ball.vy) * DAMPING;
    }
    if (ball.y + ball.r > CANVAS_H) {
      ball.y = CANVAS_H - ball.r;
      ball.vy = -Math.abs(ball.vy) * DAMPING;
    }

    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > TRAIL_LENGTH) ball.trail.shift();
  }

  // Resolve collisions
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = a.r + b.r;
      if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        const relVx = a.vx - b.vx;
        const relVy = a.vy - b.vy;
        const relVn = relVx * nx + relVy * ny;
        if (relVn > 0) {
          const massA = a.r * a.r;
          const massB = b.r * b.r;
          const impulse = (2 * relVn) / (massA + massB);
          a.vx -= impulse * massB * nx * DAMPING;
          a.vy -= impulse * massB * ny * DAMPING;
          b.vx += impulse * massA * nx * DAMPING;
          b.vy += impulse * massA * ny * DAMPING;
        }
        const overlap = (minDist - dist) / 2;
        a.x -= overlap * nx;
        a.y -= overlap * ny;
        b.x += overlap * nx;
        b.y += overlap * ny;
      }
    }
  }
}

// Simulate deterministically from frame 0 to target frame
function simulateToFrame(targetFrame: number): Ball[] {
  const rng = createRng(12345);
  const balls = createBalls(rng);
  for (let f = 0; f < targetFrame; f++) {
    stepPhysics(balls);
  }
  return balls;
}

const BouncingBallsCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const ballsRef = useRef<Ball[] | null>(null);
  const lastFrameRef = useRef(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Incremental simulation: if we have state from previous frame, just step forward
    let balls: Ball[];
    if (ballsRef.current && lastFrameRef.current === frame - 1) {
      balls = ballsRef.current;
      stepPhysics(balls);
    } else {
      balls = simulateToFrame(frame);
    }
    ballsRef.current = balls;
    lastFrameRef.current = frame;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw trails
    for (const ball of balls) {
      for (let i = 0; i < ball.trail.length - 1; i++) {
        const alpha = ((i + 1) / ball.trail.length) * 0.3;
        const trailR = ball.r * ((i + 1) / ball.trail.length);
        ctx.beginPath();
        ctx.arc(ball.trail[i].x, ball.trail[i].y, trailR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ball.baseColor}, ${alpha})`;
        ctx.fill();
      }
    }

    // Draw balls
    for (const ball of balls) {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
      // Highlight
      ctx.beginPath();
      ctx.arc(ball.x - ball.r * 0.25, ball.y - ball.r * 0.25, ball.r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
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

const CODE_SNIPPET = `// Physics step per frame
ball.vy += GRAVITY;
ball.x += ball.vx;
ball.y += ball.vy;

// Elastic collision
const impulse = (2 * relVn) / (mA + mB);
a.vx -= impulse * mB * nx;
b.vx += impulse * mA * nx;`;

export const BouncingBallsReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Bouncing Balls"
      subtitle="F = m*g, elastische botsingen"
      codeString={CODE_SNIPPET}
    >
      <BouncingBallsCanvas />
    </ReelTemplate>
  );
};
