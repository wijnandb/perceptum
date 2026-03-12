import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

interface CodeRevealProps {
  codeString: string;
}

const KEYWORD_COLOR = "#c084fc";  // purple
const STRING_COLOR = "#86efac";   // green
const NUMBER_COLOR = "#fbbf24";   // gold
const COMMENT_COLOR = "#64748b";  // slate
const FUNC_COLOR = "#60a5fa";     // blue
const TEXT_COLOR = "#e2e8f0";     // light slate
const PUNC_COLOR = "#94a3b8";     // medium slate

// Simple syntax colorizer — enough for video, no heavy deps
function colorize(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const patterns: [RegExp, string][] = [
    [/^(\/\/.*)/, COMMENT_COLOR],
    [/\b(function|const|let|var|if|else|for|return|new|import|from|export)\b/, KEYWORD_COLOR],
    [/\b(\d+\.?\d*)\b/, NUMBER_COLOR],
    [/('[^']*'|"[^"]*"|`[^`]*`)/, STRING_COLOR],
    [/\b([a-zA-Z_]\w*)\s*(?=\()/, FUNC_COLOR],
  ];

  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    let earliest: { index: number; length: number; color: string } | null = null;

    for (const [pattern, color] of patterns) {
      const match = remaining.match(pattern);
      if (match && match.index !== undefined) {
        if (!earliest || match.index < earliest.index) {
          earliest = { index: match.index, length: match[0].length, color };
        }
      }
    }

    if (earliest && earliest.index < remaining.length) {
      if (earliest.index > 0) {
        tokens.push(
          <span key={key++} style={{ color: TEXT_COLOR }}>
            {remaining.slice(0, earliest.index)}
          </span>
        );
      }
      tokens.push(
        <span key={key++} style={{ color: earliest.color }}>
          {remaining.slice(earliest.index, earliest.index + earliest.length)}
        </span>
      );
      remaining = remaining.slice(earliest.index + earliest.length);
    } else {
      tokens.push(
        <span key={key++} style={{ color: TEXT_COLOR }}>
          {remaining}
        </span>
      );
      break;
    }
  }

  return tokens;
}

export const CodeReveal: React.FC<CodeRevealProps> = ({ codeString }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = codeString.split("\n");

  // Code starts appearing after 6 seconds (animation has built up by then)
  const codeStartFrame = fps * 6;
  // Each line appears over ~3 frames
  const framesPerLine = 3;

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
        fontSize: 22,
        lineHeight: 1.6,
        whiteSpace: "pre",
        overflow: "hidden",
      }}
    >
      {lines.map((line, i) => {
        const lineFrame = codeStartFrame + i * framesPerLine;
        const opacity = interpolate(
          frame,
          [lineFrame, lineFrame + fps * 0.3],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const translateY = interpolate(
          frame,
          [lineFrame, lineFrame + fps * 0.3],
          [8, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        return (
          <div
            key={i}
            style={{
              opacity,
              transform: `translateY(${translateY}px)`,
            }}
          >
            {colorize(line)}
          </div>
        );
      })}
    </div>
  );
};
