import { onValue, ref, runTransaction } from "firebase/database";
import { database, signIn } from "./firebase.js";
import { getNextRound, getRound, partyGame } from "./games/party-game.js";
import {
  applyRoundScores,
  normalizeSubmission,
  roundTypes,
  scoreRound,
  scoreDefinitionVotes,
  shouldAutoCloseRound,
} from "./round-types.js";
import { validSessionState } from "./session-state.js";
import {
  createGroups,
  groupingModes,
  participationModes,
} from "./grouping.js";
import { displayModeForPhase, displayModes } from "./display-modes.js";

const sessionPath = "sessions/default";
const phases = {
  lobby: "lobby",
  opening: "opening",
  question: "question",
  marking: "marking",
  voting: "voting",
  reveal: "reveal",
  leaderboard: "leaderboard",
  intermission: "intermission",
};

export { phases };

export function validGameState(session) {
  const state = validSessionState(session?.state);
  const phase = Object.values(phases).includes(state.phase)
    ? state.phase
    : state.step === 1
      ? phases.lobby
      : phases.intermission;

  return {
    ...state,
    phase,
    gameId: state.gameId,
    roundId: state.roundId,
  };
}

export async function observeGame(onChange) {
  await signIn();

  return onValue(ref(database, sessionPath), (snapshot) => {
    const session = snapshot.val() ?? {};
    const state = validGameState(session);
    const submissions = orderedSubmissions(session, state);
    const players = currentPlayers(session, state);

    onChange({
      state,
      definition: getRound(state.gameId, state.roundId),
      round: session.round ?? {},
      submissions,
      players,
      leaderboard: [...players].sort(
        (a, b) => (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name),
      ),
    });
  });
}

export async function beginRound(roundId = partyGame.rounds[0].id) {
  await signIn();
  const game = partyGame;
  const round = getRound(game.id, roundId);
  if (!round) throw new Error("Unknown round");

  let missingGroups = false;
  const result = await transactSession((session, state) => {
    if (![phases.lobby, phases.intermission].includes(state.phase)) {
      return;
    }

    const players = currentPlayers(session, state);
    if (
      [roundTypes.pairingPrototype, roundTypes.charades].includes(round.type) &&
      !Object.keys(session.grouping?.groups ?? {}).length
    ) {
      missingGroups = true;
      return;
    }
    const lockedNames = Object.fromEntries(
      players.map((player) => [player.id, player.name]),
    );

    let grouping = session.grouping;
    if (round.type === roundTypes.spellingBee) {
      const groups = createGroups(players, groupingModes.individual);
      grouping = {
        mode: groupingModes.individual,
        participation: participationModes.turnBased,
        groups: Object.fromEntries(groups.map((group) => [group.id, group])),
        activeGroupId: groups[0]?.id ?? null,
        showAssignments: false,
        createdAt: Date.now(),
      };
    } else if (round.type === roundTypes.charades) {
      grouping = {
        ...grouping,
        participation: participationModes.turnBased,
        showAssignments: false,
      };
    }

    const { grouping: _previousGrouping, ...sessionWithoutGrouping } = session;
    return {
      ...sessionWithoutGrouping,
      ...(grouping ? { grouping } : {}),
      lockedNames,
      round: {
        id: round.id,
        type: round.type,
        submissions: {},
        itemIndex: 0,
        promptIndex: 0,
        attemptNumber: 1,
        correctGuesses: 0,
        skippedPrompts: 0,
        timer: null,
        displayMode: displayModeForPhase(round, phases.question),
        startedAt: Date.now(),
      },
      state: {
        ...state,
        step: 2,
        phase: round.media?.title ? phases.opening : phases.question,
        gameId: game.id,
        roundId: round.id,
        nextRoundId: null,
        phaseStartedAt: Date.now(),
      },
    };
  });
  if (!result.committed && missingGroups) {
    throw new Error("Create groups before starting this round");
  }
  return result;
}

export async function openRoundQuestion() {
  return transactSession((session, state) => {
    if (state.phase !== phases.opening) return;
    return {
      ...withPhase(session, state, phases.question),
      round: {
        ...session.round,
        displayMode: displayModeForPhase(
          getRound(state.gameId, state.roundId),
          phases.question,
        ),
      },
    };
  });
}

export async function markSpelling({ word, correct }) {
  const normalizedWord = String(word ?? "").trim().toUpperCase();
  if (!normalizedWord) throw new Error("The spelling word is missing");

  return transactSession((session, state) => {
    const definition = getRound(state.gameId, state.roundId);
    if (
      state.phase !== phases.question ||
      definition?.type !== roundTypes.spellingBee
    ) {
      return;
    }

    const activeGroup =
      session.grouping?.groups?.[session.grouping?.activeGroupId];
    const playerId = activeGroup?.memberIds?.[0];
    const player = session.players?.[playerId];
    if (!player) return;

    const points = correct ? definition.scoring?.correctPoints ?? 1 : 0;
    const players = {
      ...session.players,
      [playerId]: {
        ...player,
        score: (player.score ?? 0) + points,
      },
    };
    const result = {
      playerId,
      playerName: session.lockedNames?.[playerId] ?? player.name,
      word: normalizedWord,
      correct: Boolean(correct),
      points,
      markedAt: Date.now(),
    };

    return {
      ...session,
      players,
      round: {
        ...session.round,
        result,
        displayMode: displayModes.reveal,
        spellingResults: {
          ...(session.round?.spellingResults ?? {}),
          [`result-${Date.now()}`]: result,
        },
      },
      state: {
        ...state,
        phase: phases.reveal,
        phaseStartedAt: Date.now(),
      },
    };
  });
}

export async function advanceSpelling() {
  return transactSession((session, state) => {
    const definition = getRound(state.gameId, state.roundId);
    if (
      state.phase !== phases.reveal ||
      definition?.type !== roundTypes.spellingBee
    ) {
      return;
    }

    const groups = Object.values(session.grouping?.groups ?? {}).filter(
      (group) => group.memberIds?.length,
    );
    const activeIndex = groups.findIndex(
      (group) => group.id === session.grouping?.activeGroupId,
    );
    const nextGroup = groups[activeIndex + 1];
    if (!nextGroup) {
      return {
        ...withPhase(session, state, phases.leaderboard),
        round: {
          ...session.round,
          displayMode: displayModes.leaderboard,
        },
      };
    }

    return {
      ...session,
      grouping: {
        ...session.grouping,
        activeGroupId: nextGroup.id,
      },
      round: {
        ...session.round,
        itemIndex: (session.round?.itemIndex ?? 0) + 1,
        result: null,
        displayMode: displayModes.artwork,
      },
      state: {
        ...state,
        phase: phases.question,
        phaseStartedAt: Date.now(),
      },
    };
  });
}

export async function moveCharadesPrompt(direction) {
  const change = Number(direction);
  if (!Number.isInteger(change)) throw new Error("Prompt direction is invalid");
  return transactSession((session, state) => {
    const definition = getRound(state.gameId, state.roundId);
    if (
      state.phase !== phases.question ||
      definition?.type !== roundTypes.charades
    ) {
      return;
    }
    return {
      ...session,
      round: {
        ...session.round,
        promptIndex: Math.max(0, (session.round?.promptIndex ?? 0) + change),
      },
    };
  });
}

export async function recordCharadesAttempt(outcome) {
  if (!["correct", "skipped"].includes(outcome)) {
    throw new Error("Unknown Charades outcome");
  }
  return transactSession((session, state) => {
    const definition = getRound(state.gameId, state.roundId);
    if (
      state.phase !== phases.question ||
      definition?.type !== roundTypes.charades
    ) {
      return;
    }
    return {
      ...session,
      round: {
        ...session.round,
        promptIndex: (session.round?.promptIndex ?? 0) + 1,
        attemptNumber: (session.round?.attemptNumber ?? 1) + 1,
        correctGuesses:
          (session.round?.correctGuesses ?? 0) +
          (outcome === "correct" ? 1 : 0),
        skippedPrompts:
          (session.round?.skippedPrompts ?? 0) +
          (outcome === "skipped" ? 1 : 0),
      },
    };
  });
}

export async function startRoundTimer(durationSeconds = 60) {
  const duration = Number(durationSeconds);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Timer duration must be positive");
  }
  return transactSession((session, state) => {
    if (state.phase !== phases.question) return;
    const startedAt = Date.now();
    return {
      ...session,
      round: {
        ...session.round,
        timer: {
          status: "running",
          durationSeconds: duration,
          startedAt,
          endsAt: startedAt + duration * 1000,
        },
      },
    };
  });
}

export async function stopRoundTimer() {
  return transactSession((session, state) => {
    const timer = session.round?.timer;
    if (state.phase !== phases.question || timer?.status !== "running") return;
    const stoppedAt = Date.now();
    return {
      ...session,
      round: {
        ...session.round,
        timer: {
          ...timer,
          status: "stopped",
          stoppedAt,
          remainingSeconds: Math.max(
            0,
            Math.ceil((timer.endsAt - stoppedAt) / 1000),
          ),
        },
      },
    };
  });
}

export async function setRoundDisplayOverlay(enabled) {
  return transactSession((session, state) => {
    if (state.phase !== phases.question || !session.round) return;
    return {
      ...session,
      round: {
        ...session.round,
        displayMode: enabled ? displayModes.overlay : displayModes.artwork,
      },
    };
  });
}

export async function closeAnswers() {
  return transactSession((session, state) => {
    if (state.phase !== phases.question) return;
    const definition = getRound(state.gameId, state.roundId);
    let submissions = session.round?.submissions ?? {};

    if (
      [roundTypes.closestWins, roundTypes.mcq].includes(definition?.type)
    ) {
      submissions = Object.fromEntries(
        scoreRound(definition, orderedSubmissions(session, state)).map(
          (submission) => [
            submission.playerId,
            {
              ...session.round.submissions[submission.playerId],
              ...submission,
            },
          ],
        ),
      );
    }

    return {
      ...withPhase(session, state, phases.marking),
      round: { ...session.round, submissions },
    };
  });
}

export async function maybeAutoCloseAnswers() {
  return transactSession((session, state) => {
    if (state.phase !== phases.question) {
      return;
    }

    const round = getRound(state.gameId, state.roundId);
    if (!round?.submission?.autoCloseWhenComplete) {
      return;
    }

    const eligiblePlayers = currentPlayers(session, state).filter(
      (player) => player.connected,
    );
    const submissions = session.round?.submissions ?? {};

    if (shouldAutoCloseRound(round, eligiblePlayers, submissions)) {
      return withPhase(session, state, phases.marking);
    }
  });
}

export async function showLeaderboard() {
  return setPhase(phases.reveal, phases.leaderboard);
}

export async function showPairingLeaderboard() {
  return setPhase(phases.question, phases.leaderboard);
}

export async function showCharadesLeaderboard() {
  return transactSession((session, state) => {
    const definition = getRound(state.gameId, state.roundId);
    if (
      state.phase !== phases.question ||
      definition?.type !== roundTypes.charades
    ) {
      return;
    }
    return {
      ...withPhase(session, state, phases.leaderboard),
      round: {
        ...session.round,
        timer: null,
        displayMode: displayModes.leaderboard,
      },
    };
  });
}

export async function finishRound() {
  return transactSession((session, state) => {
    if (state.phase !== phases.leaderboard) return;
    const historyId = `${session.round?.id ?? "round"}-${
      session.round?.startedAt ?? Date.now()
    }`;
    const nextRound = getNextRound(state.gameId, state.roundId);
    const intermission = withPhase(session, state, phases.intermission);
    return {
      ...intermission,
      state: {
        ...intermission.state,
        nextRoundId: nextRound?.id ?? null,
      },
      roundHistory: {
        ...(session.roundHistory ?? {}),
        [historyId]: {
          ...session.round,
          finishedAt: Date.now(),
        },
      },
    };
  });
}

export async function submitAnswer(answer) {
  const user = await signIn();
  return submitAnswerForPlayer(user.uid, answer);
}

export async function submitAnswerForPlayer(playerId, answer) {
  let rejection = "Answers are closed";

  const result = await transactSession((session, state) => {
    if (state.phase !== phases.question) {
      return;
    }

    const player = session.players?.[playerId];
    if (!player || player.generation !== state.generation) {
      rejection = "Player is not registered for this game";
      return;
    }

    const submissions = session.round?.submissions ?? {};
    if (submissions[playerId]) {
      rejection = "Answer has already been submitted";
      return;
    }

    const definition = getRound(state.gameId, state.roundId);
    let normalized;
    try {
      normalized = normalizeSubmission(definition, answer);
    } catch (error) {
      rejection = error.message;
      return;
    }

    return {
      ...session,
      round: {
        ...session.round,
        submissions: {
          ...submissions,
          [playerId]: {
            ...normalized,
            submittedAt: Date.now(),
            status: "pending",
          },
        },
      },
    };
  });

  if (!result.committed) {
    throw new Error(rejection);
  }

  return result.snapshot.val().round.submissions[playerId];
}

export async function markSubmission(playerId, status) {
  if (!["correct", "incorrect"].includes(status)) {
    throw new Error("Unknown marking status");
  }

  return transactSession((session, state) => {
    if (state.phase !== phases.marking) {
      return;
    }

    const submission = session.round?.submissions?.[playerId];
    if (!submission) {
      return;
    }

    return {
      ...session,
      round: {
        ...session.round,
        submissions: {
          ...session.round.submissions,
          [playerId]: {
            ...submission,
            status,
          },
        },
      },
    };
  });
}

export async function markAllRemaining(status) {
  if (!["correct", "incorrect"].includes(status)) {
    throw new Error("Unknown marking status");
  }

  return transactSession((session, state) => {
    if (state.phase !== phases.marking) {
      return;
    }

    const submissions = Object.fromEntries(
      Object.entries(session.round?.submissions ?? {}).map(
        ([playerId, submission]) => [
          playerId,
          submission.status === "pending"
            ? { ...submission, status }
            : submission,
        ],
      ),
    );

    return {
      ...session,
      round: {
        ...session.round,
        submissions,
      },
    };
  });
}

export async function overrideSubmissionPoints(playerId, points) {
  const normalizedPoints = Number(points);
  if (!Number.isFinite(normalizedPoints)) {
    throw new Error("Points must be a number");
  }

  return transactSession((session, state) => {
    if (state.phase !== phases.marking) return;
    const submission = session.round?.submissions?.[playerId];
    if (!submission) return;
    return {
      ...session,
      round: {
        ...session.round,
        submissions: {
          ...session.round.submissions,
          [playerId]: {
            ...submission,
            points: normalizedPoints,
            pointsOverridden: true,
          },
        },
      },
    };
  });
}

export async function setSubmissionBonus(playerId, bonusPoints) {
  const bonus = Number(bonusPoints);
  if (!Number.isFinite(bonus)) throw new Error("Bonus must be a number");
  return transactSession((session, state) => {
    if (state.phase !== phases.marking) return;
    const submission = session.round?.submissions?.[playerId];
    if (!submission) return;
    return {
      ...session,
      round: {
        ...session.round,
        submissions: {
          ...session.round.submissions,
          [playerId]: {
            ...submission,
            bonusPoints: bonus,
          },
        },
      },
    };
  });
}

export async function openDefinitionVoting(realDefinition) {
  const definition = String(realDefinition ?? "").trim();
  if (!definition) throw new Error("The real definition is missing");
  return transactSession((session, state) => {
    const roundDefinition = getRound(state.gameId, state.roundId);
    if (
      state.phase !== phases.marking ||
      roundDefinition?.type !== roundTypes.myDefinition
    ) {
      return;
    }
    const options = [
      { id: "real", text: definition, real: true },
      ...orderedSubmissions(session, state).map((submission) => ({
        id: `fake-${submission.playerId}`,
        text: submission.answer,
        authorId: submission.playerId,
      })),
    ].sort((a, b) =>
      stableOptionOrder(session.round?.startedAt, a.id).localeCompare(
        stableOptionOrder(session.round?.startedAt, b.id),
      ),
    );
    return {
      ...session,
      round: {
        ...session.round,
        definitionOptions: options,
        votes: {},
      },
      state: {
        ...state,
        phase: phases.voting,
        phaseStartedAt: Date.now(),
      },
    };
  });
}

export async function submitDefinitionVote(optionId) {
  const user = await signIn();
  let rejection = "Voting is closed";
  const result = await transactSession((session, state) => {
    const definition = getRound(state.gameId, state.roundId);
    if (
      state.phase !== phases.voting ||
      definition?.type !== roundTypes.myDefinition
    ) {
      return;
    }
    const option = session.round?.definitionOptions?.find(
      (item) => item.id === optionId,
    );
    if (!option) {
      rejection = "Choose a valid definition";
      return;
    }
    if (option.authorId === user.uid) {
      rejection = "You cannot vote for your own definition";
      return;
    }
    return {
      ...session,
      round: {
        ...session.round,
        votes: {
          ...(session.round?.votes ?? {}),
          [user.uid]: optionId,
        },
      },
    };
  });
  if (!result.committed) throw new Error(rejection);
  return result;
}

export async function closeDefinitionVoting() {
  return transactSession((session, state) => {
    const definition = getRound(state.gameId, state.roundId);
    if (
      state.phase !== phases.voting ||
      definition?.type !== roundTypes.myDefinition
    ) {
      return;
    }
    const options = session.round?.definitionOptions ?? [];
    const awards = scoreDefinitionVotes(
      currentPlayers(session, state).map((player) => player.id),
      options,
      session.round?.votes,
    );
    const players = { ...session.players };
    for (const [playerId, points] of Object.entries(awards)) {
      if (!players[playerId]) continue;
      players[playerId] = {
        ...players[playerId],
        score: (players[playerId].score ?? 0) + points,
      };
    }
    const realOption = options.find((option) => option.real);
    return {
      ...session,
      players,
      round: {
        ...session.round,
        definitionScores: awards,
        result: {
          word: definition.word,
          definition: realOption?.text ?? "",
          points: awards,
          revealedAt: Date.now(),
        },
      },
      state: {
        ...state,
        phase: phases.reveal,
        phaseStartedAt: Date.now(),
      },
    };
  });
}

export async function scoreAndReveal() {
  let unmarked = false;

  const result = await transactSession((session, state) => {
    if (state.phase !== phases.marking) {
      return;
    }

    const ordered = orderedSubmissions(session, state);
    const roundDefinition = getRound(state.gameId, state.roundId);
    if (
      roundDefinition?.type === roundTypes.fastestFreeText &&
      ordered.some((submission) => submission.status === "pending")
    ) {
      unmarked = true;
      return;
    }

    const scored =
      roundDefinition?.type === roundTypes.closestWins
        ? ordered
        : scoreRound(roundDefinition, ordered);
    const submissions = { ...(session.round?.submissions ?? {}) };
    const players = applyRoundScores(session.players ?? {}, scored);

    for (const submission of scored) {
      const points = submission.points ?? 0;
      submissions[submission.playerId] = {
        ...submissions[submission.playerId],
        points,
      };

    }

    return {
      ...session,
      players,
      round: {
        ...session.round,
        submissions,
      },
      state: {
        ...state,
        phase: phases.reveal,
        phaseStartedAt: Date.now(),
      },
    };
  });

  if (!result.committed && unmarked) {
    throw new Error("Every submitted answer must be marked first");
  }

  return result;
}

async function setPhase(expectedPhase, nextPhase) {
  return transactSession((session, state) => {
    if (state.phase !== expectedPhase) {
      return;
    }

    return withPhase(session, state, nextPhase);
  });
}

function withPhase(session, state, phase) {
  return {
    ...session,
    state: {
      ...state,
      phase,
      phaseStartedAt: Date.now(),
    },
  };
}

async function transactSession(update) {
  await signIn();

  return runTransaction(ref(database, sessionPath), (session) => {
    const current = session ?? {};
    const state = validGameState(current);
    return update(current, state);
  });
}

function orderedSubmissions(session, state) {
  return Object.entries(session.round?.submissions ?? {})
    .map(([playerId, submission]) => ({
      playerId,
      playerName:
        session.lockedNames?.[playerId] ??
        session.players?.[playerId]?.name ??
        "Unknown player",
      ...submission,
    }))
    .filter(
      (submission) =>
        session.players?.[submission.playerId]?.generation === state.generation,
    )
    .sort(
      (a, b) =>
        (a.placing ?? Number.MAX_SAFE_INTEGER) -
          (b.placing ?? Number.MAX_SAFE_INTEGER) ||
        a.submittedAt - b.submittedAt ||
        a.playerId.localeCompare(b.playerId),
    );
}

function currentPlayers(session, state) {
  const connections = session.connections ?? {};
  return Object.entries(session.players ?? {})
    .map(([id, player]) => ({
      id,
      ...player,
      name:
        state.step > 1
          ? session.lockedNames?.[id] ?? player.name
          : player.name,
      connected: Object.values(connections[id] ?? {}).some(
        (connection) => connection?.generation === state.generation,
      ),
    }))
    .filter((player) => player.generation === state.generation);
}

function stableOptionOrder(seed, id) {
  let hash = Number(seed ?? 0) || 1;
  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
