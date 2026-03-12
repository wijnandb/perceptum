import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { CodeReveal } from "./CodeReveal";

interface ReelTemplateProps {
  title: string;
  subtitle?: string;
  codeString: string;
  children: React.ReactNode; // The animation component
}

const NAVY = "#0f172a";
const BLUE = "#3b82f6";
const GOLD = "#fbbf24";
const SLATE_300 = "#cbd5e1";
const SLATE_500 = "#64748b";

export const ReelTemplate: React.FC<ReelTemplateProps> = ({
  title,
  subtitle,
  codeString,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Title fades in over first 0.5s
  const titleOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Fade out in the last second
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fps, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      {/* Animation area — top 60% */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "60%",
          opacity: fadeOut,
        }}
      >
        {children}
      </div>

      {/* Title overlay */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 60,
          right: 60,
          opacity: titleOpacity * fadeOut,
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
            fontSize: 52,
            fontWeight: 700,
            color: "white",
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 28,
              color: SLATE_300,
              marginTop: 8,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Divider line */}
      <div
        style={{
          position: "absolute",
          top: "60%",
          left: 60,
          right: 60,
          height: 2,
          backgroundColor: BLUE,
          opacity: 0.4 * fadeOut,
        }}
      />

      {/* Code area — bottom 40% */}
      <div
        style={{
          position: "absolute",
          top: "61%",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "30px 50px",
          opacity: fadeOut,
        }}
      >
        <CodeReveal codeString={codeString} />
      </div>

      {/* Bottom watermark */}
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
          opacity: 0.6 * fadeOut,
        }}
      >
        perceptum.nl/animaties
      </div>
    </AbsoluteFill>
  );
};
