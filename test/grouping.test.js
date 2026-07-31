import test from "node:test";
import assert from "node:assert/strict";
import {
  createGroups,
  connectedPlayers,
  creditGroupMembers,
  groupingModes,
  nextActiveGroupId,
  playerGroupLabel,
  reassignPlayer,
} from "../shared/grouping.js";

const noShuffle = () => 0.999999;
const makePlayers = (count, simulated = false) =>
  Array.from({ length: count }, (_, index) => ({
    id: `player-${index + 1}`,
    simulated,
  }));

const pairSizes = (count) =>
  createGroups(makePlayers(count), groupingModes.pairs, noShuffle).map(
    (group) => group.memberIds.length,
  );

test("two players produce one pair", () => {
  assert.deepEqual(pairSizes(2), [2]);
});

test("three players produce one group of three", () => {
  assert.deepEqual(pairSizes(3), [3]);
});

test("four players produce two pairs", () => {
  assert.deepEqual(pairSizes(4), [2, 2]);
});

test("five players produce one pair and one group of three", () => {
  assert.deepEqual(pairSizes(5), [2, 3]);
});

test("seven players produce two pairs and one group of three", () => {
  assert.deepEqual(pairSizes(7), [2, 2, 3]);
});

test("odd pair generation omits nobody and contains no duplicates", () => {
  const ids = createGroups(
    makePlayers(9),
    groupingModes.pairs,
    noShuffle,
  ).flatMap((group) => group.memberIds);
  assert.equal(ids.length, 9);
  assert.equal(new Set(ids).size, 9);
  assert.deepEqual(ids.sort(), makePlayers(9).map((player) => player.id).sort());
});

test("two teams split even players equally", () => {
  assert.deepEqual(
    createGroups(makePlayers(8), groupingModes.twoTeams, noShuffle).map(
      (group) => group.memberIds.length,
    ),
    [4, 4],
  );
});

test("two teams split odd players with a difference of exactly one", () => {
  for (const count of [9, 11]) {
    const sizes = createGroups(
      makePlayers(count),
      groupingModes.twoTeams,
      noShuffle,
    ).map((group) => group.memberIds.length);
    assert.equal(Math.abs(sizes[0] - sizes[1]), 1);
    assert.equal(sizes[0] + sizes[1], count);
  }
});

test("two teams include every player exactly once", () => {
  const ids = createGroups(
    makePlayers(11),
    groupingModes.twoTeams,
    noShuffle,
  ).flatMap((group) => group.memberIds);
  assert.equal(ids.length, 11);
  assert.equal(new Set(ids).size, 11);
});

test("manual reassignment between teams preserves unique membership", () => {
  const initial = Object.fromEntries(
    createGroups(makePlayers(6), groupingModes.twoTeams, noShuffle).map(
      (group) => [group.id, group],
    ),
  );
  const moved = reassignPlayer(
    initial,
    "player-1",
    "group-2",
    groupingModes.twoTeams,
  );
  const memberships = Object.values(moved).flatMap(
    (group) => group.memberIds,
  );
  assert.equal(memberships.filter((id) => id === "player-1").length, 1);
  assert(moved["group-2"].memberIds.includes("player-1"));
});

test("moving the last member removes an empty pair-group cleanly", () => {
  const groups = {
    "group-1": { id: "group-1", memberIds: ["a"] },
    "group-2": { id: "group-2", memberIds: ["b", "c"] },
  };
  const moved = reassignPlayer(
    groups,
    "a",
    "group-2",
    groupingModes.pairs,
  );
  assert.equal(moved["group-1"], undefined);
  assert.deepEqual(moved["group-2"].memberIds, ["b", "c", "a"]);
});

test("three-person pair-group awards credit all three members", () => {
  const scored = creditGroupMembers(
    {
      a: { generation: 2, score: 0 },
      b: { generation: 2, score: 1 },
      c: { generation: 2, score: 2 },
    },
    { memberIds: ["a", "b", "c"] },
    4,
    2,
  );
  assert.deepEqual(
    [scored.a.score, scored.b.score, scored.c.score],
    [4, 5, 6],
  );
});

test("team awards credit every current team member", () => {
  const players = Object.fromEntries(
    makePlayers(6).map((player) => [
      player.id,
      { generation: 3, score: 0 },
    ]),
  );
  const team = createGroups(
    makePlayers(6),
    groupingModes.twoTeams,
    noShuffle,
  )[0];
  const scored = creditGroupMembers(players, team, 3, 3);
  for (const id of team.memberIds) assert.equal(scored[id].score, 3);
});

test("active-group navigation includes a three-person final group", () => {
  const groups = createGroups(
    makePlayers(5),
    groupingModes.pairs,
    noShuffle,
  );
  assert.equal(nextActiveGroupId(groups, "group-1", 1), "group-2");
  assert.equal(nextActiveGroupId(groups, "group-2", 1), "group-1");
  assert.equal(groups[1].memberIds.length, 3);
});

test("Player wording matches pair, group and team membership", () => {
  assert.equal(
    playerGroupLabel({ memberIds: ["a", "b"] }, groupingModes.pairs),
    "YOUR PAIR",
  );
  assert.equal(
    playerGroupLabel({ memberIds: ["a", "b", "c"] }, groupingModes.pairs),
    "YOUR GROUP",
  );
  assert.equal(
    playerGroupLabel({ memberIds: ["a", "b"] }, groupingModes.twoTeams),
    "YOUR TEAM",
  );
});

test("simulator players use the same grouping path", () => {
  const groups = createGroups(
    makePlayers(5, true),
    groupingModes.pairs,
    noShuffle,
  );
  assert.equal(groups.flatMap((group) => group.memberIds).length, 5);
  assert.equal(groups.at(-1).memberIds.length, 3);
});

test("group generation eligibility includes connected real and simulated players", () => {
  const eligible = connectedPlayers(
    {
      players: {
        real: { generation: 4 },
        sim: { generation: 4, simulated: true },
        offline: { generation: 4 },
      },
      connections: {
        real: { tab: { generation: 4 } },
        sim: { simulator: { generation: 4 } },
      },
    },
    4,
  );
  assert.deepEqual(
    eligible.map((player) => player.id).sort(),
    ["real", "sim"],
  );
});

test("the Spelling Bee round declares an individual, quiet Display flow", async () => {
  const { spellingBeeRound } = await import(
    "../shared/rounds/spelling-bee/round.js"
  );
  assert.equal(spellingBeeRound.grouping.mode, groupingModes.individual);
  assert.equal(spellingBeeRound.participation, "turn-based");
  assert.equal(spellingBeeRound.display.overlay, false);
  assert.equal(spellingBeeRound.display.phases.question, "artwork");
  assert.equal(spellingBeeRound.display.phases.reveal, "reveal");
  assert.equal(spellingBeeRound.media.title.visibility, "display");
});
