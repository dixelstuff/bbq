import {
  onDisconnect,
  onValue,
  ref,
  serverTimestamp,
  set,
} from "firebase/database";
import { database, signIn } from "./firebase.js";

const playersPath = "sessions/default/players";
const connectedPath = ".info/connected";

export async function maintainPlayerPresence(name) {
  const user = await signIn();
  const playerRef = ref(database, `${playersPath}/${user.uid}`);
  let connected = false;
  let stopped = false;
  let writeQueue = Promise.resolve();
  let resolveReady;
  let rejectReady;

  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  async function writePresence() {
    if (stopped || !connected) {
      return;
    }

    // Register cleanup before every write. Firebase clears onDisconnect
    // handlers after a disconnect, so they must be restored on reconnection.
    await onDisconnect(playerRef).remove();
    await set(playerRef, {
      name,
      joinedAt: serverTimestamp(),
    });

    resolveReady();
  }

  function queuePresenceWrite() {
    // A transient failed write must not poison future reconnect attempts.
    writeQueue = writeQueue.catch(() => {}).then(writePresence);
    writeQueue.catch(rejectReady);
    return writeQueue;
  }

  const stopConnectionObserver = onValue(
    ref(database, connectedPath),
    (snapshot) => {
      connected = snapshot.val() === true;

      if (connected) {
        queuePresenceWrite();
      }
    },
    rejectReady,
  );

  await ready;

  return {
    refresh() {
      return queuePresenceWrite();
    },
    stop() {
      stopped = true;
      stopConnectionObserver();
    },
  };
}

export async function observePlayers(onChange) {
  await signIn();

  return onValue(ref(database, playersPath), (snapshot) => {
    const players = Object.entries(snapshot.val() ?? {})
      .map(([id, player]) => ({ id, ...player }))
      .sort((a, b) => {
        const joinedOrder = (a.joinedAt ?? 0) - (b.joinedAt ?? 0);
        return joinedOrder || a.name.localeCompare(b.name);
      });

    onChange(players);
  });
}
