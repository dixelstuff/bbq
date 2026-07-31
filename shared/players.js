import {
  get,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
} from "firebase/database";
import { database, signIn } from "./firebase.js";
import { validSessionState } from "./session-state.js";

const sessionPath = "sessions/default";
const connectedPath = ".info/connected";

export class NameLockedError extends Error {
  constructor() {
    super("Player names are locked for this game");
    this.name = "NameLockedError";
  }
}

export function normalizePlayerName(name) {
  return String(name ?? "").trim().toUpperCase();
}

export async function savePlayerName(name) {
  const normalizedName = normalizePlayerName(name);
  if (!normalizedName) {
    throw new Error("Player name is required");
  }
  const user = await signIn();
  const sessionRef = ref(database, sessionPath);
  let rejectedState;

  // Warm the complete session into the local cache before transacting at its
  // root. Without this, a newly opened browser may initially see only the
  // separately observed state child and make a false lock decision.
  const sessionSnapshot = await get(sessionRef);
  const expectedState = validSessionState(sessionSnapshot.val()?.state);

  if (expectedState.step !== 1) {
    throw new NameLockedError();
  }

  const result = await runTransaction(sessionRef, (session) => {
    const current = session ?? {};
    const cachedState = validSessionState(current.state);
    const state =
      cachedState.generation < expectedState.generation
        ? expectedState
        : cachedState;

    if (
      state.generation !== expectedState.generation ||
      state.step !== 1
    ) {
      rejectedState = cachedState;
      return;
    }

    const players = current.players ?? {};
    const existing = players[user.uid];

    return {
      ...current,
      state,
      players: {
        ...players,
        [user.uid]: {
          ...existing,
          name: normalizedName,
          generation: state.generation,
          joinedAt: existing?.joinedAt ?? Date.now(),
          updatedAt: Date.now(),
        },
      },
    };
  });

  if (!result.committed) {
    if (import.meta.env.DEV) {
      console.warn(
        `[BBQ development] Name transaction was rejected. Expected ${JSON.stringify(
          expectedState,
        )}; received ${JSON.stringify(rejectedState)}.`,
      );
    }
    throw new NameLockedError();
  }

  return {
    id: user.uid,
    ...result.snapshot.val().players[user.uid],
  };
}

export async function getJoinedPlayer(generation) {
  const user = await signIn();
  const snapshot = await get(ref(database, sessionPath));
  const session = snapshot.val() ?? {};
  const state = validSessionState(session.state);
  const player = session.players?.[user.uid];

  if (!player || player.generation !== generation) {
    return undefined;
  }

  return {
    id: user.uid,
    ...player,
    name:
      state.step > 1
        ? session.lockedNames?.[user.uid] ?? player.name
        : player.name,
  };
}

export async function maintainPlayerPresence(
  generation,
  onPresenceChange = () => {},
  signal,
) {
  const user = await signIn();
  const connectionRef = push(
    ref(database, `${sessionPath}/connections/${user.uid}`),
  );
  const disconnectOperation = onDisconnect(connectionRef);
  let connected = false;
  let stopped = false;
  let writeQueue = Promise.resolve();
  let pendingConfirmations = [];
  let stopConnectionObserver = () => {};
  let stopPresenceObserver = () => {};

  function stoppedError() {
    return new DOMException("Player presence restoration was replaced", "AbortError");
  }

  function rejectConfirmations(error) {
    const confirmations = pendingConfirmations;
    pendingConfirmations = [];
    confirmations.forEach(({ reject }) => reject(error));
  }

  function stop() {
    if (stopped) {
      return;
    }

    stopped = true;
    stopConnectionObserver();
    stopPresenceObserver();
    rejectConfirmations(stoppedError());
    signal?.removeEventListener("abort", stop);
    disconnectOperation.cancel().catch(logTransientError);
    remove(connectionRef).catch(logTransientError);
  }

  if (signal?.aborted) {
    stop();
    throw stoppedError();
  }

  signal?.addEventListener("abort", stop, { once: true });

  async function writePresence() {
    if (stopped || !connected) {
      return;
    }

    await disconnectOperation.remove();

    if (stopped || !connected) {
      return;
    }

    await set(connectionRef, {
      generation,
      connectedAt: serverTimestamp(),
    });

    const snapshot = await get(connectionRef);
    const confirmed =
      snapshot.exists() && snapshot.val()?.generation === generation;

    if (!confirmed) {
      throw new Error("Player connection was not confirmed");
    }

    const confirmations = pendingConfirmations;
    pendingConfirmations = [];
    confirmations.forEach(({ resolve }) => resolve());
  }

  function queuePresenceWrite() {
    writeQueue = writeQueue.catch(() => {}).then(writePresence);
    writeQueue.catch(rejectConfirmations);
    return writeQueue;
  }

  function logTransientError(error) {
    if (import.meta.env.DEV) {
      console.warn("[BBQ development] Transient presence write failed.", error);
    }
  }

  stopConnectionObserver = onValue(
    ref(database, connectedPath),
    (snapshot) => {
      connected = snapshot.val() === true;

      if (connected) {
        queuePresenceWrite().catch(logTransientError);
      } else {
        onPresenceChange(false);
      }
    },
    rejectConfirmations,
  );

  stopPresenceObserver = onValue(
    connectionRef,
    (snapshot) => {
      const confirmed =
        snapshot.exists() && snapshot.val()?.generation === generation;
      onPresenceChange(confirmed);

      if (!confirmed && connected) {
        queuePresenceWrite().catch(logTransientError);
      }
    },
    rejectConfirmations,
  );

  function confirmPresence() {
    return new Promise((resolve, reject) => {
      if (stopped) {
        reject(stoppedError());
        return;
      }

      pendingConfirmations.push({ resolve, reject });

      if (connected) {
        queuePresenceWrite().catch(logTransientError);
      }
    });
  }

  await confirmPresence();

  return {
    refresh: confirmPresence,
    stop,
  };
}

export async function observePlayers(onChange) {
  await signIn();

  return onValue(ref(database, sessionPath), (snapshot) => {
    const session = snapshot.val() ?? {};
    const { generation, step } = validSessionState(session.state);
    const connections = session.connections ?? {};
    const players = Object.entries(session.players ?? {})
      .map(([id, player]) => ({
        id,
        ...player,
        name:
          step > 1
            ? session.lockedNames?.[id] ?? player.name
            : player.name,
        connected: Object.values(connections[id] ?? {}).some(
          (connection) => connection?.generation === generation,
        ),
      }))
      .filter((player) => player.generation === generation)
      .sort((a, b) => {
        const joinedOrder = (a.joinedAt ?? 0) - (b.joinedAt ?? 0);
        return joinedOrder || a.name.localeCompare(b.name);
      });

    onChange(players);
  });
}
