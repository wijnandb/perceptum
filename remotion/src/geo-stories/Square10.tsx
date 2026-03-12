import React from "react";
import { StoryReelTemplate } from "../StoryReelTemplate";
import { polygon } from "../figures";
import type { GeoStoryConfig } from "../StoryReelTemplate";

const config: GeoStoryConfig = {
  figureName: "Vierkant",
  angle: 10,
  drawFn: polygon(4),
  code: `function drawSquare(size) {
  ctx.rect(-size/2, -size/2, size, size);
  ctx.stroke();
}

drawSquare(200);
// ---
for (let i = 0; i < 36; i++) {
  ctx.rotate(10 * Math.PI / 180);
  drawSquare(200);
}

// 360 / 10 = 36 squares`,
};

export const GeoStorySquare10: React.FC = () => (
  <StoryReelTemplate config={config} />
);
