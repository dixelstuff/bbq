import { onValue, ref, runTransaction } from "firebase/database";
import { database, signIn } from "./firebase.js";
import { fastestCorrectAnswerGame, getRound } from "./games/fastest-correct-answer.js";
import { validSessionState } from "./session-state.js";

const sessionPath = "sessions/default";
const phases = {
  lobby: "lobby",
  question: "question",
  marking: "marking",
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
      submissions,
      players,
      leaderboard: [...players].sort(
        (a, b) => (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name),
      ),
    });
  });
}

export async function beginFirstGame() {
  await signIn();
  const game = fastestCorrectAnswerGame;
  const round = game.rounds[0];

  return transactSession((session, state) => {
    if (state.phase !== phases.lobby) {
      return;
    }

    const players = currentPlayers(session, state);
    const lockedNames = Object.fromEntries(
      players.map((player) => [player.id, player.name]),
    );

    return {
      ...session,
      lockedNames,
      game: {
        id: game.id,
        roundId: round.id,
        submissions: {},
      },
      state: {
        ...state,
        step: 2,
        phase: phases.question,
        gameId: game.id,
        roundId: round.id,
        phaseStartedAt: Date.now(),
      },
    };
  });
}

export async function closeAnswers() {
  return setPhase(phases.question, phases.marking);
}

export async function showLeaderboard() {
  return setPhase(phases.reveal, phases.leaderboard);
}

export async function finishGame() {
  return setPhase(phases.leaderboard, phases.intermission);
}

export async function submitAnswer(answer) {
  const user = await signIn();
  let rejection = "Answers are closed";

  const result = await transactSession((session, state) => {
    if (state.phase !== phases.question) {
      return;
    }

    const player = session.players?.[user.uid];
    if (!player || player.generation !== state.generation) {
      rejection = "Player is not registered for this game";
      return;
    }

    const submissions = session.game?.submissions ?? {};
    if (submissions[user.uid]) {
      rejection = "Answer has already been submitted";
      return;
    }

    return {
      ...session,
      game: {
        ...session.game,
        submissions: {
          ...submissions,
          [user.uid]: {
            answer,
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

  return result.snapshot.val().game.submissions[user.uid];
}

export async function markSubmission(playerId, status) {
  if (!["correct", "incorrect"].includes(status)) {
    throw new Error("Unknown marking status");
  }

  return transactSession((session, state) => {
    if (state.phase !== phases.marking) {
      return;
    }

    const submission = session.game?.submissions?.[playerId];
    if (!submission) {
      return;
    }

    return {
      ...session,
      game: {
        ...session.game,
        submissions: {
          ...session.game.submissions,
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
      Object.entries(session.game?.submissions ?? {}).map(
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
      game: {
        ...session.game,
        submissions,
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
    if (ordered.some((submission) => submission.status === "pending")) {
      unmarked = true;
      return;
    }

    let fastestCorrectAwarded = false;
    const submissions = { ...(session.game?.submissions ?? {}) };
    const players = { ...(session.players ?? {}) };

    for (const submission of ordered) {
      let points = 0;
      if (submission.status === "correct") {
        points = fastestCorrectAwarded ? 1 : 2;
        fastestCorrectAwarded = true;
      }

      submissions[submission.playerId] = {
        ...submissions[submission.playerId],
        points,
      };

      const player = players[submission.playerId];
      if (player) {
        players[submission.playerId] = {
          ...player,
          score: (player.score ?? 0) + points,
        };
      }
    }

    return {
      ...session,
      players,
      game: {
        ...session.game,
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

    return {
      ...session,
      state: {
        ...state,
        phase: nextPhase,
        phaseStartedAt: Date.now(),
      },
    };
  });
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
  return Object.entries(session.game?.submissions ?? {})
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
    .sort((a, b) => a.submittedAt - b.submittedAt);
}

function currentPlayers(session, state) {
  return Object.entries(session.players ?? {})
    .map(([id, player]) => ({
      id,
      ...player,
      name:
        state.step > 1
          ? session.lockedNames?.[id] ?? player.name
          : player.name,
    }))
    .filter((player) => player.generation === state.generation);
}
