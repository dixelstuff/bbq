import { displayModes } from "../../display-modes.js";
import {
  mediaVisibility,
  roundTypes,
  scoringStrategies,
} from "../../round-types.js";

const displayImage = (id) => ({
  id,
  type: "image",
  visibility: mediaVisibility.display,
});

export const spellingBelPuzzles = [
  {
    id: "hairbrush",
    title: "HAIRBRUSH",
    question: "Make one word using H, A, I, R, B, S and U. Your word must contain U.",
    centreLetter: "U",
    allowedLetters: ["H", "A", "I", "R", "B", "S", "U"],
    media: displayImage("spelling-bel-hairbrush"),
  },
  {
    id: "marathon",
    title: "MARATHON",
    question: "Make one word using M, A, R, T, H, N and O. Your word must contain O.",
    centreLetter: "O",
    allowedLetters: ["M", "A", "R", "T", "H", "N", "O"],
    media: displayImage("spelling-bel-marathon"),
  },
];

export const spellingBeeRound = {
  id: "spelling-bel",
  section: "SPELLING BEL",
  type: roundTypes.spellingBee,
  typeLabel: "SPELLING BEL",
  title: "Spelling Bel",
  participation: { mode: "individual" },
  submission: {
    kind: "text",
    expectsEveryConnectedPlayer: true,
    autoCloseWhenComplete: false,
  },
  scoring: { strategy: scoringStrategies.manual, maxPoints: 5 },
  flow: {
    reveal: { progressive: true, showGenuineAnswer: false },
    scoring: { afterSubmissionsReveal: true },
  },
  timer: { defaultSeconds: 30 },
  openingMedia: [
    displayImage("spelling-bee-title"),
    displayImage("spelling-bel-title"),
    displayImage("spelling-bel-rules"),
  ],
  puzzles: spellingBelPuzzles,
  display: {
    overlay: false,
    phases: {
      question: displayModes.media,
      marking: displayModes.artwork,
      reveal: displayModes.reveal,
      leaderboard: displayModes.leaderboard,
    },
  },
  media: {
    title: displayImage("spelling-bee-title"),
    question: spellingBelPuzzles[0].media,
  },
  notes:
    "Players submit one word. Warn about unavailable letters or a missing centre letter, but leave every scoring decision to the Host.",
};

export function validateSpellingBelWord(answer, puzzle) {
  const letters = [...String(answer ?? "").trim().toUpperCase()].filter(
    (letter) => /[A-Z]/.test(letter),
  );
  const allowed = new Set(puzzle?.allowedLetters ?? []);
  const unavailableLetters = [...new Set(letters.filter((letter) => !allowed.has(letter)))];
  return {
    missingCentreLetter: !letters.includes(puzzle?.centreLetter),
    unavailableLetters,
    warned: !letters.includes(puzzle?.centreLetter) || unavailableLetters.length > 0,
  };
}
