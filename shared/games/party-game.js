import {
  mediaVisibility,
  roundTypes,
  scoringStrategies,
} from "../round-types.js";

export const partyGame = {
  id: "birthday-party",
  title: "BBQ",
  rounds: [
    {
      id: "animal-1",
      type: roundTypes.fastestFreeText,
      typeLabel: "FASTEST FREE TEXT",
      title: "What animal is this?",
      submission: {
        expectsEveryConnectedPlayer: true,
        autoCloseWhenComplete: false,
      },
      scoring: {
        strategy: scoringStrategies.fastestCorrect,
        firstCorrectPoints: 2,
        otherCorrectPoints: 1,
      },
      question: "What animal is this?",
      media: {
        id: "placeholder-animal",
        type: "image",
        visibility: mediaVisibility.display,
      },
      answer: "Koala",
      notes:
        "Koalas are marsupials, not bears. Their closest living relatives are wombats.",
    },
    {
      id: "melbourne-london-distance",
      type: roundTypes.closestWins,
      typeLabel: "CLOSEST WINS",
      title: "Melbourne to London",
      question: "How many kilometres is Melbourne from London?",
      prompt: "Submit a number",
      submission: {
        kind: "number",
        expectsEveryConnectedPlayer: true,
        autoCloseWhenComplete: false,
      },
      scoring: {
        strategy: scoringStrategies.closestTwoOne,
        closestPoints: 2,
        secondPoints: 1,
      },
      answer: "16,900",
      correctValue: 16900,
      notes: "Answers are ranked automatically by absolute distance from 16,900.",
    },
  ],
};

export const games = {
  [partyGame.id]: partyGame,
};

export function getGame(gameId) {
  return games[gameId];
}

export function getRound(gameId, roundId) {
  return getGame(gameId)?.rounds.find((round) => round.id === roundId);
}

export function getRounds(gameId = partyGame.id) {
  return getGame(gameId)?.rounds ?? [];
}
