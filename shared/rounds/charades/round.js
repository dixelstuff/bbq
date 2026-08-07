import { displayModes } from "../../display-modes.js";
import { mediaVisibility, roundTypes } from "../../round-types.js";

export const charadesSets = [
  {
    setNumber: 1,
    teamIndex: 0,
    clueCount: 5,
  },
  {
    setNumber: 2,
    teamIndex: 1,
    clueCount: 5,
  },
  {
    setNumber: 3,
    teamIndex: 0,
    clueCount: 5,
  },
  {
    setNumber: 4,
    teamIndex: 1,
    clueCount: 5,
  },
];

export const charadesRound = {
  id: "would-i-mime-to-you",
  section: "WOULD I MIME TO YOU",
  type: roundTypes.charades,
  typeLabel: "WOULD I MIME TO YOU",
  title: "Would I Mime to You",
  participation: "turn-based",
  grouping: { mode: "two-teams", reuse: true },
  sets: charadesSets,
  display: {
    overlay: false,
    phases: {
      question: displayModes.artwork,
      leaderboard: displayModes.leaderboard,
    },
  },
  timer: { defaultSeconds: 90 },
  scoring: { pointsPerClue: 1, maximumPerSet: 5, maximumPerTeam: 10 },
  media: {
    title: {
      id: "would-i-mime-title",
      type: "image",
      visibility: mediaVisibility.display,
    },
  },
  notes:
    "Four fixed sets: Team 1, Team 2, Team 1, Team 2. Each set has five clues and its own 90-second timer.",
};

export const charadesRounds = [charadesRound];
