import test from "node:test";
import assert from "node:assert/strict";
import {
  createSimulatedDefinitionVotes,
  shuffleDefinitionOptions,
} from "../shared/definition-voting.js";

const options = [
  { id: "real", real: true },
  { id: "fake-a", authorId: "a" },
  { id: "fake-b", authorId: "b" },
  { id: "fake-c", authorId: "c" },
];

test("definition choices are shuffled reproducibly per round", () => {
  const first = shuffleDefinitionOptions(options, 123).map(({ id }) => id);
  assert.deepEqual(
    shuffleDefinitionOptions(options, 123).map(({ id }) => id),
    first,
  );
  assert.notDeepEqual(
    shuffleDefinitionOptions(options, 456).map(({ id }) => id),
    first,
  );
});

test("connected simulated players vote without choosing their own fake", () => {
  const players = [
    { id: "a", simulated: true, connected: true },
    { id: "b", simulated: true, connected: true },
    { id: "c", simulated: true, connected: false },
    { id: "real-player", simulated: false, connected: true },
  ];
  const votes = createSimulatedDefinitionVotes(players, options, 123);
  assert.deepEqual(Object.keys(votes).sort(), ["a", "b"]);
  assert.notEqual(votes.a, "fake-a");
  assert.notEqual(votes.b, "fake-b");
});
