import "../shared/styles.css";
import { observePlayers } from "../shared/players.js";
import { observeStep } from "../shared/session-state.js";

const playerCount = document.querySelector("#players");
const screen = document.querySelector("#screen");

observePlayers((players) => {
  const count = players.length;
  playerCount.textContent =
    count === 0
      ? "Waiting for host..."
      : `${count} ${count === 1 ? "player" : "players"} connected`;
}).catch(() => {
  playerCount.textContent = "Waiting for host...";
});

observeStep((step) => {
  screen.textContent = `Screen ${step}`;
}).catch(() => {
  screen.textContent = "Unable to connect";
});
