import React from "react";
import { StoryReelTemplate } from "../StoryReelTemplate";
import { polygon } from "../figures";
import type { GeoStoryConfig } from "../StoryReelTemplate";

const config: GeoStoryConfig = {
  figureName: "Driehoek",
  angle: 12,
  drawFn: polygon(3),
  code: `function drawTriangle(r) {
  for (let i = 0; i < 3; i++) {
    let a = (2 * Math.PI * i) / 3;
    ctx.lineTo(r * Math.cos(a),
               r * Math.sin(a));
  }
  ctx.closePath();
}
// ---
for (let i = 0; i < 30; i++) {
  ctx.rotate(12 * Math.PI / 180);
  drawTriangle(200);
}

// 360 / 12 = 30 triangles`,
};

export const GeoStoryTriangle12: React.FC = () => (
  <StoryReelTemplate config={config} />
);
