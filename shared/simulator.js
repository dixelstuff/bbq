import { ref, runTransaction } from "firebase/database";
import { database, signIn } from "./firebase.js";
import { submitAnswerForPlayer } from "./game-engine.js";
import { validSessionState } from "./session-state.js";
import { roundTypes } from "./round-types.js";

const sessionPath = "sessions/default";
const simulatedPrefix = "simulated-player-";

async function transact(update) {
  await signIn();
  return runTransaction(ref(database, sessionPath), (session) =>
    update(session ?? {}),
  );
}

export async function addSimulatedPlayers(count) {
  const requested = Math.max(1, Math.min(30, Number(count) || 1));

  const result = await transact((session) => {
    const state = validSessionState(session.state);
    if (state.step !== 1) {
      return;
    }

    const players = { ...(session.players ?? {}) };
    const connections = { ...(session.connections ?? {}) };
    let nextNumber = 1;

    for (let added = 0; added < requested; added += 1) {
      while (players[`${simulatedPrefix}${nextNumber}`]) {
        nextNumber += 1;
      }
      const id = `${simulatedPrefix}${nextNumber}`;
      players[id] = {
        name: `PLAYER ${nextNumber}`,
        generation: state.generation,
        joinedAt: Date.now() + added,
        updatedAt: Date.now(),
        score: 0,
        simulated: true,
      };
      connections[id] = {
        simulator: {
          generation: state.generation,
          connectedAt: Date.now(),
          simulated: true,
        },
      };
      nextNumber += 1;
    }

    return { ...session, players, connections };
  });

  if (!result.committed) {
    throw new Error("Simulated players can only join while the game is in the lobby");
  }

  return result;
}

export async function removeAllSimulatedPlayers() {
  return transact((session) => {
    const players = { ...(session.players ?? {}) };
    const connections = { ...(session.connections ?? {}) };
    const lockedNames = { ...(session.lockedNames ?? {}) };
    const submissions = { ...(session.round?.submissions ?? {}) };

    Object.entries(players).forEach(([id, player]) => {
      if (!player.simulated) return;
      delete players[id];
      delete connections[id];
      delete lockedNames[id];
      delete submissions[id];
    });

    return {
      ...session,
      players,
      connections,
      lockedNames,
      round: session.round
        ? { ...session.round, submissions }
        : session.round,
    };
  });
}

export async function setSimulatedPlayerConnected(playerId, connected) {
  return transact((session) => {
    const state = validSessionState(session.state);
    if (!session.players?.[playerId]?.simulated) return;

    const connections = { ...(session.connections ?? {}) };
    if (connected) {
      connections[playerId] = {
        simulator: {
          generation: state.generation,
          connectedAt: Date.now(),
          simulated: true,
        },
      };
    } else {
      delete connections[playerId];
    }
    return { ...session, connections };
  });
}

export async function submitSimulatedAnswer(playerId, answer) {
  return submitAnswerForPlayer(playerId, String(answer).trim());
}

export async function submitAllSimulatedAnswers(
  players,
  answer,
  delayMs = 0,
  round,
) {
  const eligible = players.filter(
    (player) => player.simulated && player.connected && !player.answer,
  );

  for (const [index, player] of eligible.entries()) {
    if (delayMs > 0 && index > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
    const generatedAnswer =
      round?.type === roundTypes.closestWins
        ? String(round.correctValue + (index - 1) * 125)
        : `ANSWER ${index + 1}`;
    await submitSimulatedAnswer(player.id, answer || generatedAnswer);
  }
}
