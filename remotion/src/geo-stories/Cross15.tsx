import React from "react";
import { StoryReelTemplate } from "../StoryReelTemplate";
import { cross } from "../figures";
import type { GeoStoryConfig } from "../StoryReelTemplate";

const config: GeoStoryConfig = {
  figureName: "Kruis",
  angle: 15,
  drawFn: cross,
  code: `function drawCross(r) {
  let w = r * 0.2;
  ctx.moveTo(-w, -r);
  ctx.lineTo(w, -r);
  ctx.lineTo(w, -w);
  ctx.lineTo(r, -w);
  // ... 12 vertices total
}
// ---
for (let i = 0; i < 24; i++) {
  ctx.rotate(15 * Math.PI / 180);
  drawCross(200);
}

// 360 / 15 = 24 → woven lattice`,
};

export const GeoStoryCross15: React.FC = () => (
  <StoryReelTemplate config={config} />
);
