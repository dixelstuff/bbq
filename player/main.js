import "../shared/styles.css";
import { joinPlayer } from "../shared/players.js";

const form = document.querySelector("#join-form");
const input = document.querySelector("#name");
const button = form.querySelector("button");
const status = document.querySelector("#status");

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
