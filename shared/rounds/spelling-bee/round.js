import { mediaVisibility, roundTypes } from "../../round-types.js";

// This round is intentionally bespoke. It uses the common grouping, active
// group, scoring, history and phase services without adopting an answer form.
export const spellingBeePairsRound = {
  id: "spelling-bee-pairs",
  type: roundTypes.pairingPrototype,
  typeLabel: "SPELLING BEE PAIRS",
  title: "Andrew Dick Spelling Bee",
  participation: "turn-based",
  grouping: {
    mode: "pairs",
    reuse: true,
  },
  flow: {
    question: {
      hostLabel: "SHOW LEADERBOARD",
      nextPhase: "leaderboard",
    },
  },
  media: {
    title: {
      id: "spelling-bee-title",
      type: "image",
      visibility: mediaVisibility.display,
    },
  },
  notes:
    "Prototype round for pair generation, active-pair control and group scoring.",
};
