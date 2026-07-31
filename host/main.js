import "../shared/development.js";
import "../shared/styles.css";
import { observePlayers } from "../shared/players.js";
import {
  incrementStep,
  observeStep,
  resetStep,
} from "../shared/session-state.js";

const emptyState = document.querySelector("#empty-state");
const nextButton = document.querySelector("#next");
const playerList = document.querySelector("#players");
const resetButton = document.querySelector("#reset");
const actionStatus = document.querySelector("#action-status");
const stepLabel = document.querySelector("#step");

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
}).catch((error) => {
  console.error("[BBQ host] Unable to observe players.", error);
  emptyState.textContent = "Unable to connect to Firebase.";
});

observeStep((step) => {
  stepLabel.textContent = `Step ${step}`;
}).catch((error) => {
  console.error("[BBQ host] Unable to observe the current step.", error);
  stepLabel.textContent = "Unable to connect to Firebase.";
});

nextButton.addEventListener("click", async () => {
  await runAction(nextButton, incrementStep);
});

resetButton.addEventListener("click", async () => {
  await runAction(resetButton, resetStep);
});

async function runAction(button, action) {
  button.disabled = true;
  actionStatus.dataset.error = "false";
  actionStatus.textContent = "";

  try {
    const step = await action();
    stepLabel.textContent = `Step ${step}`;
  } catch (error) {
    console.error("Unable to update session step", error);
    actionStatus.dataset.error = "true";
    actionStatus.textContent = "Couldn’t update the step. Check the connection.";
  } finally {
    button.disabled = false;
  }
}
