import "../shared/styles.css";
import { maintainPlayerPresence } from "../shared/players.js";
import { observeStep } from "../shared/session-state.js";

const hostPassword = "bigfat";
const hostAccessKey = "bbq.hostAccess";
const playerNameKey = "bbq.playerName";
const playerStepKey = "bbq.currentStep";
const reconnectDelay = 4000;

const form = document.querySelector("#join-form");
const input = document.querySelector("#name");
const joinButton = form.querySelector('button[type="submit"]');
const reconnectButton = document.querySelector("#reconnect");
const screen = document.querySelector("#screen");
const status = document.querySelector("#status");
const hostDialog = document.querySelector("#host-dialog");
const hostForm = document.querySelector("#host-form");
const hostPasswordInput = document.querySelector("#host-password");
const hostError = document.querySelector("#host-error");
const hostOpenButton = document.querySelector("#host-open");
const hostCancelButton = document.querySelector("#host-cancel");
const playerBadge = document.querySelector("#player-badge");
const gameConnectionStatus = document.querySelector("#game-connection-status");

let presence;
let restoreAttempt;
let reconnectTimer;
let restoreController;
let currentStep = loadSavedStep();

screen.textContent = `Waiting — screen ${currentStep}`;

observeStep((step) => {
  currentStep = step;
  saveStep(step);
  screen.textContent = `Waiting — screen ${step}`;
  updatePlayerMode();
}).catch(() => {
  screen.textContent = "Unable to connect";
});

const savedName = loadPlayerName();
updatePlayerMode();
if (savedName) {
  input.value = savedName;
  restorePresence();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = input.value.trim();

  if (!name) {
    input.focus();
    return;
  }

  savePlayerName(name);
  updatePlayerMode();
  restorePresence(true);
});

reconnectButton.addEventListener("click", () => restorePresence(true));

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    restorePresence(true);
  }
});

// Mobile browsers may restore a page from their back-forward cache without a
// full reload. The online event covers the separate network-return lifecycle.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    restorePresence(true);
  }
});
window.addEventListener("online", () => restorePresence(true));

hostOpenButton.addEventListener("click", () => {
  hostError.textContent = "";
  hostDialog.showModal();
  hostPasswordInput.focus();
});

hostCancelButton.addEventListener("click", () => {
  hostDialog.close();
});

hostForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (hostPasswordInput.value !== hostPassword) {
    hostError.dataset.error = "true";
    hostError.textContent = "Incorrect password.";
    hostPasswordInput.select();
    return;
  }

  sessionStorage.setItem(hostAccessKey, "granted");
  const hostUrl = new URL(`${import.meta.env.BASE_URL}host/`, window.location.origin);
  window.location.assign(hostUrl);
});

function restorePresence(force = false) {
  const name = loadPlayerName();

  if (!name) {
    return;
  }

  if (restoreAttempt && !force) {
    return;
  }

  if (force) {
    presence?.stop();
    presence = undefined;
    restoreController?.abort();
  }

  const controller = new AbortController();
  restoreController = controller;

  // Never carry a previous success message into a new restoration attempt.
  beginReconnecting(name);

  const attempt = presence
    ? presence.refresh()
    : maintainPlayerPresence(name, handlePresenceChange, controller.signal).then(
        (playerPresence) => {
          if (restoreController !== controller) {
            playerPresence.stop();
            return;
          }

          presence = playerPresence;
        },
      );

  restoreAttempt = attempt;

  attempt
    .then(() => {
      if (restoreAttempt !== attempt) {
        return;
      }

      showConnected(name);
    })
    .catch((error) => {
      if (restoreAttempt !== attempt || error?.name === "AbortError") {
        return;
      }

      showReconnectButton(error);
    })
    .finally(() => {
      if (restoreAttempt === attempt) {
        restoreAttempt = undefined;
        clearTimeout(reconnectTimer);
      }
  });
}

function beginReconnecting(name) {
  showReconnecting(name);
  clearTimeout(reconnectTimer);
  reconnectTimer = window.setTimeout(showReconnectTimeout, reconnectDelay);
}

function handlePresenceChange(confirmed) {
  const name = loadPlayerName();

  if (!name) {
    return;
  }

  if (confirmed) {
    clearTimeout(reconnectTimer);
    showConnected(name);
    return;
  }

  beginReconnecting(name);
}

function showReconnectTimeout() {
  if (isGameStarted()) {
    gameConnectionStatus.hidden = false;
    gameConnectionStatus.dataset.error = "true";
    gameConnectionStatus.textContent = "Connection lost. Reconnecting…";
    return;
  }

  reconnectButton.hidden = false;
  status.dataset.error = "true";
  status.textContent = "Still reconnecting. Tap below to try again.";
}

function showReconnecting(name) {
  updateBadge(name);
  input.value = name;
  input.disabled = true;
  joinButton.disabled = true;
  joinButton.textContent = "RECONNECTING…";
  reconnectButton.hidden = true;
  status.dataset.error = "false";
  status.textContent = "Reconnecting…";
  gameConnectionStatus.hidden = true;
}

function showConnected(name) {
  updateBadge(name);
  input.value = name;
  input.disabled = true;
  joinButton.disabled = true;
  joinButton.textContent = "JOINED";
  reconnectButton.hidden = true;
  status.dataset.error = "false";
  status.textContent = `You’re in, ${name}.`;
  gameConnectionStatus.hidden = true;
}

function showReconnectButton(error) {
  console.error("Unable to restore player presence", error);

  if (isGameStarted()) {
    gameConnectionStatus.hidden = false;
    gameConnectionStatus.dataset.error = "true";
    gameConnectionStatus.textContent = "Connection lost. Reconnecting…";
    return;
  }

  joinButton.hidden = true;
  reconnectButton.hidden = false;
  status.dataset.error = "true";
  status.textContent = "You’re disconnected. Tap below to reconnect.";
}

function isGameStarted() {
  return currentStep > 1;
}

function updateBadge(name = loadPlayerName()) {
  playerBadge.textContent = name;
}

function updatePlayerMode() {
  const gameStarted = isGameStarted();
  const name = loadPlayerName();

  form.hidden = gameStarted;
  hostOpenButton.hidden = gameStarted;
  playerBadge.hidden = !gameStarted || !name;

  if (gameStarted) {
    updateBadge(name);
    if (hostDialog.open) {
      hostDialog.close();
    }
  } else {
    gameConnectionStatus.hidden = true;
  }
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

function loadSavedStep() {
  try {
    const step = Number.parseInt(localStorage.getItem(playerStepKey), 10);
    return Number.isInteger(step) && step >= 1 ? step : 1;
  } catch {
    return 1;
  }
}

function saveStep(step) {
  try {
    localStorage.setItem(playerStepKey, String(step));
  } catch {
    // The live Firebase value remains authoritative when storage is unavailable.
  }
}
