import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hostSubmissionLabel } from "../host/marking-presentation.js";
import {
  roundTypes,
  usesProgressiveFreeTextReveal,
} from "../shared/round-types.js";

test("neither public Player shell contains Host entry or password UI", async () => {
  const [rootHtml, playerHtml, script] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../player/index.html", import.meta.url), "utf8"),
    readFile(new URL("../player/main.js", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(rootHtml, /join as host|host-dialog|host-password/i);
  assert.doesNotMatch(playerHtml, /join as host|host-dialog|host-password/i);
  assert.doesNotMatch(script, /hostOpenButton|hostPassword|observeHostConnected/);
});

test("team setup exposes only shuffle and Display presentation controls", async () => {
  const html = await readFile(
    new URL("../host/index.html", import.meta.url),
    "utf8",
  );
  assert.match(html, /CREATE \/ SHUFFLE TWO TEAMS/);
  assert.match(html, /SHOW TEAMS ON DISPLAY/);
  assert.doesNotMatch(html, /MAKE ACTIVE|PREVIOUS TEAM|NEXT TEAM|group-assignments/);
});

test("Host marking labels never identify the player", () => {
  const submission = { playerName: "DIXON", placing: 1 };
  assert.equal(hostSubmissionLabel(submission, 0, "marking"), "ANSWER 1");
  assert.equal(hostSubmissionLabel(submission, 0, "reveal"), "1. DIXON");
});

test("progressive reveals are exclusive to the two free-text formats", () => {
  assert.equal(
    usesProgressiveFreeTextReveal({ type: roundTypes.fastestFreeText }),
    true,
  );
  assert.equal(
    usesProgressiveFreeTextReveal({ type: roundTypes.bestFreeText }),
    true,
  );
  for (const type of [
    roundTypes.mcq,
    roundTypes.closestWins,
    roundTypes.myDefinition,
  ]) {
    assert.equal(usesProgressiveFreeTextReveal({ type }), false);
  }
});
