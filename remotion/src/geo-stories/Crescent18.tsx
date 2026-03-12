import React from "react";
import { StoryReelTemplate } from "../StoryReelTemplate";
import { crescent } from "../figures";
import type { GeoStoryConfig } from "../StoryReelTemplate";

const config: GeoStoryConfig = {
  figureName: "Halve Maan",
  angle: 18,
  drawFn: crescent,
  code: `function drawCrescent(r) {
  ctx.arc(0, 0, r, -0.4*PI, 0.4*PI);
  ctx.arc(r*0.3, 0, r*0.75,
          0.35*PI, -0.35*PI, true);
}

drawCrescent(200);
// ---
for (let i = 0; i < 20; i++) {
  ctx.rotate(18 * Math.PI / 180);
  drawCrescent(200);
}

// 360 / 18 = 20 → Islamic art`,
};

export const GeoStoryCrescent18: React.FC = () => (
  <StoryReelTemplate config={config} />
);
