import test from "node:test";
import assert from "node:assert/strict";
import {
  createMediaCommand,
  configuredStopTime,
  extendedStopTime,
  normalizeTimedMediaCue,
} from "../shared/media-cues.js";
import { fastestFreeTextRounds } from "../shared/rounds/demo-night/rounds.js";

test("timed media cues preserve practical offsets and durations", () => {
  assert.deepEqual(
    normalizeTimedMediaCue({ file: "/composers/test.mp3", start: 12.5, duration: 8 }),
    { file: "composers/test.mp3", start: 12.5, duration: 8 },
  );
});

test("timed media cues reject missing files and parent traversal", () => {
  assert.throws(() => normalizeTimedMediaCue({}), /safe path/);
  assert.throws(
    () => normalizeTimedMediaCue({ file: "../private/audio.mp3" }),
    /safe path/,
  );
});

test("media commands are ordered deterministically", () => {
  assert.deepEqual(createMediaCommand("replay", 4, 1234), {
    action: "replay",
    sequence: 5,
    requestedAt: 1234,
  });
  assert.throws(() => createMediaCommand("explode", 0, 1234), /Unknown/);
});

test("excerpt stop and five-second extension timings are deterministic", () => {
  assert.equal(
    configuredStopTime({ file: "clip.mp3", start: 12.5, duration: 8 }),
    20.5,
  );
  assert.equal(extendedStopTime(18, 20.5), 25.5);
  assert.equal(extendedStopTime(20.5), 25.5);
});

test("the four current composer rounds reference local Display clips", () => {
  const composerRounds = fastestFreeTextRounds.filter((round) => round.audio);
  assert.equal(composerRounds.length, 4);
  assert.deepEqual(
    composerRounds.map((round) => round.audio.file),
    [
      "composers/beethoven-symphony-5.mp3",
      "composers/strauss-also-sprach-zarathustra.mp3",
      "composers/vivaldi-spring.mp3",
      "composers/holst-mars.mp3",
    ],
  );
});
