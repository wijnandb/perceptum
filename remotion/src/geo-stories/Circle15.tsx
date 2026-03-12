import React from "react";
import { StoryReelTemplate } from "../StoryReelTemplate";
import { circle } from "../figures";
import type { GeoStoryConfig } from "../StoryReelTemplate";

const config: GeoStoryConfig = {
  figureName: "Cirkel",
  angle: 15,
  drawFn: circle,
  code: `function drawCircle(r) {
  ctx.arc(r/2, 0, r/2, 0, Math.PI * 2);
  ctx.stroke();
}

drawCircle(200);
// ---
for (let i = 0; i < 24; i++) {
  ctx.rotate(15 * Math.PI / 180);
  drawCircle(200);
}

// 360 / 15 = 24 circles → flower`,
};

export const GeoStoryCircle15: React.FC = () => (
  <StoryReelTemplate config={config} />
);
