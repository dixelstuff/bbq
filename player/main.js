import "../shared/styles.css";
import { maintainPlayerPresence } from "../shared/players.js";
import { observeStep } from "../shared/session-state.js";

const playerNameKey = "bbq.playerName";
const form = document.querySelector("#join-form");
const input = document.querySelector("#name");
const button = form.querySelector("button");
const screen = document.querySelector("#screen");
const status = document.querySelector("#status");
let presence;
let connectionPromise;

observeStep((step) => {
  screen.textContent = `Waiting — screen ${step}`;
}).catch(() => {
  screen.textContent = "Unable to connect";
});

const savedName = loadPlayerName();
if (savedName) {
  input.value = savedName;
  connect(savedName);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = input.value.trim();

  if (!name) {
    input.focus();
    return;
  }

  savePlayerName(name);
  connect(name);
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    restorePresence();
  }
});

// Mobile browsers may restore a page from their back-forward cache without a
// full reload. The online event covers the separate network-return lifecycle.
window.addEventListener("pageshow", restorePresence);
window.addEventListener("online", restorePresence);

async function connect(name) {
  if (connectionPromise) {
    return connectionPromise;
  }

  button.disabled = true;
  button.textContent = "JOINING";
  status.dataset.error = "false";
  status.textContent = "Connecting...";

  connectionPromise = maintainPlayerPresence(name)
    .then((playerPresence) => {
      presence = playerPresence;
      input.disabled = true;
      button.textContent = "JOINED";
      status.textContent = `You’re in, ${name}.`;
    })
    .catch((error) => {
      connectionPromise = undefined;
      showConnectionError(error);
    });

  return connectionPromise;
}

function restorePresence() {
  if (presence) {
    presence.refresh().catch(showConnectionError);
    return;
  }

  const name = loadPlayerName();
  if (name) {
    connect(name);
  }
}

function showConnectionError(error) {
  console.error("Unable to connect player", error);
  button.disabled = false;
  button.textContent = "JOIN";
  status.dataset.error = "true";
  status.textContent = "Couldn’t connect. Check the connection and try again.";
}

function loadPlayerName() {
  try {
    return localStorage.getItem(playerNameKey)?.trim() || "";
  } catch {
    return "";
  }
}

function savePlayerName(name) {
  try {
    localStorage.setItem(playerNameKey, name);
  } catch {
    // Storage can be unavailable in strict private-browsing modes. The player
    // can still join for the lifetime of the page.
  }
}
