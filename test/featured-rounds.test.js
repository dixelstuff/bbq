import test from "node:test";
import assert from "node:assert/strict";
import {
  awardsPointsAfterGenuineAnswer,
  mediaForAudience,
  requiresGenuineAnswerReveal,
  roundTypes,
  scoringStrategies,
  usesProgressiveFreeTextReveal,
} from "../shared/round-types.js";
import {
  csiKoonoomooRounds,
  featuredRounds,
  googlebelRounds,
  sippingPointRounds,
  thankGodYoureLyricsRounds,
} from "../shared/rounds/featured-rounds/rounds.js";

test("the featured sections retain their supplied question packs", () => {
  assert.equal(csiKoonoomooRounds.length, 3);
  assert.equal(sippingPointRounds.length, 3);
  assert.equal(googlebelRounds.length, 3);
  assert.equal(featuredRounds.length, 13);
  assert.equal(csiKoonoomooRounds[0].answer, "an eyesore.");
  assert.equal(csiKoonoomooRounds[2].answer, "a big puddle in the middle of a paddock.");
  assert.equal(googlebelRounds[0].answer, "I just wanted to go home.");
  assert.equal(googlebelRounds[2].answer, "erotic.");
});

test("Thank God You’re Lyrics contains four staged manual questions worth 0–3", () => {
  assert.equal(thankGodYoureLyricsRounds.length, 4);
  for (const round of thankGodYoureLyricsRounds) {
    assert.equal(round.type, roundTypes.bestFreeText);
    assert.equal(round.scoring.strategy, scoringStrategies.manual);
    assert.equal(round.scoring.maxPoints, 3);
    assert.equal(usesProgressiveFreeTextReveal(round), true);
    assert.equal(requiresGenuineAnswerReveal(round), true);
    assert.equal(awardsPointsAfterGenuineAnswer(round), true);
    assert.match(round.prompt, /LYRIC|WORDS/);
    assert.ok(round.genuineAnswer.song);
    assert.ok(round.genuineAnswer.artist);
  }
  assert.equal(
    thankGodYoureLyricsRounds[2].answer,
    "Innocence, awkwardness, impunity",
  );
});

test("comedy questions require the complete staged reveal contract", () => {
  for (const round of [...csiKoonoomooRounds, ...googlebelRounds]) {
    assert.equal(round.type, roundTypes.bestFreeText);
    assert.equal(round.scoring.strategy, scoringStrategies.manual);
    assert.equal(usesProgressiveFreeTextReveal(round), true);
    assert.equal(requiresGenuineAnswerReveal(round), true);
    assert.equal(awardsPointsAfterGenuineAnswer(round), true);
    assert.equal(round.submission.autoCloseWhenComplete, false);
  }
});

test("Sipping Point uses two manual text questions and one normal MCQ", () => {
  const [pommery, slipper, moccona] = sippingPointRounds;
  for (const round of [pommery, slipper]) {
    assert.equal(round.type, roundTypes.bestFreeText);
    assert.equal(round.scoring.strategy, scoringStrategies.manual);
    assert.equal(usesProgressiveFreeTextReveal(round), false);
    assert.equal(requiresGenuineAnswerReveal(round), false);
  }
  assert.equal(moccona.type, roundTypes.mcq);
  assert.equal(moccona.submission.kind, "choice");
  assert.equal(moccona.choices.length, 4);
  assert.equal(moccona.choices[1], "I have Moccona at my place.");
  assert.equal(moccona.answer, moccona.choices[1]);
});

test("featured artwork is first-class Display-only media", () => {
  const mediaIds = new Set();
  for (const round of featuredRounds) {
    const media = mediaForAudience(round, "display", "title");
    assert.ok(media);
    assert.equal(mediaForAudience(round, "player", "title"), undefined);
    mediaIds.add(media.id);
  }
  assert.deepEqual(mediaIds, new Set([
    "csi-koonoomoo-title",
    "sipping-point-title",
    "googlebel-title",
    "thank-god-youre-lyrics-title",
  ]));
});
