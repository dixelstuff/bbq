import test from "node:test";
import assert from "node:assert/strict";
import {
  displayModes,
  displayModeForPhase,
} from "../shared/display-modes.js";
import {
  leaderboardLayout,
  remainingTimerSeconds,
} from "../shared/presentation.js";

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

test("leaderboards adapt without requiring a scrolling layout", () => {
  assert.deepEqual(leaderboardLayout(7), { columns: 1, rows: 7 });
  assert.deepEqual(leaderboardLayout(8), { columns: 2, rows: 4 });
  assert.deepEqual(leaderboardLayout(13), { columns: 2, rows: 7 });
  assert.deepEqual(leaderboardLayout(18), { columns: 3, rows: 6 });
});

test("timer countdown is deterministic and supports a stopped value", () => {
  assert.equal(
    remainingTimerSeconds(
      { status: "running", endsAt: 70_000 },
      10_000,
    ),
    60,
  );
  assert.equal(
    remainingTimerSeconds({ status: "running", endsAt: 10_000 }, 10_001),
    0,
  );
  assert.equal(
    remainingTimerSeconds({ status: "stopped", remainingSeconds: 23 }),
    23,
  );
});

test("shared phase defaults keep marking quiet", () => {
  assert.equal(displayModeForPhase({}, "marking"), displayModes.artwork);
  assert.equal(
    displayModeForPhase({}, "leaderboard"),
    displayModes.leaderboard,
  );
});
