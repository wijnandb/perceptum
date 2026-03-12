import React from "react";
import { Composition } from "remotion";
import { SierpinskiReel } from "./animations/Sierpinski";
import { LissajousReel } from "./animations/Lissajous";
import { VoronoiReel } from "./animations/Voronoi";
import { LorenzReel } from "./animations/Lorenz";
import { FibonacciReel } from "./animations/Fibonacci";
import { FourierReel } from "./animations/Fourier";
import { ReactionDiffusionReel } from "./animations/ReactionDiffusion";
import { StrangeAttractorReel } from "./animations/StrangeAttractor";
import { SpirographReel } from "./animations/Spirograph";
import { KaleidoscopeReel } from "./animations/Kaleidoscope";
import { TurtleReel } from "./animations/Turtle";
import { BouncingBallsReel } from "./animations/BouncingBalls";
import { PendulumWaveReel } from "./animations/PendulumWave";
import { FlockingReel } from "./animations/Flocking";
import { GravitySlingshotReel } from "./animations/GravitySlingshot";
import { FractalTreeReel } from "./animations/FractalTree";
import { RainReel } from "./animations/Rain";
import { MazeReel } from "./animations/Maze";
import { SortingReel } from "./animations/Sorting";
import { GeometricSpirographReel } from "./animations/GeometricSpirograph";
import { GeoStorySquare10 } from "./geo-stories/Square10";
import { GeoStoryCircle15 } from "./geo-stories/Circle15";
import { GeoStoryTriangle12 } from "./geo-stories/Triangle12";
import { GeoStoryStar9 } from "./geo-stories/Star9";
import { GeoStoryEllipse12 } from "./geo-stories/Ellipse12";
import { GeoStoryCrescent18 } from "./geo-stories/Crescent18";
import { GeoStoryLine5 } from "./geo-stories/Line5";
import { GeoStoryLemniscate15 } from "./geo-stories/Lemniscate15";
import { GeoStoryPentagon12 } from "./geo-stories/Pentagon12";
import { GeoStoryCross15 } from "./geo-stories/Cross15";
import { TurtleBuildReel, TURTLE_BUILD_DURATION } from "./animations/TurtleBuild";
import { STORY_REEL_DURATION } from "./StoryReelTemplate";

const FPS = 30;
const DURATION = FPS * 18; // 18 seconds per reel
const STORY_DURATION = STORY_REEL_DURATION; // 15 seconds, loopable
const WIDTH = 1080;
const HEIGHT = 1920;

const reels = [
  { id: "SierpinskiReel", component: SierpinskiReel },
  { id: "LissajousReel", component: LissajousReel },
  { id: "VoronoiReel", component: VoronoiReel },
  { id: "LorenzReel", component: LorenzReel },
  { id: "FibonacciReel", component: FibonacciReel },
  { id: "FourierReel", component: FourierReel },
  { id: "ReactionDiffusionReel", component: ReactionDiffusionReel },
  { id: "StrangeAttractorReel", component: StrangeAttractorReel },
  { id: "SpirographReel", component: SpirographReel },
  { id: "KaleidoscopeReel", component: KaleidoscopeReel },
  { id: "TurtleReel", component: TurtleReel },
  { id: "BouncingBallsReel", component: BouncingBallsReel },
  { id: "PendulumWaveReel", component: PendulumWaveReel },
  { id: "FlockingReel", component: FlockingReel },
  { id: "GravitySlingshotReel", component: GravitySlingshotReel },
  { id: "FractalTreeReel", component: FractalTreeReel },
  { id: "RainReel", component: RainReel },
  { id: "MazeReel", component: MazeReel },
  { id: "SortingReel", component: SortingReel },
  { id: "GeometricSpirographReel", component: GeometricSpirographReel },
];

const storyReels = [
  { id: "GeoStory-Square-10", component: GeoStorySquare10 },
  { id: "GeoStory-Circle-15", component: GeoStoryCircle15 },
  { id: "GeoStory-Triangle-12", component: GeoStoryTriangle12 },
  { id: "GeoStory-Star-9", component: GeoStoryStar9 },
  { id: "GeoStory-Ellipse-12", component: GeoStoryEllipse12 },
  { id: "GeoStory-Crescent-18", component: GeoStoryCrescent18 },
  { id: "GeoStory-Line-5", component: GeoStoryLine5 },
  { id: "GeoStory-Lemniscate-15", component: GeoStoryLemniscate15 },
  { id: "GeoStory-Pentagon-12", component: GeoStoryPentagon12 },
  { id: "GeoStory-Cross-15", component: GeoStoryCross15 },
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {reels.map(({ id, component }) => (
        <Composition
          key={id}
          id={id}
          component={component}
          durationInFrames={DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      ))}
      <Composition
          id="TurtleBuildReel"
          component={TurtleBuildReel}
          durationInFrames={TURTLE_BUILD_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      {storyReels.map(({ id, component }) => (
        <Composition
          key={id}
          id={id}
          component={component}
          durationInFrames={STORY_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      ))}
    </>
  );
};
