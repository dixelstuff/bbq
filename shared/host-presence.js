import {
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  set,
} from "firebase/database";
import { database, signIn } from "./firebase.js";

const hostConnectionsPath = "sessions/default/hostConnections";

export async function maintainHostPresence() {
  await signIn();
  const connectionRef = push(ref(database, hostConnectionsPath));
  const disconnectOperation = onDisconnect(connectionRef);
  let stopped = false;

  await disconnectOperation.remove();
  await set(connectionRef, true);

  return () => {
    if (stopped) {
      return;
    }

    stopped = true;
    disconnectOperation.cancel().catch(() => {});
    remove(connectionRef).catch(() => {});
  };
}

export async function observeHostConnected(onChange) {
  await signIn();

  return onValue(ref(database, hostConnectionsPath), (snapshot) => {
    onChange(snapshot.exists() && snapshot.size > 0);
  });
}
