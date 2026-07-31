import { displayModes } from "../../display-modes.js";
import { mediaVisibility, roundTypes } from "../../round-types.js";

const baseCharadesRound = {
  section: "CHARADES",
  type: roundTypes.charades,
  typeLabel: "CHARADES",
  participation: "turn-based",
  grouping: { mode: "two-teams", reuse: true },
  display: {
    overlay: false,
    phases: {
      question: displayModes.artwork,
      leaderboard: displayModes.leaderboard,
    },
  },
  timer: { defaultSeconds: 75 },
  scoring: { minimum: 0, maximum: 5 },
  media: {
    title: {
      id: "charades-title",
      type: "image",
      visibility: mediaVisibility.display,
    },
  },
  notes: "Two teams receive separate sets of five Host-only prompts.",
};

export const charadesRounds = Array.from({ length: 8 }, (_, setIndex) => ({
  ...baseCharadesRound,
  id: `charades-${setIndex + 1}`,
  title: `Charades ${setIndex + 1}`,
  promptSetIndex: setIndex,
}));

// Compatibility export for code that needs the first prototype definition.
export const charadesRound = charadesRounds[0];
