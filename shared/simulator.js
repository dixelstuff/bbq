import { ref, runTransaction } from "firebase/database";
import { database, signIn } from "./firebase.js";
import { submitAnswerForPlayer } from "./game-engine.js";
import { validSessionState } from "./session-state.js";

const sessionPath = "sessions/default";
const simulatedPrefix = "simulated-player-";

function assertDevelopment() {
  if (!import.meta.env.DEV) {
    throw new Error("The player simulator is available only in development");
  }
}

async function transact(update) {
  assertDevelopment();
  await signIn();
  return runTransaction(ref(database, sessionPath), (session) =>
    update(session ?? {}),
  );
}

export async function addSimulatedPlayers(count) {
  const requested = Math.max(1, Math.min(30, Number(count) || 1));

  return transact((session) => {
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
  assertDevelopment();
  return submitAnswerForPlayer(playerId, String(answer).trim());
}

export async function submitAllSimulatedAnswers(players, answer, delayMs = 0) {
  assertDevelopment();
  const eligible = players.filter(
    (player) => player.simulated && player.connected && !player.answer,
  );

  for (const [index, player] of eligible.entries()) {
    if (delayMs > 0 && index > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
    await submitSimulatedAnswer(player.id, answer || `ANSWER ${index + 1}`);
  }
}
