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
}).catch(() => {
  emptyState.textContent = "Unable to connect to Firebase.";
});

observeStep((step) => {
  stepLabel.textContent = `Step ${step}`;
}).catch(() => {
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

  try {
    await action();
  } catch (error) {
    console.error("Unable to update session step", error);
  } finally {
    button.disabled = false;
  }
}
