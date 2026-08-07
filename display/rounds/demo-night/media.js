const image = (filename, alt) => ({
  src: new URL(`../../../media/images/${filename}`, import.meta.url).href,
  alt,
});

const video = (filename) => ({
  src: new URL(`../../../media/video/${filename}`, import.meta.url).href,
  type: "video",
});

export const demoNightDisplayMedia = {
  "demo-mcq-title": image(
    "demo-mcq-title.png",
    "BBQ-MCQ title artwork with a glowing quiz podium",
  ),
  "demo-fastest-title": image(
    "demo-fastest-title.png",
    "Fastest Free Text title artwork with racing barbecue utensils",
  ),
  "demo-best-title": image(
    "demo-best-title.png",
    "Best Free Text title artwork with a golden speech bubble",
  ),
  "demo-definition-title": image(
    "demo-definition-title.png",
    "My Definition title artwork with a mysterious illuminated dictionary",
  ),
  "demo-closest-title": image(
    "demo-closest-title.png",
    "Closest Wins title artwork with a glowing target and measuring marks",
  ),
  "csi-koonoomoo-title": image(
    "csi-koonoomoo-title.png",
    "CSI Koonoomoo title artwork",
  ),
  "sipping-point-title": image(
    "sipping-point-title.png",
    "Sipping Point title artwork",
  ),
  "googlebel-title": image(
    "googlebel-title.png",
    "Googlebel television round title artwork",
  ),
  "thank-god-youre-lyrics-title": image(
    "thank-god-youre-lyrics-title.png",
    "Thank God You’re Lyrics title artwork",
  ),
  "googlebel-oc-video": video("OC stop at 44.8s.mp4"),
  "googlebel-got-video": video("Game of throne end at 13.5s.mp4"),
  "googlebel-fleabag-video": video("fleabag stop at 48.6s.mp4"),
  "lyrics-teenage-dirtbag-video": video("teenage dirtbag.mp4"),
  "lyrics-torn-video": video("torn.mp4"),
  "lyrics-no-aphrodisiac-video": video("no aphrodisiac.mp4"),
  "lyrics-gangstas-paradise-video": video("ganstas paradise.mp4"),
};
