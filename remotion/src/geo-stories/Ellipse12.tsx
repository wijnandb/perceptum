import React from "react";
import { StoryReelTemplate } from "../StoryReelTemplate";
import { ellipse } from "../figures";
import type { GeoStoryConfig } from "../StoryReelTemplate";

const config: GeoStoryConfig = {
  figureName: "Ellips",
  angle: 12,
  drawFn: ellipse,
  code: `function drawEllipse(rx, ry) {
  ctx.ellipse(0, 0, rx, ry, 0, 0,
              Math.PI * 2);
  ctx.stroke();
}

drawEllipse(200, 80);
// ---
for (let i = 0; i < 30; i++) {
  ctx.rotate(12 * Math.PI / 180);
  drawEllipse(200, 80);
}

// 360 / 12 = 30 ellipses → roos`,
};

export const GeoStoryEllipse12: React.FC = () => (
  <StoryReelTemplate config={config} />
);
