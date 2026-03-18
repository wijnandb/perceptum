import { GameState, ScheduledBall } from './types';
import { stringLengthToFrequency, frequencyToColor } from './audio';

const MIN_STRING_LEN = 50;
const MAX_STRING_LEN = 1500;
const FREQ_LOW = 130.81;
const FREQ_HIGH = 1046.5;

const GRAVITY = 0.3;
const DAMPING = 0.85;
const BALL_RADIUS = 6;

// Note name → frequency lookup
const NOTES: Record<string, number> = {
  'G3': 196.00, 'A3': 220.00,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'G4': 392.00, 'A4': 440.00,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.26, 'G5': 783.99, 'A5': 880.00,
  'C6': 1046.50,
};

function frequencyToStringLength(freq: number): number {
  const t = 1 - Math.log(freq / FREQ_LOW) / Math.log(FREQ_HIGH / FREQ_LOW);
  return MIN_STRING_LEN + t * (MAX_STRING_LEN - MIN_STRING_LEN);
}

interface SongPreset {
  name: string;
  notes: string[];
  tempo: number;
}

const SONGS: SongPreset[] = [
  {
    name: 'Twinkle Twinkle',
    notes: ['C5', 'C5', 'G5', 'G5', 'A5', 'A5', 'G5', 'E5', 'E5', 'D5', 'D5', 'C5'],
    tempo: 500,
  },
  {
    name: 'Amazing Grace',
    notes: ['G4', 'C5', 'E5', 'C5', 'E5', 'D5', 'C5', 'A4', 'G4', 'C5'],
    tempo: 600,
  },
  {
    name: 'Scale Up',
    notes: ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'],
    tempo: 400,
  },
  {
    name: 'Ode to Joy',
    notes: ['E5', 'E5', 'G5', 'G5', 'E5', 'E5', 'D5', 'C5', 'C5', 'D5', 'E5', 'D5', 'C5'],
    tempo: 450,
  },
];

// ─── Bounce trajectory math ───────────────────────────────────────
// After a ball falls from y=0 to a string at (xS, yS) tilted at angle θ:
//
//   Impact velocity: vy_impact = sqrt(2 * g * yS), vx_impact = 0
//   After reflection off normal (-sinθ, cosθ) with damping:
//     vx_bounce = vy_impact * sin(2θ) * damping
//     vy_bounce = -vy_impact * cos(2θ) * damping   (negative = upward for θ<45°)
//
//   Post-bounce parabola:
//     x(t) = xS + vx_bounce * t
//     y(t) = yS + vy_bounce * t + 0.5 * g * t²
//
//   We compute y(t) at every other string's x position to ensure clearance.

interface PlacedString {
  xCenter: number;
  yCenter: number;
  angle: number;       // tilt in radians (positive = tilts right-down)
  length: number;
  noteName: string;
}

function computeBounceTrajectoryYAtX(
  stringX: number, stringY: number,
  tiltAngle: number,
  targetX: number
): number {
  // Ball falling straight down onto this string
  const vyImpact = Math.sqrt(2 * GRAVITY * stringY);

  // Reflection off tilted string
  const vxBounce = vyImpact * Math.sin(2 * tiltAngle) * DAMPING;
  const vyBounce = -vyImpact * Math.cos(2 * tiltAngle) * DAMPING;

  // Time to reach targetX
  if (Math.abs(vxBounce) < 0.001) return stringY; // no horizontal movement
  const t = (targetX - stringX) / vxBounce;
  if (t < 0) return Infinity; // ball goes other direction — no conflict possible

  // Y position at that time
  return stringY + vyBounce * t + 0.5 * GRAVITY * t * t;
}

export function loadPreset(state: GameState, presetIndex: number): void {
  if (presetIndex < 0 || presetIndex >= SONGS.length) return;

  const song = SONGS[presetIndex];
  const { canvasWidth: w, canvasHeight: h } = state;

  state.strings.length = 0;
  state.balls.length = 0;

  // Unique notes determine how many strings we need
  const uniqueNotes = [...new Set(song.notes)];
  const noteCount = uniqueNotes.length;

  // Horizontal layout: spread across canvas
  const padding = w * 0.1;
  const usableWidth = w - 2 * padding;
  const columnSpacing = usableWidth / (noteCount + 1);

  // Vertical layout: stagger across 3 Y levels for separation
  const yLevels = [h * 0.35, h * 0.45, h * 0.55];

  // Place strings: assign X columns and staggered Y heights
  const placed: PlacedString[] = [];

  for (let i = 0; i < noteCount; i++) {
    const noteName = uniqueNotes[i];
    const freq = NOTES[noteName];
    if (!freq) continue;

    let stringLength = frequencyToStringLength(freq);
    const maxLen = columnSpacing * 0.9;
    if (stringLength > maxLen) stringLength = maxLen;
    if (stringLength < MIN_STRING_LEN) stringLength = MIN_STRING_LEN;

    const xCenter = padding + columnSpacing * (i + 1);
    const yCenter = yLevels[i % 3];

    // Tilt OUTWARD from canvas center so bounced ball heads toward nearest wall
    // Left-of-center strings tilt to bounce left, right-of-center to bounce right
    const isLeftOfCenter = xCenter < w / 2;
    // Positive angle = right-end lower. Ball falling straight down reflects rightward.
    // We want left-side strings to bounce left (negative angle) and right-side to bounce right (positive angle).
    const tiltDeg = 20;
    const angle = isLeftOfCenter
      ? -tiltDeg * (Math.PI / 180)   // bounce goes left (away from center)
      : tiltDeg * (Math.PI / 180);    // bounce goes right (away from center)

    placed.push({ xCenter, yCenter, angle, length: stringLength, noteName });
  }

  // ─── Validate: check each string's bounce trajectory against all others ───
  const CLEARANCE = BALL_RADIUS * 4; // minimum distance between trajectory and string

  for (let i = 0; i < placed.length; i++) {
    const si = placed[i];

    for (let j = 0; j < placed.length; j++) {
      if (i === j) continue;
      const sj = placed[j];

      // Where is the bounce trajectory from string i when it passes over string j's X?
      const trajectoryY = computeBounceTrajectoryYAtX(
        si.xCenter, si.yCenter, si.angle, sj.xCenter
      );

      // Check if trajectory passes within CLEARANCE of string j
      const dist = Math.abs(trajectoryY - sj.yCenter);
      if (dist < CLEARANCE && trajectoryY !== Infinity) {
        // Conflict! Move string j to a different Y level to create clearance
        // Choose the Y level that's farthest from the trajectory
        let bestY = sj.yCenter;
        let bestDist = dist;
        for (const y of yLevels) {
          const d = Math.abs(trajectoryY - y);
          if (d > bestDist) {
            bestDist = d;
            bestY = y;
          }
        }
        // Also try above and below the standard levels
        const extraLevels = [h * 0.28, h * 0.62];
        for (const y of extraLevels) {
          const d = Math.abs(trajectoryY - y);
          if (d > bestDist) {
            bestDist = d;
            bestY = y;
          }
        }
        sj.yCenter = bestY;
      }
    }
  }

  // ─── Also verify falling balls don't hit wrong strings ───
  // Ball drops from (xCenter, 0) straight down. Check it doesn't pass through
  // another string on the way down to its target.
  for (let i = 0; i < placed.length; i++) {
    const target = placed[i];
    for (let j = 0; j < placed.length; j++) {
      if (i === j) continue;
      const other = placed[j];

      // Ball falls at x = target.xCenter. Does it pass through 'other'?
      // Other string spans from x1 to x2. Check if target.xCenter is within that range
      // AND other.yCenter < target.yCenter (other is above target, in the fall path)
      const halfLen = other.length / 2;
      const cosA = Math.cos(other.angle);
      const otherX1 = other.xCenter - halfLen * cosA;
      const otherX2 = other.xCenter + halfLen * cosA;
      const xMin = Math.min(otherX1, otherX2);
      const xMax = Math.max(otherX1, otherX2);

      if (target.xCenter >= xMin - BALL_RADIUS && target.xCenter <= xMax + BALL_RADIUS
          && other.yCenter < target.yCenter) {
        // Falling ball would hit 'other' before reaching 'target'
        // Move target above 'other' or move 'other' out of the way
        if (target.yCenter > other.yCenter) {
          // Move target higher so ball doesn't need to pass through other
          target.yCenter = Math.min(target.yCenter, other.yCenter - 60);
          if (target.yCenter < h * 0.2) target.yCenter = h * 0.2;
        }
      }
    }
  }

  // ─── Create the actual string objects ───
  const noteToX = new Map<string, number>();

  for (const p of placed) {
    noteToX.set(p.noteName, p.xCenter);

    const halfLen = p.length / 2;
    const x1 = p.xCenter - halfLen * Math.cos(p.angle);
    const y1 = p.yCenter - halfLen * Math.sin(p.angle);
    const x2 = p.xCenter + halfLen * Math.cos(p.angle);
    const y2 = p.yCenter + halfLen * Math.sin(p.angle);

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const nx = -dy / length;
    const ny = dx / length;
    const frequency = stringLengthToFrequency(length);
    const color = frequencyToColor(frequency);

    state.strings.push({
      id: state.nextStringId++,
      x1, y1, x2, y2,
      length, nx, ny,
      frequency,
      vibration: 0,
      color,
    });
  }

  // ─── Build melody queue ───
  const queue: ScheduledBall[] = [];
  for (let i = 0; i < song.notes.length; i++) {
    const noteName = song.notes[i];
    const x = noteToX.get(noteName);
    if (x === undefined) continue;
    queue.push({ x, delay: i * song.tempo });
  }

  state.melodyQueue = queue;
  state.melodyStartTime = 0;
}

export function getPresetNames(): string[] {
  return SONGS.map(s => s.name);
}
