import test from "node:test";
import assert from "node:assert/strict";
import { charadesRound } from "../shared/rounds/charades/round.js";
import { wouldIMimeSets } from "../host/rounds/charades/content.js";
import {
  charadesSetScore,
  createCharadesSetState,
  nextCharadesClueIndex,
} from "../shared/game-engine.js";

const grouping = {
  groups: {
    "group-1": { id: "group-1", name: "TEAM 1" },
    "group-2": { id: "group-2", name: "TEAM 2" },
  },
};

test("the round persists four distinct sets with their owning teams", () => {
  const sets = createCharadesSetState(charadesRound, grouping);
  assert.equal(sets.length, 4);
  assert.deepEqual(
    sets.map((set) => set.teamGroupId),
    ["group-1", "group-2", "group-1", "group-2"],
  );
  assert.ok(sets.every((set) => set.clues.length === 5));
  assert.ok(sets.every((set) => set.score === 0 && !set.confirmed));
});

test("the private Host pack contains the exact five clues for every set", () => {
  assert.deepEqual(
    wouldIMimeSets.map((set) => set.clues),
    [
      ["Jurassic Park", "Friends", "The Very Hungry Caterpillar", "Hit Me Baby One More Time", "Home Alone"],
      ["The Matrix", "Baywatch", "Charlie and the Chocolate Factory", "Girls Just Want to Have Fun", "Teenage Mutant Ninja Turtles"],
      ["Dirty Dancing", "Seinfeld", "The Da Vinci Code", "Genie in a Bottle", "The Fresh Prince of Bel-Air"],
      ["The Sixth Sense", "Sex and the City", "Bridget Jones’s Diary", "Smells Like Teen Spirit", "Ice Ice Baby"],
    ],
  );
});

test("passed clues wait until every unseen clue has appeared", () => {
  const clues = [
    { status: "passed" },
    { status: "unseen" },
    { status: "correct" },
    { status: "unseen" },
    { status: "passed" },
  ];
  assert.equal(nextCharadesClueIndex(clues, 0), 1);
  clues[1].status = "passed";
  assert.equal(nextCharadesClueIndex(clues, 1), 3);
  clues[3].status = "passed";
  assert.equal(nextCharadesClueIndex(clues, 3), 4);
});

test("correct clues never return and a fully solved set ends", () => {
  const clues = Array.from({ length: 5 }, () => ({ status: "correct" }));
  assert.equal(nextCharadesClueIndex(clues, 2), -1);
  assert.equal(charadesSetScore({ clues }), 5);
});

test("set scoring counts only correct clues", () => {
  assert.equal(
    charadesSetScore({
      clues: [
        { status: "correct" },
        { status: "passed" },
        { status: "unseen" },
        { status: "correct" },
        { status: "passed" },
      ],
    }),
    2,
  );
});
