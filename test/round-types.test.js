import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRoundScores,
  mediaForAudience,
  mediaVisibility,
  normalizeSubmission,
  parseNumericAnswer,
  rankClosest,
  roundTypes,
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
  const { partyGame } = await import(
    "../shared/games/party-game.js"
  );
  assert.equal(
    partyGame.rounds[0].submission.autoCloseWhenComplete,
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

test("media defaults to Display-only and can explicitly target audiences", () => {
  const defaultMedia = { media: { id: "shared-image", type: "image" } };
  assert.equal(mediaForAudience(defaultMedia, "display")?.id, "shared-image");
  assert.equal(mediaForAudience(defaultMedia, "player"), undefined);
  const both = {
    media: {
      ...defaultMedia.media,
      visibility: mediaVisibility.both,
    },
  };
  assert.equal(mediaForAudience(both, "player")?.id, "shared-image");
});

test("numeric submissions accept integers, commas, decimals and reject invalid input", () => {
  assert.equal(parseNumericAnswer("16900"), 16900);
  assert.equal(parseNumericAnswer("16,900"), 16900);
  assert.equal(parseNumericAnswer("16900.5"), 16900.5);
  assert.throws(() => parseNumericAnswer("sixteen thousand"), /valid number/);
  assert.throws(() => parseNumericAnswer(""), /valid number/);
  assert.deepEqual(
    normalizeSubmission({ type: roundTypes.closestWins }, " 16,900.5 "),
    { answer: "16,900.5", numericValue: 16900.5 },
  );
});

test("closest ranking is deterministic, uses competition ties, and shares points", () => {
  const closestRound = {
    correctValue: 100,
    scoring: {
      strategy: scoringStrategies.closestTwoOne,
      closestPoints: 2,
      secondPoints: 1,
    },
  };
  const ranked = rankClosest(closestRound, [
    { playerId: "andrew", numericValue: 92, submittedAt: 3 },
    { playerId: "george", numericValue: 105, submittedAt: 2 },
    { playerId: "bella", numericValue: 95, submittedAt: 1 },
  ]);
  assert.deepEqual(
    ranked.map(({ playerId, placing, points }) => ({
      playerId,
      placing,
      points,
    })),
    [
      { playerId: "bella", placing: 1, points: 2 },
      { playerId: "george", placing: 1, points: 2 },
      { playerId: "andrew", placing: 3, points: 0 },
    ],
  );
});

test("untied closest answers award two points then one point", () => {
  const closestRound = {
    correctValue: 100,
    scoring: {
      strategy: scoringStrategies.closestTwoOne,
      closestPoints: 2,
      secondPoints: 1,
    },
  };
  assert.deepEqual(
    rankClosest(closestRound, [
      { playerId: "a", numericValue: 99, submittedAt: 1 },
      { playerId: "b", numericValue: 97, submittedAt: 2 },
      { playerId: "c", numericValue: 90, submittedAt: 3 },
    ]).map(({ placing, points }) => ({ placing, points })),
    [
      { placing: 1, points: 2 },
      { placing: 2, points: 1 },
      { placing: 3, points: 0 },
    ],
  );
});

test("leaderboard totals use final overridden points", () => {
  assert.deepEqual(
    applyRoundScores(
      {
        bella: { name: "BELLA", score: 4 },
        george: { name: "GEORGE", score: 1 },
      },
      [
        { playerId: "bella", points: 3 },
        { playerId: "george", points: 0 },
      ],
    ),
    {
      bella: { name: "BELLA", score: 7 },
      george: { name: "GEORGE", score: 1 },
    },
  );
});
