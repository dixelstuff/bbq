import { displayModes } from "../../display-modes.js";
import { mediaVisibility, roundTypes } from "../../round-types.js";

export const charadesRound = {
  id: "charades",
  type: roundTypes.charades,
  typeLabel: "CHARADES",
  title: "Charades",
  participation: "turn-based",
  grouping: {
    mode: "existing",
    reuse: true,
  },
  display: {
    overlay: true,
    phases: {
      question: displayModes.artwork,
      leaderboard: displayModes.leaderboard,
    },
  },
  timer: {
    defaultSeconds: 60,
  },
  scoring: {
    minimum: 0,
    maximum: 5,
  },
  media: {
    title: {
      id: "charades-title",
      type: "image",
      visibility: mediaVisibility.display,
    },
  },
  notes: "A spoken, physical group round. Prompts remain Host-only.",
};
