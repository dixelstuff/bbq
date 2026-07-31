import test from "node:test";
import assert from "node:assert/strict";
import {
  displayModes,
  displayModeForPhase,
} from "../shared/display-modes.js";

test("rounds can explicitly choose quiet and reveal Display modes", () => {
  const round = {
    display: {
      phases: {
        question: displayModes.artwork,
        reveal: displayModes.reveal,
      },
    },
  };
  assert.equal(displayModeForPhase(round, "question"), displayModes.artwork);
  assert.equal(displayModeForPhase(round, "reveal"), displayModes.reveal);
});

test("shared phase defaults keep marking quiet", () => {
  assert.equal(displayModeForPhase({}, "marking"), displayModes.artwork);
  assert.equal(
    displayModeForPhase({}, "leaderboard"),
    displayModes.leaderboard,
  );
});
