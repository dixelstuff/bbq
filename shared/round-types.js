export const roundTypes = {
  fastestFreeText: "fastest-free-text",
  closestWins: "closest-wins",
  mcq: "mcq",
  bestFreeText: "best-free-text",
  myDefinition: "my-definition",
  pairingPrototype: "pairing-prototype",
  spellingBee: "spelling-bee",
  charades: "charades",
  manualScore: "manual-score",
};

export const scoringStrategies = {
  fastestCorrect: "fastest-correct",
  closestTwoOne: "closest-two-one",
  exactAnswer: "exact-answer",
  manual: "manual",
  definitionBluff: "definition-bluff",
};

export const mediaVisibility = {
  display: "display",
  player: "player",
  both: "both",
};

export function mediaForAudience(round, audience, slot = "question") {
  const media = round?.media?.[slot] ?? round?.media;
  if (!media) return undefined;
  const visibility = media.visibility ?? mediaVisibility.display;
  return visibility === mediaVisibility.both || visibility === audience
    ? media
    : undefined;
}

export function parseNumericAnswer(input) {
  const normalized = String(input ?? "").trim().replaceAll(",", "");
  if (!normalized || !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
    throw new Error("Enter a valid number");
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) throw new Error("Enter a valid number");
  return value;
}

export function normalizeSubmission(round, input) {
  const answer = String(input ?? "").trim();
  if (!answer) throw new Error("Enter an answer");
  if (round?.type === roundTypes.closestWins) {
    return { answer, numericValue: parseNumericAnswer(answer) };
  }
  return { answer };
}

export function scoreRound(round, orderedSubmissions) {
  if (round?.scoring?.strategy === scoringStrategies.closestTwoOne) {
    return rankClosest(round, orderedSubmissions);
  }
  if (round?.scoring?.strategy === scoringStrategies.fastestCorrect) {
    let firstCorrect = true;
    return orderedSubmissions.map((submission) => {
      let points = 0;

      if (submission.status === "correct") {
        points = firstCorrect
          ? round.scoring.firstCorrectPoints
          : round.scoring.otherCorrectPoints;
        firstCorrect = false;
      }

      return { ...submission, points: points + (submission.bonusPoints ?? 0) };
    });
  }
  if (round?.scoring?.strategy === scoringStrategies.exactAnswer) {
    const accepted = [
      round.answer,
      ...(round.acceptedAnswers ?? []),
    ].map(normalizeComparableAnswer);
    return orderedSubmissions.map((submission) => {
      const correct = accepted.includes(normalizeComparableAnswer(submission.answer));
      return {
        ...submission,
        status: correct ? "correct" : "incorrect",
        points: correct ? round.scoring.correctPoints ?? 1 : 0,
      };
    });
  }
  if (round?.scoring?.strategy === scoringStrategies.manual) {
    return orderedSubmissions.map((submission) => ({
      ...submission,
      status: "scored",
      points: submission.points ?? 0,
    }));
  }
  throw new Error(`Unsupported scoring strategy: ${round?.scoring?.strategy}`);
}

function normalizeComparableAnswer(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("en-AU")
    .replace(/[.,!?'"’]/g, "")
    .replace(/\s+/g, " ");
}

export function rankClosest(round, submissions) {
  const ranked = submissions
    .filter((submission) => Number.isFinite(submission.numericValue))
    .map((submission) => ({
      ...submission,
      difference: Math.abs(submission.numericValue - round.correctValue),
    }))
    .sort(
      (a, b) =>
        a.difference - b.difference ||
        a.submittedAt - b.submittedAt ||
        a.playerId.localeCompare(b.playerId),
    );

  let previousDifference;
  let previousPlacing;
  return ranked.map((submission, index) => {
    const placing =
      submission.difference === previousDifference
        ? previousPlacing
        : index + 1;
    previousDifference = submission.difference;
    previousPlacing = placing;
    const proposedPoints =
      placing === 1
        ? round.scoring.closestPoints
        : placing === 2
          ? round.scoring.secondPoints
          : 0;
    return {
      ...submission,
      placing,
      proposedPoints,
      points: proposedPoints,
      status: "ranked",
    };
  });
}

export function formatNumericAnswer(value) {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("en-AU", {
    maximumFractionDigits: 10,
  }).format(value);
}

export function applyRoundScores(players, submissions) {
  const updated = { ...players };
  for (const submission of submissions) {
    const player = updated[submission.playerId];
    if (!player) continue;
    updated[submission.playerId] = {
      ...player,
      score: (player.score ?? 0) + (submission.points ?? 0),
    };
  }
  return updated;
}

export function scoreDefinitionVotes(playerIds, options, votes) {
  const awards = Object.fromEntries(playerIds.map((playerId) => [playerId, 0]));
  for (const [voterId, optionId] of Object.entries(votes ?? {})) {
    const option = options.find((item) => item.id === optionId);
    if (option?.real) {
      awards[voterId] = (awards[voterId] ?? 0) + 2;
    } else if (option?.authorId && option.authorId !== voterId) {
      awards[option.authorId] = (awards[option.authorId] ?? 0) + 1;
    }
  }
  return awards;
}

export function shouldAutoCloseRound(round, eligiblePlayers, submissions) {
  return Boolean(
    round?.submission?.autoCloseWhenComplete &&
      round.submission.expectsEveryConnectedPlayer &&
      eligiblePlayers.length > 0 &&
      eligiblePlayers.every((player) => submissions[player.id]),
  );
}
