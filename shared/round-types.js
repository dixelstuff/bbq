export const roundTypes = {
  fastestFreeText: "fastest-free-text",
  closestWins: "closest-wins",
  manualScore: "manual-score",
};

export const scoringStrategies = {
  fastestCorrect: "fastest-correct",
};

export function scoreRound(round, orderedSubmissions) {
  if (round?.scoring?.strategy !== scoringStrategies.fastestCorrect) {
    throw new Error(`Unsupported scoring strategy: ${round?.scoring?.strategy}`);
  }

  let firstCorrect = true;
  return orderedSubmissions.map((submission) => {
    let points = 0;

    if (submission.status === "correct") {
      points = firstCorrect
        ? round.scoring.firstCorrectPoints
        : round.scoring.otherCorrectPoints;
      firstCorrect = false;
    }

    return { ...submission, points };
  });
}

export function shouldAutoCloseRound(round, eligiblePlayers, submissions) {
  return Boolean(
    round?.submission?.autoCloseWhenComplete &&
      round.submission.expectsEveryConnectedPlayer &&
      eligiblePlayers.length > 0 &&
      eligiblePlayers.every((player) => submissions[player.id]),
  );
}
