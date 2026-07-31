import { mediaVisibility, roundTypes } from "../../round-types.js";
import { displayModes } from "../../display-modes.js";

// Bespoke rounds own their production flow while reusing shared players,
// grouping, scoring, history and Display modes.
export const spellingBeeRound = {
  id: "spelling-bee",
  section: "ANDREW DICK SPELLING BEE",
  type: roundTypes.spellingBee,
  typeLabel: "SPELLING BEE",
  title: "Andrew Dick Spelling Bee",
  participation: "turn-based",
  grouping: {
    mode: "individual",
    reuse: false,
  },
  display: {
    overlay: false,
    phases: {
      question: displayModes.artwork,
      reveal: displayModes.reveal,
      leaderboard: displayModes.leaderboard,
    },
  },
  scoring: {
    correctPoints: 1,
  },
  media: {
    title: {
      id: "spelling-bee-title",
      type: "image",
      visibility: mediaVisibility.display,
    },
  },
  notes: "A spoken, individual round. The word and clues remain Host-only.",
};
