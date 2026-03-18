import { Ball, StringLine, CollisionEvent } from './types';

const GRAVITY = 0.3;
const AIR_RESISTANCE = 0.999;
const BOUNCE_DAMPING = 0.85;
const WALL_DAMPING = 0.9;
const BALL_RADIUS = 6;
const MAX_BALLS = 100;
const COLLISION_COOLDOWN = 4; // frames of immunity after any bounce

export function createBall(canvasWidth: number): Ball {
  return {
    x: canvasWidth / 2,
    y: -BALL_RADIUS,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    opacity: 0,
    collisionCooldown: 0,
  };
}

export function createBallAt(x: number): Ball {
  return {
    x,
    y: -BALL_RADIUS,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    opacity: 0,
    collisionCooldown: 0,
  };
}

function pointToSegmentDistance(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): { dist: number; cx: number; cy: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const d = Math.hypot(px - x1, py - y1);
    return { dist: d, cx: x1, cy: y1 };
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  const dist = Math.hypot(px - cx, py - cy);
  return { dist, cx, cy };
}

function resolveCollision(ball: Ball, s: StringLine): CollisionEvent | null {
  if (ball.collisionCooldown > 0) return null;

  const { dist, cx, cy } = pointToSegmentDistance(ball.x, ball.y, s.x1, s.y1, s.x2, s.y2);
  if (dist > ball.radius) return null;

  // Choose normal facing the ball's incoming direction
  let nx = s.nx;
  let ny = s.ny;
  const dotVN = ball.vx * nx + ball.vy * ny;
  if (dotVN > 0) {
    nx = -nx;
    ny = -ny;
  }
  const dot = ball.vx * nx + ball.vy * ny;

  // Reflect
  ball.vx = (ball.vx - 2 * dot * nx) * BOUNCE_DAMPING;
  ball.vy = (ball.vy - 2 * dot * ny) * BOUNCE_DAMPING;

  // Push ball out of collision
  const overlap = ball.radius - dist;
  if (overlap > 0) {
    ball.x += nx * (overlap + 0.5);
    ball.y += ny * (overlap + 0.5);
  }

  // Global cooldown: ignore ALL strings for a few frames
  ball.collisionCooldown = COLLISION_COOLDOWN;

  return { ball, string: s, contactX: cx, contactY: cy };
}

export function updatePhysics(
  balls: Ball[],
  strings: StringLine[],
  canvasWidth: number,
  canvasHeight: number,
  dt: number
): CollisionEvent[] {
  const collisions: CollisionEvent[] = [];
  const dtFactor = dt / 16.67;

  for (let i = balls.length - 1; i >= 0; i--) {
    const ball = balls[i];

    // Fade in
    if (ball.opacity < 1) {
      ball.opacity = Math.min(1, ball.opacity + 0.05 * dtFactor);
    }

    // Determine substeps for anti-tunneling
    const speed = Math.hypot(ball.vx, ball.vy);
    const substeps = speed > ball.radius ? Math.min(4, Math.ceil(speed / ball.radius)) : 1;
    const subDt = dtFactor / substeps;

    for (let step = 0; step < substeps; step++) {
      // Decrement collision cooldown
      if (ball.collisionCooldown > 0) ball.collisionCooldown--;

      // Apply gravity
      ball.vy += GRAVITY * subDt;

      // Apply air resistance
      ball.vx *= Math.pow(AIR_RESISTANCE, subDt);
      ball.vy *= Math.pow(AIR_RESISTANCE, subDt);

      // Move
      ball.x += ball.vx * subDt;
      ball.y += ball.vy * subDt;

      // Wall bounces
      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx) * WALL_DAMPING;
      } else if (ball.x + ball.radius > canvasWidth) {
        ball.x = canvasWidth - ball.radius;
        ball.vx = -Math.abs(ball.vx) * WALL_DAMPING;
      }

      // String collisions
      for (const s of strings) {
        const event = resolveCollision(ball, s);
        if (event) collisions.push(event);
      }
    }

    // Remove balls below screen
    if (ball.y - ball.radius > canvasHeight) {
      balls.splice(i, 1);
    }
  }

  // Cap max balls
  while (balls.length > MAX_BALLS) {
    balls.shift();
  }

  return collisions;
}

export { BALL_RADIUS };
