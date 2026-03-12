import React, { useRef, useEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

interface Segment {
  x1: number; y1: number;
  x2: number; y2: number;
}

type Cmd = { type: "forward" | "turn"; value: number };

function computeSegments(commands: Cmd[], startX: number, startY: number, startAngle: number): Segment[] {
  const segs: Segment[] = [];
  let x = startX, y = startY, angle = startAngle;
  for (const cmd of commands) {
    if (cmd.type === "turn") {
      angle += cmd.value;
    } else {
      const nx = x + cmd.value * Math.cos(angle);
      const ny = y + cmd.value * Math.sin(angle);
      segs.push({ x1: x, y1: y, x2: nx, y2: ny });
      x = nx;
      y = ny;
    }
  }
  return segs;
}

function treeCommands(depth: number, length: number, angle: number): Cmd[] {
  if (depth === 0) return [{ type: "forward", value: length }];
  const cmds: Cmd[] = [];
  cmds.push({ type: "forward", value: length });
  cmds.push({ type: "turn", value: -angle });
  cmds.push(...treeCommands(depth - 1, length * 0.67, angle));
  cmds.push({ type: "turn", value: 2 * angle });
  cmds.push(...treeCommands(depth - 1, length * 0.67, angle));
  cmds.push({ type: "turn", value: -angle });
  cmds.push({ type: "turn", value: Math.PI });
  cmds.push({ type: "forward", value: length });
  cmds.push({ type: "turn", value: Math.PI });
  return cmds;
}

function kochSide(depth: number, length: number): Cmd[] {
  if (depth === 0) return [{ type: "forward", value: length }];
  const l = length / 3;
  return [
    ...kochSide(depth - 1, l),
    { type: "turn", value: -Math.PI / 3 },
    ...kochSide(depth - 1, l),
    { type: "turn", value: (2 * Math.PI) / 3 },
    ...kochSide(depth - 1, l),
    { type: "turn", value: -Math.PI / 3 },
    ...kochSide(depth - 1, l),
  ];
}

function snowflakeCommands(depth: number, sideLength: number): Cmd[] {
  const cmds: Cmd[] = [];
  for (let i = 0; i < 3; i++) {
    cmds.push(...kochSide(depth, sideLength));
    cmds.push({ type: "turn", value: (2 * Math.PI) / 3 });
  }
  return cmds;
}

function dragonCommands(depth: number, length: number): Cmd[] {
  if (depth === 0) return [{ type: "forward", value: length }];
  const sub = dragonCommands(depth - 1, length);
  const reversed = [...sub].reverse().map((c) => {
    if (c.type === "turn") return { type: "turn" as const, value: -c.value };
    return { ...c };
  });
  return [...sub, { type: "turn", value: -Math.PI / 2 }, ...reversed];
}

interface Pattern {
  name: string;
  getSegments: () => Segment[];
}

const scale = Math.min(CANVAS_W, CANVAS_H) / 700;

const patternDefs: Pattern[] = [
  {
    name: "Fractal Tree",
    getSegments() {
      const cmds = treeCommands(8, 60 * scale, Math.PI / 7);
      return computeSegments(cmds, CANVAS_W / 2, CANVAS_H * 0.78, -Math.PI / 2);
    },
  },
  {
    name: "Koch Snowflake",
    getSegments() {
      const side = 280 * scale;
      const cmds = snowflakeCommands(4, side);
      const startX = CANVAS_W / 2 - side / 2;
      const startY = CANVAS_H / 2 - side * 0.15;
      return computeSegments(cmds, startX, startY, 0);
    },
  },
  {
    name: "Dragon Curve",
    getSegments() {
      const cmds = dragonCommands(12, 4 * scale);
      return computeSegments(cmds, CANVAS_W / 2 - 50 * scale, CANVAS_H / 2 + 50 * scale, 0);
    },
  },
];

// Pre-compute all pattern segments once
const allPatterns = patternDefs.map((p) => p.getSegments());

const TurtleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ~5s draw + 1s pause per pattern = 6s each, 3 patterns = 18s total
    const drawFrames = Math.round(fps * 5);
    const pauseFrames = Math.round(fps * 1);
    const cycleFrames = drawFrames + pauseFrames;
    const totalPatterns = allPatterns.length;

    const patternIndex = Math.min(
      Math.floor(frame / cycleFrames),
      totalPatterns - 1
    );
    const localFrame = frame - patternIndex * cycleFrames;
    const segments = allPatterns[patternIndex];

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // How many segments to show
    const segsPerFrame = Math.max(2, Math.floor(segments.length / drawFrames));
    const drawIndex = Math.min(
      localFrame < drawFrames ? localFrame * segsPerFrame : segments.length,
      segments.length
    );

    // Draw segments
    for (let i = 0; i < drawIndex; i++) {
      const seg = segments[i];
      const segAlpha =
        Math.min((i / Math.max(drawIndex, 1)) * 0.8 + 0.2, 1);
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.strokeStyle = `rgba(59, 130, 246, ${segAlpha * 0.7})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw turtle cursor
    if (localFrame < drawFrames && drawIndex > 0 && drawIndex < segments.length) {
      const seg = segments[drawIndex - 1];
      const angle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
      const size = 6;
      ctx.save();
      ctx.translate(seg.x2, seg.y2);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(-size * 0.6, -size * 0.5);
      ctx.lineTo(-size * 0.6, size * 0.5);
      ctx.closePath();
      ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
      ctx.fill();
      ctx.restore();
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

const CODE_SNIPPET = `function turtle(commands) {
  for (const cmd of commands) {
    if (cmd.type === 'turn') {
      angle += cmd.value;
    } else {
      const nx = x + cmd.value * cos(angle);
      const ny = y + cmd.value * sin(angle);
      line(x, y, nx, ny);
      x = nx; y = ny;
    }
  }
}`;

export const TurtleReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Turtle Graphics"
      subtitle="forward(n), turn(angle), repeat"
      codeString={CODE_SNIPPET}
    >
      <TurtleCanvas />
    </ReelTemplate>
  );
};
