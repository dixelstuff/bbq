import "../shared/development.js";
import "../shared/styles.css";
import { observePlayers } from "../shared/players.js";
import {
  incrementStep,
  observeSessionState,
  resetGame,
} from "../shared/session-state.js";

const emptyState = document.querySelector("#empty-state");
const nextButton = document.querySelector("#next");
const playerList = document.querySelector("#players");
const resetButton = document.querySelector("#reset-game");
const resetDialog = document.querySelector("#reset-dialog");
const resetConfirmButton = document.querySelector("#reset-confirm");
const resetCancelButton = document.querySelector("#reset-cancel");
const actionStatus = document.querySelector("#action-status");
const stepLabel = document.querySelector("#step");

observePlayers((players) => {
  playerList.replaceChildren(
    ...players.map((player) => {
      const item = document.createElement("li");
      const name = document.createElement("span");
      const connection = document.createElement("span");

      item.className = player.connected
        ? "host-player connected"
        : "host-player disconnected";
      name.textContent = player.name;
      connection.className = "connection-label";
      connection.textContent = player.connected ? "Connected" : "Disconnected";
      item.append(name, connection);
      return item;
    }),
  );

  emptyState.hidden = players.length > 0;
  playerList.hidden = players.length === 0;
}).catch((error) => {
  console.error("[BBQ host] Unable to observe players.", error);
  emptyState.textContent = "Unable to connect to Firebase.";
});

observeSessionState(({ step }) => {
  stepLabel.textContent = `Step ${step}`;
}).catch((error) => {
  console.error("[BBQ host] Unable to observe the current step.", error);
  stepLabel.textContent = "Unable to connect to Firebase.";
});

nextButton.addEventListener("click", async () => {
  await runAction(nextButton, incrementStep);
});

resetButton.addEventListener("click", () => {
  resetDialog.showModal();
});

resetCancelButton.addEventListener("click", () => {
  resetDialog.close();
});

resetConfirmButton.addEventListener("click", async () => {
  resetDialog.close();
  await runAction(resetButton, async () => {
    const state = await resetGame();
    return state.step;
  });
});

async function runAction(button, action) {
  button.disabled = true;
  actionStatus.dataset.error = "false";
  actionStatus.textContent = "";

  try {
    const step = await action();
    stepLabel.textContent = `Step ${step}`;
  } catch (error) {
    console.error("Unable to update the game", error);
    actionStatus.dataset.error = "true";
    actionStatus.textContent = "Couldn’t update the game. Check the connection.";
  } finally {
    button.disabled = false;
  }
}
