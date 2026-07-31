import { spellingBeeDisplayMedia } from "./rounds/spelling-bee/media.js";
import { charadesDisplayMedia } from "./rounds/charades/media.js";
import { demoNightDisplayMedia } from "./rounds/demo-night/media.js";

const mediaLibrary = {
  "placeholder-animal": {
    src: new URL("../media/images/placeholder-animal.svg", import.meta.url).href,
    alt: "An illustrated grey koala among eucalyptus leaves",
  },
  ...spellingBeeDisplayMedia,
  ...charadesDisplayMedia,
  ...demoNightDisplayMedia,
};

export function resolveDisplayMedia(media) {
  if (!media) return undefined;
  const local = mediaLibrary[media.id];
  return local ? { ...media, ...local } : undefined;
}
