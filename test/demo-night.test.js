import test from "node:test";
import assert from "node:assert/strict";
import { spellingBeeWords } from "../host/rounds/spelling-bee/content.js";
import { getHostContent } from "../host/rounds/demo-night/content.js";
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

test("MCQ scoring accepts alternatives and remains case-insensitive", () => {
  const flight = mcqRounds.find((round) => round.id === "mcq-powered-flight");
  assert.equal(flight.type, roundTypes.mcq);
  assert.deepEqual(
    scoreRound(flight, [
      { playerId: "a", answer: "BATS" },
      { playerId: "b", answer: "flying squirrel" },
    ]).map(({ status, points }) => ({ status, points })),
    [
      { status: "correct", points: 2 },
      { status: "incorrect", points: 0 },
    ],
  );
});

test("MCQ speed bonus goes to the fastest correct answer, not fastest submission", () => {
  const round = mcqRounds[0];
  const scored = scoreRound(round, [
    { playerId: "fast-wrong", answer: "Russia", submittedAt: 1 },
    { playerId: "first-correct", answer: "France", submittedAt: 2 },
    { playerId: "later-correct", answer: "France", submittedAt: 3 },
  ]);
  assert.deepEqual(
    scored.map(({ playerId, points }) => ({ playerId, points })),
    [
      { playerId: "fast-wrong", points: 0 },
      { playerId: "first-correct", points: 2 },
      { playerId: "later-correct", points: 1 },
    ],
  );
});

test("every BBQ-MCQ question is a phone-ready multiple choice", () => {
  for (const round of mcqRounds) {
    assert.equal(round.choices.length, 4, round.question);
    assert.ok(round.choices.includes(round.answer), round.question);
  }
});

test("spelling bee Host cards include an origin and a playful sentence", () => {
  for (const item of spellingBeeWords) {
    assert.ok(item.origin.length > 10, item.word);
    assert.ok(item.example.length > 20, item.word);
  }
});

test("debate-prone questions include expandable Host research", () => {
  for (const id of [
    "fastest-shakespeare",
    "fastest-australian-coastline",
    "fastest-jupiter-moon",
    "mcq-time-zones",
    "mcq-shortest-day",
    "mcq-chess-squares",
  ]) {
    const research = getHostContent(id).research;
    assert.ok(research?.length, id);
    assert.ok(research.some((section) => section.items?.length >= 5), id);
  }
});

test("open-answer rounds can provide an audience-friendly reveal", () => {
  const moons = fastestFreeTextRounds.find(
    (round) => round.id === "fastest-jupiter-moon",
  );
  assert.match(moons.revealAnswer, /IO.*EUROPA.*97 MORE/);
  assert.equal(moons.answer, "Any genuine moon of Jupiter");
});

test("every factual demo-night question has a substantial Host briefing", () => {
  for (const round of [
    ...mcqRounds,
    ...fastestFreeTextRounds,
    ...closestWinsRounds,
  ]) {
    const research = getHostContent(round.id).research;
    assert.ok(research?.length, `${round.id} has no Host briefing`);
    assert.ok(
      research.reduce((total, section) => total + (section.items?.length ?? 0), 0) >= 4,
      `${round.id} needs more Host briefing detail`,
    );
  }
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
