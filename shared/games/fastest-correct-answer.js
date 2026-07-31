import { roundTypes, scoringStrategies } from "../round-types.js";

const placeholderAnimalImage = new URL(
  "../../media/images/placeholder-animal.svg",
  import.meta.url,
).href;

export const fastestCorrectAnswerGame = {
  id: "fastest-correct-answer",
  title: "Fastest Correct Answer",
  rounds: [
    {
      id: "animal-1",
      type: roundTypes.fastestFreeText,
      typeLabel: "FASTEST FREE TEXT",
      submission: {
        expectsEveryConnectedPlayer: true,
        autoCloseWhenComplete: true,
      },
      scoring: {
        strategy: scoringStrategies.fastestCorrect,
        firstCorrectPoints: 2,
        otherCorrectPoints: 1,
      },
      question: "What animal is this?",
      image: placeholderAnimalImage,
      imageAlt: "An illustrated grey koala among eucalyptus leaves",
      answer: "Koala",
      notes:
        "Koalas are marsupials, not bears. Their closest living relatives are wombats.",
    },
  ],
};

export const games = {
  [fastestCorrectAnswerGame.id]: fastestCorrectAnswerGame,
};

export function getGame(gameId) {
  return games[gameId];
}

export function getRound(gameId, roundId) {
  return getGame(gameId)?.rounds.find((round) => round.id === roundId);
}
