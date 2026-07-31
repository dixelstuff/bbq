import {
  get,
  onDisconnect,
  onValue,
  ref,
  serverTimestamp,
  set,
} from "firebase/database";
import { database, signIn } from "./firebase.js";

const playersPath = "sessions/default/players";
const connectedPath = ".info/connected";

export async function maintainPlayerPresence(name, onPresenceChange = () => {}) {
  const user = await signIn();
  const playerRef = ref(database, `${playersPath}/${user.uid}`);
  let connected = false;
  let stopped = false;
  let writeQueue = Promise.resolve();
  let pendingConfirmations = [];

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

    // A successful set is acknowledged by Firebase. Read the record back so
    // the Player UI only reports "You're in" after presence genuinely exists.
    const snapshot = await get(playerRef);
    const confirmed = snapshot.exists() && snapshot.val()?.name === name;

    if (!confirmed) {
      throw new Error("Player presence was not confirmed");
    }

    const confirmations = pendingConfirmations;
    pendingConfirmations = [];
    confirmations.forEach(({ resolve }) => resolve());
  }

  function rejectConfirmations(error) {
    const confirmations = pendingConfirmations;
    pendingConfirmations = [];
    confirmations.forEach(({ reject }) => reject(error));
  }

  function queuePresenceWrite() {
    // A transient failed write must not poison future reconnect attempts.
    writeQueue = writeQueue.catch(() => {}).then(writePresence);
    writeQueue.catch(rejectConfirmations);
    return writeQueue;
  }

  const stopConnectionObserver = onValue(
    ref(database, connectedPath),
    (snapshot) => {
      connected = snapshot.val() === true;

      if (connected) {
        queuePresenceWrite().catch(() => {});
      }
    },
    rejectConfirmations,
  );

  const stopPresenceObserver = onValue(
    playerRef,
    (snapshot) => {
      const confirmed = snapshot.exists() && snapshot.val()?.name === name;
      onPresenceChange(confirmed);

      // An old connection can finish its delayed onDisconnect after a new
      // connection has already restored the same player record.
      if (!confirmed && connected) {
        queuePresenceWrite().catch(() => {});
      }
    },
    rejectConfirmations,
  );

  function confirmPresence() {
    return new Promise((resolve, reject) => {
      pendingConfirmations.push({ resolve, reject });

      if (connected) {
        queuePresenceWrite().catch(() => {});
      }
    });
  }

  await confirmPresence();

  return {
    refresh() {
      return confirmPresence();
    },
    stop() {
      stopped = true;
      stopConnectionObserver();
      stopPresenceObserver();
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
