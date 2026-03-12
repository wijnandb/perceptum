import React, { useRef, useEffect } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import type { DrawFn } from "./figures";

// --- Timing constants (frames at 30fps) ---
const ACT1_END = 60;       // 0-2s: single shape + simple code
const ACT2_START = 60;     // 2s: code transforms
const ACT2_END = 120;      // 2-4s: code transition + first few copies
const BUILD_END = 360;     // 4-12s: pattern builds step by step
const HOLD_END = 420;      // 12-14s: hold completed pattern
const FADE_END = 450;      // 14-15s: fade to navy for seamless loop
const TOTAL = 450;         // 15s total

// --- Colors ---
const NAVY = "#0f172a";
const GOLD = "#fbbf24";
const SLATE_300 = "#cbd5e1";
const SLATE_500 = "#64748b";
const BLUE = "#3b82f6";

// --- Syntax coloring (simple, video-quality) ---
const C_KEYWORD = "#c084fc";
const C_FUNC = "#60a5fa";
const C_NUMBER = "#fbbf24";
const C_STRING = "#86efac";
const C_COMMENT = "#64748b";
const C_TEXT = "#e2e8f0";
const C_PUNC = "#94a3b8";

function colorLine(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const patterns: [RegExp, string][] = [
    [/^(\/\/.*)/, C_COMMENT],
    [/\b(for|let|const|function|return|of)\b/, C_KEYWORD],
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

// --- Canvas dimensions ---
const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.55); // slightly less to give code more room

export interface GeoStoryConfig {
  figureName: string;       // e.g. "Vierkant", "Cirkel"
  angle: number;            // rotation degrees (360 % angle === 0)
  drawFn: DrawFn;           // from figures.ts
  code: string;             // full code with "// ---" marker separating act 1 / act 2
}

// --- The canvas that draws the animation ---
const StoryCanvas: React.FC<{ config: GeoStoryConfig }> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2 + 40;
    const radius = Math.min(CANVAS_W, CANVAS_H) * 0.28;
    const totalSteps = 360 / config.angle;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Global fade for seamless loop
    const globalAlpha = frame >= HOLD_END
      ? interpolate(frame, [HOLD_END, FADE_END], [1, 0], { extrapolateRight: "clamp" })
      : frame <= 15
        ? interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" })
        : 1;

    if (globalAlpha <= 0) return;

    // Determine how many rotated copies to show
    let stepsToShow = 0;

    if (frame < ACT1_END) {
      // Act 1: just one shape
      stepsToShow = 1;
    } else if (frame < ACT2_END) {
      // Act 2: transition — show 1-3 copies appearing
      const progress = (frame - ACT2_START) / (ACT2_END - ACT2_START);
      stepsToShow = Math.max(1, Math.floor(progress * 4));
    } else if (frame < BUILD_END) {
      // Act 3: build the rest step by step
      const buildProgress = (frame - ACT2_END) / (BUILD_END - ACT2_END);
      stepsToShow = Math.min(totalSteps, Math.floor(3 + buildProgress * (totalSteps - 3)));
    } else {
      // Hold / fade
      stepsToShow = totalSteps;
    }

    stepsToShow = Math.min(stepsToShow, totalSteps);

    // Draw each rotated copy
    for (let i = 0; i < stepsToShow; i++) {
      const rotation = (i * config.angle * Math.PI) / 180;
      const hue = (i / totalSteps) * 360;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.globalAlpha = 0.7 * globalAlpha;
      ctx.strokeStyle = stepsToShow === 1
        ? BLUE  // Act 1: single blue shape
        : `hsl(${hue}, 70%, 60%)`;
      ctx.lineWidth = stepsToShow === 1 ? 2.5 : 1.8;
      config.drawFn(ctx, radius);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Step counter during build phase
    if (frame >= ACT2_END && frame < BUILD_END) {
      ctx.globalAlpha = 0.5 * globalAlpha;
      ctx.font = "bold 28px Inter, system-ui, sans-serif";
      ctx.fillStyle = SLATE_500;
      ctx.textAlign = "center";
      ctx.fillText(`${stepsToShow} / ${totalSteps}`, cx, CANVAS_H - 30);
      ctx.globalAlpha = 1;
    }
  }, [frame, config]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

// --- The evolving code display (additive — act 1 stays, act 2 grows below) ---
const EvolvingCode: React.FC<{
  code: string;
}> = ({ code }) => {
  const frame = useCurrentFrame();

  // Split on "// ---" marker
  const parts = code.split("// ---");
  const act1Lines = parts[0].trimEnd().split("\n");
  const act2Lines = parts.length > 1 ? parts[1].trimStart().split("\n") : [];

  // Global fade
  const globalFade = frame >= HOLD_END
    ? interpolate(frame, [HOLD_END, FADE_END], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
        fontSize: 24,
        lineHeight: 1.7,
        whiteSpace: "pre",
        opacity: globalFade,
      }}
    >
      {/* Act 1 lines — appear at start, stay visible */}
      {act1Lines.map((line, i) => {
        const lineStart = 15 + i * 3;
        const lineOpacity = interpolate(
          frame,
          [lineStart, lineStart + 10],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const lineY = interpolate(
          frame,
          [lineStart, lineStart + 10],
          [6, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        return (
          <div
            key={`a-${i}`}
            style={{ opacity: lineOpacity, transform: `translateY(${lineY}px)` }}
          >
            {colorLine(line)}
          </div>
        );
      })}

      {/* Act 2 lines — appear at ACT2_START, growing below act 1 */}
      {act2Lines.map((line, i) => {
        const lineStart = ACT2_START + i * 3;
        const lineOpacity = interpolate(
          frame,
          [lineStart, lineStart + 10],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const lineY = interpolate(
          frame,
          [lineStart, lineStart + 10],
          [8, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        return (
          <div
            key={`b-${i}`}
            style={{ opacity: lineOpacity, transform: `translateY(${lineY}px)` }}
          >
            {colorLine(line)}
          </div>
        );
      })}
    </div>
  );
};

// --- Main story template ---
export const StoryReelTemplate: React.FC<{ config: GeoStoryConfig }> = ({
  config,
}) => {
  const frame = useCurrentFrame();

  const globalFade = frame >= HOLD_END
    ? interpolate(frame, [HOLD_END, FADE_END], [1, 0], { extrapolateRight: "clamp" })
    : frame <= 15
      ? interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" })
      : 1;

  // Act indicator
  const actLabel = frame < ACT2_START
    ? ""
    : frame < ACT2_END
      ? "now add a loop..."
      : "";

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
        <StoryCanvas config={config} />
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
          {config.figureName} · {config.angle}°
        </div>
      </div>

      {/* Act transition hint */}
      {actLabel && (
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
            opacity: interpolate(frame, [ACT2_START, ACT2_START + 15, ACT2_END - 10, ACT2_END], [0, 0.8, 0.8, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {actLabel}
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
        <EvolvingCode code={config.code} />
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

export { TOTAL as STORY_REEL_DURATION };
