import { Composition } from "remotion";
import { DURATION, Promo } from "./Promo";
import { FPS } from "./theme";

export function Root() {
  return (
    <>
      <Composition id="Square" component={Promo} durationInFrames={DURATION} fps={FPS} width={1080} height={1080} />
      <Composition id="Wide" component={Promo} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
    </>
  );
}
