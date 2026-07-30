import "../shared/styles.css";
import { observePlayers } from "../shared/players.js";

const emptyState = document.querySelector("#empty-state");
const playerList = document.querySelector("#players");

observePlayers((players) => {
  playerList.replaceChildren(
    ...players.map((player) => {
      const item = document.createElement("li");
      item.textContent = player.name;
      return item;
    }),
  );

  emptyState.hidden = players.length > 0;
  playerList.hidden = players.length === 0;
}).catch(() => {
  emptyState.textContent = "Unable to connect to Firebase.";
});
