import test from "node:test";
import assert from "node:assert/strict";
import {
  spellingBeeRound,
  spellingBelPuzzles,
  validateSpellingBelWord,
} from "../shared/rounds/spelling-bee/round.js";

test("Spelling Bel has the requested opening sequence and puzzle order", () => {
  assert.equal(spellingBeeRound.id, "spelling-bel");
  assert.deepEqual(
    spellingBeeRound.openingMedia.map((media) => media.id),
    ["spelling-bee-title", "spelling-bel-title", "spelling-bel-rules"],
  );
  assert.deepEqual(
    spellingBelPuzzles.map(({ title, centreLetter, allowedLetters }) => ({
      title,
      centreLetter,
      allowedLetters,
    })),
    [
      { title: "HAIRBRUSH", centreLetter: "U", allowedLetters: ["H", "A", "I", "R", "B", "S", "U"] },
      { title: "MARATHON", centreLetter: "O", allowedLetters: ["M", "A", "R", "T", "H", "N", "O"] },
    ],
  );
});

test("letter checks permit reuse and only warn the Host", () => {
  const hairbrush = spellingBelPuzzles[0];
  assert.deepEqual(validateSpellingBelWord("bush", hairbrush), {
    missingCentreLetter: false,
    unavailableLetters: [],
    warned: false,
  });
  assert.equal(validateSpellingBelWord("rubbbbb", hairbrush).warned, false);
  assert.equal(validateSpellingBelWord("hair", hairbrush).missingCentreLetter, true);
  assert.deepEqual(validateSpellingBelWord("buzz", hairbrush).unavailableLetters, ["Z"]);
});
