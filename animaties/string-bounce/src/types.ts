export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number; // for fade-in effect
  collisionCooldown: number; // frames to skip all collisions after a bounce
}

export interface StringLine {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  length: number;
  nx: number; // unit normal x
  ny: number; // unit normal y
  frequency: number; // musical pitch in Hz
  vibration: number; // 0-1, decays after hit
  color: string; // pitch-based color
}

export interface ScheduledBall {
  x: number;       // drop X position
  delay: number;    // ms from sequence start
}

export interface GameState {
  balls: Ball[];
  strings: StringLine[];
  nextStringId: number;
  isDrawing: boolean;
  drawStart: { x: number; y: number } | null;
  drawCurrent: { x: number; y: number } | null;
  autoSpawnRate: number; // balls per second, 0 = manual
  spawnAccumulator: number;
  canvasWidth: number;
  canvasHeight: number;
  audioUnlocked: boolean;
  melodyQueue: ScheduledBall[];  // scheduled ball drops for song presets
  melodyStartTime: number;       // timestamp when melody started
}

export interface CollisionEvent {
  ball: Ball;
  string: StringLine;
  contactX: number;
  contactY: number;
}
