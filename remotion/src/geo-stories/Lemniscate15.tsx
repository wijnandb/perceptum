import React from "react";
import { StoryReelTemplate } from "../StoryReelTemplate";
import { lemniscate } from "../figures";
import type { GeoStoryConfig } from "../StoryReelTemplate";

const config: GeoStoryConfig = {
  figureName: "Lemniscaat",
  angle: 15,
  drawFn: lemniscate,
  code: `function drawLemniscate(r) {
  for (let t = 0; t < 2*PI; t += 0.08) {
    let d = 1 + sin(t) * sin(t);
    ctx.lineTo(r*cos(t)/d,
               r*sin(t)*cos(t)/d);
  }
}
// ---
for (let i = 0; i < 24; i++) {
  ctx.rotate(15 * Math.PI / 180);
  drawLemniscate(200);
}

// 360 / 15 = 24 figure-eights`,
};

export const GeoStoryLemniscate15: React.FC = () => (
  <StoryReelTemplate config={config} />
);
