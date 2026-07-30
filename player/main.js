import "../shared/styles.css";
import { joinPlayer } from "../shared/players.js";
import { observeStep } from "../shared/session-state.js";

const form = document.querySelector("#join-form");
const input = document.querySelector("#name");
const button = form.querySelector("button");
const screen = document.querySelector("#screen");
const status = document.querySelector("#status");

observeStep((step) => {
  screen.textContent = `Waiting — screen ${step}`;
}).catch(() => {
  screen.textContent = "Unable to connect";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = input.value.trim();
  if (!name) {
    input.focus();
    return;
  }

  button.disabled = true;
  status.dataset.error = "false";
  status.textContent = "Joining...";

  try {
    await joinPlayer(name);
    input.disabled = true;
    button.textContent = "JOINED";
    status.textContent = `You’re in, ${name}.`;
  } catch (error) {
    console.error("Unable to join", error);
    button.disabled = false;
    status.dataset.error = "true";
    status.textContent = "Couldn’t join. Check the connection and try again.";
  }
});
