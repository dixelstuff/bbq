import test from "node:test";
import assert from "node:assert/strict";
import { charadesLibrary, charadesPrompts } from "../host/rounds/charades/content.js";
import { spellingBeeWords } from "../host/rounds/spelling-bee/content.js";
import {
  bestFreeTextRounds,
  closestWinsRounds,
  definitionRounds,
  fastestFreeTextRounds,
  mcqRounds,
} from "../shared/rounds/demo-night/rounds.js";
import {
  roundTypes,
  scoreDefinitionVotes,
  scoreRound,
} from "../shared/round-types.js";
import { shouldApplyRelease } from "../shared/session-state.js";

test("the supplied demo-night sections contain the complete question pack", () => {
  assert.deepEqual(
    [
      mcqRounds.length,
      fastestFreeTextRounds.length,
      bestFreeTextRounds.length,
      definitionRounds.length,
      closestWinsRounds.length,
    ],
    [8, 8, 6, 6, 16],
  );
});

test("the spelling bee contains every supplied word exactly once", () => {
  assert.equal(spellingBeeWords.length, 18);
  assert.deepEqual(
    spellingBeeWords.map(({ word }) => word),
    [
      "Embarrassment",
      "Diarrhoea",
      "Questionnaire",
      "Accommodation",
      "Conscientious",
      "Millennium",
      "Supersede",
      "Pharaoh",
      "Onomatopoeia",
      "Rhythm",
      "Liaison",
      "Manoeuvre",
      "Camouflage",
      "Harass",
      "Maintenance",
      "Separate",
      "Privilege",
      "Occasionally",
    ].map((word) => word.toUpperCase()),
  );
});

test("charades keeps all supplied prompts and adds exactly fifty", () => {
  const suppliedCount = 37;
  assert.equal(charadesPrompts.length, suppliedCount + 50);
  for (const prompt of [
    "Titanic",
    "Albert Einstein",
    "Platypus",
    "Air traffic controller",
    "Trying to plug in a USB the wrong way twice",
  ]) {
    assert.ok(charadesPrompts.some((entry) => entry.prompt === prompt));
  }
  assert.ok(Object.keys(charadesLibrary).length >= 5);
});

test("MCQ scoring accepts alternatives and remains case-insensitive", () => {
  const flight = mcqRounds.find((round) => round.id === "mcq-powered-flight");
  assert.equal(flight.type, roundTypes.mcq);
  assert.deepEqual(
    scoreRound(flight, [
      { playerId: "a", answer: "BATS" },
      { playerId: "b", answer: "flying squirrel" },
    ]).map(({ status, points }) => ({ status, points })),
    [
      { status: "correct", points: 1 },
      { status: "incorrect", points: 0 },
    ],
  );
});

test("My Definition awards two for finding truth and one per fooled rival", () => {
  assert.deepEqual(
    scoreDefinitionVotes(
      ["bella", "george", "andrew"],
      [
        { id: "real", real: true },
        { id: "fake-bella", authorId: "bella" },
        { id: "fake-george", authorId: "george" },
      ],
      {
        bella: "real",
        george: "fake-bella",
        andrew: "fake-bella",
      },
    ),
    { bella: 4, george: 0, andrew: 0 },
  );
});

test("all demo-night title media is explicitly Display-only", () => {
  for (const round of [
    ...mcqRounds,
    ...fastestFreeTextRounds,
    ...bestFreeTextRounds,
    ...definitionRounds,
    ...closestWinsRounds,
  ]) {
    assert.equal(round.media.title.visibility, "display");
  }
});

test("stale clients cannot roll the session back to an older release", () => {
  const current = { releaseId: "new", releaseOrder: 200 };
  assert.equal(shouldApplyRelease(current, "old", 100), false);
  assert.equal(shouldApplyRelease(current, "new", 200), false);
  assert.equal(shouldApplyRelease(current, "newer", 300), true);
});
