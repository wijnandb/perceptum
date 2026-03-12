import React from "react";
import { StoryReelTemplate } from "../StoryReelTemplate";
import { line } from "../figures";
import type { GeoStoryConfig } from "../StoryReelTemplate";

const config: GeoStoryConfig = {
  figureName: "Lijn",
  angle: 5,
  drawFn: line,
  code: `function drawLine(length) {
  ctx.moveTo(-length, 0);
  ctx.lineTo(length, 0);
  ctx.stroke();
}

drawLine(200);
// ---
for (let i = 0; i < 72; i++) {
  ctx.rotate(5 * Math.PI / 180);
  drawLine(200);
}

// 360 / 5 = 72 → starburst`,
};

export const GeoStoryLine5: React.FC = () => (
  <StoryReelTemplate config={config} />
);
