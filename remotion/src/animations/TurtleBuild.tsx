import React, { useRef, useEffect } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";

// --- Layout ---
const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.55);
const FPS = 30;

// --- Colors ---
const NAVY = "#0f172a";
const GOLD = "#fbbf24";
const SLATE_500 = "#64748b";
const BLUE = "#3b82f6";

// --- Syntax coloring ---
const C_KEYWORD = "#c084fc";
const C_FUNC = "#60a5fa";
const C_NUMBER = "#fbbf24";
const C_STRING = "#86efac";
const C_COMMENT = "#64748b";
const C_TEXT = "#e2e8f0";

function colorLine(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const patterns: [RegExp, string][] = [
    [/^(\/\/.*)/, C_COMMENT],
    [/\b(for|let|const|function|return|of|repeat)\b/, C_KEYWORD],
    [/\b(\d+\.?\d*)\b/, C_NUMBER],
    [/('[^']*'|"[^"]*")/, C_STRING],
    [/\b([a-zA-Z_]\w*)\s*(?=\()/, C_FUNC],
  ];
  let rest = line;
  let key = 0;
  while (rest.length > 0) {
    let earliest: { idx: number; len: number; color: string } | null = null;
    for (const [p, c] of patterns) {
      const m = rest.match(p);
      if (m && m.index !== undefined) {
        if (!earliest || m.index < earliest.idx) {
          earliest = { idx: m.index, len: m[0].length, color: c };
        }
      }
    }
    if (earliest && earliest.idx < rest.length) {
      if (earliest.idx > 0) {
        tokens.push(<span key={key++} style={{ color: C_TEXT }}>{rest.slice(0, earliest.idx)}</span>);
      }
      tokens.push(<span key={key++} style={{ color: earliest.color }}>{rest.slice(earliest.idx, earliest.idx + earliest.len)}</span>);
      rest = rest.slice(earliest.idx + earliest.len);
    } else {
      tokens.push(<span key={key++} style={{ color: C_TEXT }}>{rest}</span>);
      break;
    }
  }
  return tokens;
}

// --- Turtle command types ---
type Cmd = { type: "forward"; value: number } | { type: "turn"; value: number };

interface Segment {
  x1: number; y1: number;
  x2: number; y2: number;
  hue: number;
}

// --- Phase timing (frames at 30fps) ---
const P1_CODE = 15;        // code appears
const P1_DRAW = 60;        // turtle draws line
const P1_END = 120;        // 4s

const P2_CODE = 120;       // right(90) code
const P2_DRAW = 150;       // turtle turns
const P2_END = 210;        // 7s

const P3_CODE = 210;       // for loop code
const P3_DRAW = 255;       // turtle draws square
const P3_END = 420;        // 14s

const P4_CODE = 420;       // right(10) code
const P4_DRAW = 450;       // turtle turns
const P4_END = 510;        // 17s

const P5_CODE = 510;       // outer loop code
const P5_DRAW = 540;       // pattern starts
const P5_END = 750;        // 25s

const HOLD_END = 780;      // 26s
const FADE_END = 810;      // 27s
const TOTAL = 810;

// --- Config ---
const SHAPE_SIDES = 4;       // square
const SIDE_LENGTH = 140;     // px
const INNER_ANGLE = 90;      // degrees
const OUTER_ANGLE = 10;      // degrees
const PATTERN_COUNT = 360 / OUTER_ANGLE; // 36

// --- Pre-compute ALL turtle commands for the full pattern ---
function buildAllCommands(): Cmd[] {
  const cmds: Cmd[] = [];
  for (let j = 0; j < PATTERN_COUNT; j++) {
    for (let i = 0; i < SHAPE_SIDES; i++) {
      cmds.push({ type: "forward", value: SIDE_LENGTH });
      cmds.push({ type: "turn", value: INNER_ANGLE });
    }
    cmds.push({ type: "turn", value: OUTER_ANGLE });
  }
  return cmds;
}

const ALL_COMMANDS = buildAllCommands();

// Compute segments + final turtle state up to cmdIndex
function replayTurtle(commands: Cmd[], count: number, startX: number, startY: number) {
  const segs: Segment[] = [];
  let x = startX, y = startY, angle = -90; // start pointing up
  let totalSegs = 0;
  const totalForwards = commands.filter(c => c.type === "forward").length;

  for (let i = 0; i < count && i < commands.length; i++) {
    const cmd = commands[i];
    if (cmd.type === "turn") {
      angle += cmd.value;
    } else {
      const rad = (angle * Math.PI) / 180;
      const nx = x + cmd.value * Math.cos(rad);
      const ny = y + cmd.value * Math.sin(rad);
      const hue = totalForwards > 0 ? (totalSegs / totalForwards) * 360 : 200;
      segs.push({ x1: x, y1: y, x2: nx, y2: ny, hue });
      x = nx;
      y = ny;
      totalSegs++;
    }
  }
  return { segs, x, y, angle };
}

// How many commands to execute for each phase at a given frame
function commandCountForFrame(frame: number): number {
  if (frame < P1_DRAW) return 0;

  // Phase 1: draw one line (commands 0: forward)
  if (frame < P1_END) {
    const p = Math.min(1, (frame - P1_DRAW) / (P1_END - P1_DRAW - 20));
    return p >= 1 ? 1 : 0;
  }

  // Phase 2: turn (commands 0: forward, 1: turn)
  if (frame < P2_END) {
    if (frame >= P2_DRAW) return 2;
    return 1;
  }

  // Phase 3: draw full square (4 sides = commands 0..8, i.e. 4×forward + 4×turn)
  if (frame < P3_END) {
    if (frame < P3_DRAW) return 2; // still showing just line+turn from before
    const squareCmds = SHAPE_SIDES * 2; // forward+turn per side
    const p = (frame - P3_DRAW) / (P3_END - P3_DRAW - 30);
    return Math.min(squareCmds, Math.max(2, Math.ceil(p * squareCmds)));
  }

  const squareCmds = SHAPE_SIDES * 2;

  // Phase 4: outer turn after square
  if (frame < P4_END) {
    if (frame >= P4_DRAW) return squareCmds + 1; // square + outer turn
    return squareCmds;
  }

  // Phase 5: build full pattern
  if (frame < P5_END) {
    if (frame < P5_DRAW) return squareCmds + 1;
    const totalCmds = ALL_COMMANDS.length;
    const p = (frame - P5_DRAW) / (P5_END - P5_DRAW - 15);
    return Math.min(totalCmds, Math.max(squareCmds + 1, Math.ceil(p * totalCmds)));
  }

  return ALL_COMMANDS.length;
}

// --- Canvas component ---
const TurtleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2 + 40;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Global fade
    const globalAlpha = frame >= HOLD_END
      ? interpolate(frame, [HOLD_END, FADE_END], [1, 0], { extrapolateRight: "clamp" })
      : frame <= 15
        ? interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" })
        : 1;

    if (globalAlpha <= 0) return;

    const cmdCount = commandCountForFrame(frame);
    const { segs, x: tx, y: ty, angle: ta } = replayTurtle(ALL_COMMANDS, cmdCount, cx, cy);

    // Draw trail
    for (const seg of segs) {
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.strokeStyle = segs.length <= 4
        ? BLUE
        : `hsl(${seg.hue}, 70%, 60%)`;
      ctx.lineWidth = segs.length <= 4 ? 2.5 : 1.5;
      ctx.globalAlpha = 0.8 * globalAlpha;
      ctx.stroke();
    }

    // Draw turtle cursor (triangle)
    if (cmdCount > 0 && cmdCount < ALL_COMMANDS.length) {
      const rad = (ta * Math.PI) / 180;
      const size = 12;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(rad);
      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(-size * 0.6, -size * 0.5);
      ctx.lineTo(-size * 0.6, size * 0.5);
      ctx.closePath();
      ctx.fillStyle = GOLD;
      ctx.globalAlpha = globalAlpha;
      ctx.fill();
      ctx.restore();
    }

    // Step counter during pattern build (phase 5)
    if (frame >= P5_DRAW && frame < P5_END) {
      const squaresDrawn = Math.floor(segs.length / SHAPE_SIDES);
      ctx.globalAlpha = 0.5 * globalAlpha;
      ctx.font = "bold 28px Inter, system-ui, sans-serif";
      ctx.fillStyle = SLATE_500;
      ctx.textAlign = "center";
      ctx.fillText(`${squaresDrawn} / ${PATTERN_COUNT}`, cx, CANVAS_H - 30);
    }

    ctx.globalAlpha = 1;
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

// --- Code phases ---
const CODE_PHASES: { startFrame: number; lines: string[] }[] = [
  {
    startFrame: P1_CODE,
    lines: [
      `forward(${SIDE_LENGTH})`,
    ],
  },
  {
    startFrame: P2_CODE,
    lines: [
      `right(${INNER_ANGLE})`,
    ],
  },
  {
    startFrame: P3_CODE,
    lines: [
      ``,
      `// draw a square`,
      `for (let i = 0; i < ${SHAPE_SIDES}; i++) {`,
      `  forward(${SIDE_LENGTH})`,
      `  right(${INNER_ANGLE})`,
      `}`,
    ],
  },
  {
    startFrame: P4_CODE,
    lines: [
      ``,
      `right(${OUTER_ANGLE})  // then turn`,
    ],
  },
  {
    startFrame: P5_CODE,
    lines: [
      ``,
      `// repeat ${PATTERN_COUNT} times`,
      `for (let j = 0; j < ${PATTERN_COUNT}; j++) {`,
      `  drawSquare()`,
      `  right(${OUTER_ANGLE})`,
      `}`,
      ``,
      `// 360 / ${OUTER_ANGLE} = ${PATTERN_COUNT} squares`,
    ],
  },
];

const TurtleCode: React.FC = () => {
  const frame = useCurrentFrame();

  const globalFade = frame >= HOLD_END
    ? interpolate(frame, [HOLD_END, FADE_END], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  // Collect all visible lines
  const visibleLines: { line: string; startFrame: number }[] = [];
  let lineIndex = 0;
  for (const phase of CODE_PHASES) {
    if (frame < phase.startFrame) break;
    for (const line of phase.lines) {
      visibleLines.push({ line, startFrame: phase.startFrame + lineIndex * 3 });
      lineIndex++;
    }
  }

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
        fontSize: 26,
        lineHeight: 1.7,
        whiteSpace: "pre",
        opacity: globalFade,
      }}
    >
      {visibleLines.map(({ line, startFrame: ls }, i) => {
        const lineOpacity = interpolate(
          frame,
          [ls, ls + 10],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const lineY = interpolate(
          frame,
          [ls, ls + 10],
          [6, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        return (
          <div
            key={i}
            style={{ opacity: lineOpacity, transform: `translateY(${lineY}px)` }}
          >
            {colorLine(line)}
          </div>
        );
      })}
    </div>
  );
};

// --- Phase hints ---
function getPhaseHint(frame: number): string {
  if (frame >= P1_DRAW && frame < P1_END) return "draw a line...";
  if (frame >= P2_DRAW && frame < P2_END) return "now turn...";
  if (frame >= P3_DRAW && frame < P3_END) return "repeat → square!";
  if (frame >= P4_DRAW && frame < P4_END) return "turn a little more...";
  if (frame >= P5_DRAW && frame < P5_END) return "and repeat everything!";
  return "";
}

// --- Main composition ---
export const TurtleBuildReel: React.FC = () => {
  const frame = useCurrentFrame();

  const globalFade = frame >= HOLD_END
    ? interpolate(frame, [HOLD_END, FADE_END], [1, 0], { extrapolateRight: "clamp" })
    : frame <= 15
      ? interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" })
      : 1;

  const hint = getPhaseHint(frame);

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      {/* Animation area — top 55% */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "55%",
        }}
      >
        <TurtleCanvas />
      </div>

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 60,
          right: 60,
          opacity: globalFade,
        }}
      >
        <div
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 28,
            fontWeight: 500,
            color: GOLD,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Perceptum
        </div>
        <div
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 48,
            fontWeight: 700,
            color: "white",
            lineHeight: 1.2,
          }}
        >
          Van lijn → naar patroon
        </div>
      </div>

      {/* Phase hint */}
      {hint && (
        <div
          style={{
            position: "absolute",
            top: "53%",
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 26,
            fontStyle: "italic",
            color: GOLD,
            opacity: 0.8 * globalFade,
          }}
        >
          {hint}
        </div>
      )}

      {/* Divider */}
      <div
        style={{
          position: "absolute",
          top: "56%",
          left: 60,
          right: 60,
          height: 2,
          backgroundColor: BLUE,
          opacity: 0.3 * globalFade,
        }}
      />

      {/* Code area — bottom 44% */}
      <div
        style={{
          position: "absolute",
          top: "57%",
          left: 0,
          right: 0,
          bottom: 80,
          padding: "24px 50px",
          overflow: "hidden",
        }}
      >
        <TurtleCode />
      </div>

      {/* Watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 22,
          color: SLATE_500,
          opacity: 0.5 * globalFade,
        }}
      >
        perceptum.nl/animaties
      </div>
    </AbsoluteFill>
  );
};

export const TURTLE_BUILD_DURATION = TOTAL;
