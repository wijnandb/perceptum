import React from "react";
import { StoryReelTemplate } from "../StoryReelTemplate";
import { polygon } from "../figures";
import type { GeoStoryConfig } from "../StoryReelTemplate";

const config: GeoStoryConfig = {
  figureName: "Vijfhoek",
  angle: 12,
  drawFn: polygon(5),
  code: `function drawPentagon(r) {
  for (let i = 0; i < 5; i++) {
    let a = (2 * Math.PI * i) / 5;
    ctx.lineTo(r * Math.cos(a),
               r * Math.sin(a));
  }
}
// ---
for (let i = 0; i < 30; i++) {
  ctx.rotate(12 * Math.PI / 180);
  drawPentagon(200);
}

// 360 / 12 = 30 pentagons`,
};

export const GeoStoryPentagon12: React.FC = () => (
  <StoryReelTemplate config={config} />
);
