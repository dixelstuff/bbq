import {
  onDisconnect,
  onValue,
  ref,
  serverTimestamp,
  set,
} from "firebase/database";
import { database, signIn } from "./firebase.js";

const playersPath = "sessions/default/players";

export async function joinPlayer(name) {
  const user = await signIn();
  const playerRef = ref(database, `${playersPath}/${user.uid}`);

  // Register cleanup first so even a connection lost during the write cannot
  // leave a stale player behind.
  await onDisconnect(playerRef).remove();

  await set(playerRef, {
    name,
    joinedAt: serverTimestamp(),
  });
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
