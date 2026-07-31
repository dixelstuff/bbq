import { spellingBeeRound } from "../rounds/spelling-bee/round.js";
import { charadesRound } from "../rounds/charades/round.js";
import {
  bestFreeTextRounds,
  closestWinsRounds,
  definitionRounds,
  fastestFreeTextRounds,
  mcqRounds,
} from "../rounds/demo-night/rounds.js";

export const partyGame = {
  id: "birthday-party",
  title: "BBQ Demo Night",
  rounds: [
    ...mcqRounds,
    ...fastestFreeTextRounds,
    ...bestFreeTextRounds,
    ...definitionRounds,
    spellingBeeRound,
    ...closestWinsRounds,
    charadesRound,
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

export function getNextRound(gameId, roundId) {
  const rounds = getRounds(gameId);
  const index = rounds.findIndex((round) => round.id === roundId);
  return index >= 0 ? rounds[index + 1] : undefined;
}
