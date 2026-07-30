import "../shared/styles.css";
import { observePlayers } from "../shared/players.js";

const message = document.querySelector("#message");

observePlayers((players) => {
  const count = players.length;
  message.textContent =
    count === 0
      ? "Waiting for host..."
      : `${count} ${count === 1 ? "player" : "players"} connected`;
}).catch(() => {
  message.textContent = "Waiting for host...";
});
