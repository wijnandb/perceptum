import React from "react";
import { StoryReelTemplate } from "../StoryReelTemplate";
import { star } from "../figures";
import type { GeoStoryConfig } from "../StoryReelTemplate";

const config: GeoStoryConfig = {
  figureName: "Ster",
  angle: 9,
  drawFn: star,
  code: `function drawStar(r) {
  for (let i = 0; i < 10; i++) {
    let radius = i % 2 === 0 ? r : r * 0.4;
    ctx.lineTo(radius * Math.cos(a),
               radius * Math.sin(a));
  }
}
// ---
for (let i = 0; i < 40; i++) {
  ctx.rotate(9 * Math.PI / 180);
  drawStar(200);
}

// 360 / 9 = 40 stars → mandala`,
};

export const GeoStoryStar9: React.FC = () => (
  <StoryReelTemplate config={config} />
);
