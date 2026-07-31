import "../shared/styles.css";
import { maintainPlayerPresence } from "../shared/players.js";
import { observeStep } from "../shared/session-state.js";

const hostPassword = "bigfat";
const hostAccessKey = "bbq.hostAccess";
const playerNameKey = "bbq.playerName";
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

let presence;
let restoreAttempt;
let reconnectTimer;

observeStep((step) => {
  screen.textContent = `Waiting — screen ${step}`;
}).catch(() => {
  screen.textContent = "Unable to connect";
});

const savedName = loadPlayerName();
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
  restorePresence();
});

reconnectButton.addEventListener("click", () => restorePresence(true));

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    restorePresence();
  }
});

// Mobile browsers may restore a page from their back-forward cache without a
// full reload. The online event covers the separate network-return lifecycle.
window.addEventListener("pageshow", restorePresence);
window.addEventListener("online", restorePresence);

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

  if (!name || (restoreAttempt && !force)) {
    return;
  }

  // Never carry a previous success message into a new restoration attempt.
  showReconnecting(name);

  clearTimeout(reconnectTimer);
  reconnectTimer = window.setTimeout(() => {
    if (restoreAttempt) {
      reconnectButton.hidden = false;
      status.dataset.error = "true";
      status.textContent = "Still reconnecting. Tap below to try again.";
    }
  }, reconnectDelay);

  const attempt = presence
    ? presence.refresh()
    : maintainPlayerPresence(name).then((playerPresence) => {
        presence = playerPresence;
      });

  restoreAttempt = attempt;

  attempt
    .then(() => {
      if (restoreAttempt !== attempt) {
        return;
      }

      showConnected(name);
    })
    .catch((error) => {
      if (restoreAttempt !== attempt) {
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

function showReconnecting(name) {
  input.value = name;
  input.disabled = true;
  joinButton.disabled = true;
  joinButton.textContent = "RECONNECTING…";
  reconnectButton.hidden = true;
  status.dataset.error = "false";
  status.textContent = "Reconnecting…";
}

function showConnected(name) {
  input.value = name;
  input.disabled = true;
  joinButton.disabled = true;
  joinButton.textContent = "JOINED";
  reconnectButton.hidden = true;
  status.dataset.error = "false";
  status.textContent = `You’re in, ${name}.`;
}

function showReconnectButton(error) {
  console.error("Unable to restore player presence", error);
  joinButton.hidden = true;
  reconnectButton.hidden = false;
  status.dataset.error = "true";
  status.textContent = "You’re disconnected. Tap below to reconnect.";
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
