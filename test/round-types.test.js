import test from "node:test";
import assert from "node:assert/strict";
import {
  scoreRound,
  scoringStrategies,
  shouldAutoCloseRound,
} from "../shared/round-types.js";
import { normalizePlayerName } from "../shared/players.js";

const round = {
  submission: {
    expectsEveryConnectedPlayer: true,
    autoCloseWhenComplete: true,
  },
  scoring: {
    strategy: scoringStrategies.fastestCorrect,
    firstCorrectPoints: 2,
    otherCorrectPoints: 1,
  },
};

test("player names are trimmed and uppercased", () => {
  assert.equal(normalizePlayerName("  Bella  "), "BELLA");
});

test("auto-close waits for every eligible connected player", () => {
  const eligible = [{ id: "a" }, { id: "b" }];
  assert.equal(shouldAutoCloseRound(round, eligible, { a: {} }), false);
  assert.equal(shouldAutoCloseRound(round, eligible, { a: {}, b: {} }), true);
});

test("disconnected players can be excluded from auto-close eligibility", () => {
  const connectedOnly = [{ id: "a" }];
  assert.equal(
    shouldAutoCloseRound(round, connectedOnly, { a: {} }),
    true,
  );
});

test("round definitions can disable auto-close", () => {
  const manualRound = {
    ...round,
    submission: { ...round.submission, autoCloseWhenComplete: false },
  };
  assert.equal(shouldAutoCloseRound(manualRound, [{ id: "a" }], { a: {} }), false);
});

test("fastest free text currently remains under Host control", async () => {
  const { fastestCorrectAnswerGame } = await import(
    "../shared/games/fastest-correct-answer.js"
  );
  assert.equal(
    fastestCorrectAnswerGame.rounds[0].submission.autoCloseWhenComplete,
    false,
  );
});

test("fastest correct scoring is reusable and ordered", () => {
  assert.deepEqual(
    scoreRound(round, [
      { playerId: "a", status: "incorrect" },
      { playerId: "b", status: "correct" },
      { playerId: "c", status: "correct" },
    ]).map(({ playerId, points }) => ({ playerId, points })),
    [
      { playerId: "a", points: 0 },
      { playerId: "b", points: 2 },
      { playerId: "c", points: 1 },
    ],
  );
});
