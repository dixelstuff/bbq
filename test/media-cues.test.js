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

test("excerpt stop and twenty-second extension timings are deterministic", () => {
  assert.equal(
    configuredStopTime({ file: "clip.mp3", start: 12.5, duration: 8 }),
    20.5,
  );
  assert.equal(extendedStopTime(18, 20.5), 40.5);
  assert.equal(extendedStopTime(20.5), 40.5);
});

test("the four current composer rounds reference local Display clips", () => {
  const composerRounds = fastestFreeTextRounds.filter((round) => round.audio);
  assert.equal(composerRounds.length, 4);
  assert.deepEqual(
    composerRounds.map((round) => round.audio.file),
    [
      "composers/abydos_music-beethoven-symphony-no-5-158810.mp3",
      "composers/josepmonter-also-sprach-zarathustra-4968.mp3",
      "composers/Classicals.de-Vivaldi-The-Four-Seasons-01-John-Harrison-with-the-Wichita-State-University-Chamber-Players-Spring-Mvt-1-Allegro.mp3",
      "composers/1Mars.wav",
    ],
  );
});
