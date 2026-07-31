import { onValue, ref, runTransaction } from "firebase/database";
import { database, signIn } from "./firebase.js";

const sessionPath = "sessions/default";
const firstStep = 1;
const firstGeneration = 1;

export function validSessionState(value) {
  return {
    ...(value ?? {}),
    step:
      Number.isInteger(value?.step) && value.step >= firstStep
        ? value.step
        : firstStep,
    generation:
      Number.isInteger(value?.generation) && value.generation >= firstGeneration
        ? value.generation
        : firstGeneration,
  };
}

export async function observeSessionState(onChange) {
  await signIn();
  const sessionRef = ref(database, sessionPath);

  await runTransaction(sessionRef, (session) => {
    const current = session ?? {};
    return {
      ...current,
      state: validSessionState(current.state),
    };
  });

  return onValue(ref(database, `${sessionPath}/state`), (snapshot) => {
    onChange(validSessionState(snapshot.val()));
  });
}

export async function observeStep(onChange) {
  return observeSessionState(({ step }) => onChange(step));
}

export async function incrementStep() {
  await signIn();

  const result = await runTransaction(ref(database, sessionPath), (session) => {
    const current = session ?? {};
    const state = validSessionState(current.state);
    const lockedNames =
      state.step === firstStep
        ? Object.fromEntries(
            Object.entries(current.players ?? {})
              .filter(([, player]) => player?.generation === state.generation)
              .map(([id, player]) => [id, player.name]),
          )
        : current.lockedNames;

    return {
      ...current,
      lockedNames,
      state: {
        ...state,
        step: state.step + 1,
      },
    };
  });

  return validSessionState(result.snapshot.val()?.state).step;
}

export async function resetGame() {
  await signIn();

  const result = await runTransaction(ref(database, sessionPath), (session) => {
    const state = validSessionState(session?.state);

    // Replacing the complete session deliberately clears players, connections,
    // answers, scores, rounds, and any future per-game state in one operation.
    return {
      releaseId: session?.releaseId ?? null,
      hostConnections: session?.hostConnections ?? null,
      state: {
        step: firstStep,
        generation: state.generation + 1,
        phase: "lobby",
        resetAt: Date.now(),
      },
    };
  });

  return validSessionState(result.snapshot.val()?.state);
}

export async function ensureSessionRelease(releaseId) {
  await signIn();
  return runTransaction(ref(database, sessionPath), (session) => {
    if (session?.releaseId === releaseId) return;
    const state = validSessionState(session?.state);
    return {
      releaseId,
      hostConnections: session?.hostConnections ?? null,
      state: {
        step: firstStep,
        generation: state.generation + 1,
        phase: "lobby",
        resetAt: Date.now(),
      },
    };
  });
}
