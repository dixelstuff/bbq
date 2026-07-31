import test from "node:test";
import assert from "node:assert/strict";
import { createCueGate } from "../shared/cue-gate.js";

test("production cues remain idempotent when Firebase re-renders interleave effects", () => {
  const accept = createCueGate();
  assert.equal(accept("reveal:round-1"), true);
  assert.equal(accept("correct:round-1"), true);
  assert.equal(accept("reveal:round-1"), false);
  assert.equal(accept("correct:round-1"), false);
});
