import test from "node:test";
import assert from "node:assert/strict";
import {
  createGroups,
  creditGroupMembers,
  groupingModes,
} from "../shared/grouping.js";

const players = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
const noShuffle = () => 0.999999;

test("pair generation keeps every player exactly once", () => {
  const groups = createGroups(players, groupingModes.pairs, noShuffle);
  assert.deepEqual(groups.map((group) => group.memberIds.length), [2, 2, 1]);
  assert.deepEqual(groups.flatMap((group) => group.memberIds), [
    "a",
    "b",
    "c",
    "d",
    "e",
  ]);
});

test("individuals, threes, two teams and custom groups share one engine", () => {
  assert.equal(
    createGroups(players, groupingModes.individual, noShuffle).length,
    5,
  );
  assert.deepEqual(
    createGroups(players, groupingModes.threes, noShuffle).map(
      (group) => group.memberIds.length,
    ),
    [3, 2],
  );
  assert.deepEqual(
    createGroups(players, groupingModes.twoTeams, noShuffle).map(
      (group) => group.memberIds.length,
    ),
    [3, 2],
  );
  assert.deepEqual(
    createGroups(players, groupingModes.custom, noShuffle, [
      { name: "ODDBALLS", memberIds: ["a", "c"] },
    ])[0],
    { id: "group-1", name: "ODDBALLS", memberIds: ["a", "c"] },
  );
});

test("group points credit every current member and no outsiders", () => {
  const scored = creditGroupMembers(
    {
      a: { generation: 2, score: 3 },
      b: { generation: 2, score: 0 },
      c: { generation: 2, score: 9 },
      stale: { generation: 1, score: 5 },
    },
    { memberIds: ["a", "b", "stale"] },
    4,
    2,
  );
  assert.equal(scored.a.score, 7);
  assert.equal(scored.b.score, 4);
  assert.equal(scored.c.score, 9);
  assert.equal(scored.stale.score, 5);
});

test("the Spelling Bee round declares bespoke turn-based pair flow", async () => {
  const { spellingBeePairsRound } = await import(
    "../shared/rounds/spelling-bee/round.js"
  );
  assert.equal(spellingBeePairsRound.grouping.mode, groupingModes.pairs);
  assert.equal(spellingBeePairsRound.participation, "turn-based");
  assert.equal(
    spellingBeePairsRound.flow.question.nextPhase,
    "leaderboard",
  );
  assert.equal(spellingBeePairsRound.media.title.visibility, "display");
});
