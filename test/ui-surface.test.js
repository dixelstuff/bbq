import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the Player surface contains no Host entry or password gate", async () => {
  const [html, script] = await Promise.all([
    readFile(new URL("../player/index.html", import.meta.url), "utf8"),
    readFile(new URL("../player/main.js", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(html, /join as host|host-dialog|host-password/i);
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
