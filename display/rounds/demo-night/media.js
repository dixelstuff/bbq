const image = (filename, alt) => ({
  src: new URL(`../../../media/images/${filename}`, import.meta.url).href,
  alt,
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
};
