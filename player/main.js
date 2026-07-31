import "../shared/development.js";
import "../shared/styles.css";
import { maintainPlayerPresence } from "../shared/players.js";
import { restartDatabaseConnection } from "../shared/firebase.js";
import { observeStep } from "../shared/session-state.js";

const hostPassword = "bigfat";
const hostAccessKey = "bbq.hostAccess";
const playerNameKey = "bbq.playerName";
const playerStepKey = "bbq.currentStep";
const retryDelay = 5000;
const failureDelay = 15000;
const lifecycleDebounce = 150;

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
const debugPanel = document.querySelector("#debug-panel");
const debugConnection = document.querySelector("#debug-connection");
const debugName = document.querySelector("#debug-name");
const debugScreen = document.querySelector("#debug-screen");
const debugReconnect = document.querySelector("#debug-reconnect");

let presence;
let restoreAttempt;
let retryTimer;
let failureTimer;
let lifecycleTimer;
let stepRetryTimer;
let stopStepObserver;
let stepObserverGeneration = 0;
let restoreController;
let attemptNumber = 0;
let currentStep = loadSavedStep();

debugPanel.hidden = !import.meta.env.DEV;
screen.textContent = `Waiting — screen ${currentStep}`;
updateDebugPanel();

startStepObserver();

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

reconnectButton.addEventListener("click", () => {
  requestRecovery("manual reconnect", true);
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    requestRecovery("page returned to foreground", true);
  }
});

// Mobile browsers may restore a page from their back-forward cache without a
// full reload. The online event covers the separate network-return lifecycle.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    requestRecovery("page restored from cache", true);
  }
});
window.addEventListener("online", () => {
  requestRecovery("network came online", true);
});
window.addEventListener("offline", () => {
  clearTimeout(retryTimer);
  setConnectionState("Disconnected");
  logDevelopment("Browser reported that the network is offline.");
  scheduleFailureMessage();
});

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

function requestRecovery(reason, restartTransport = false) {
  const name = loadPlayerName();

  if (!name) {
    return;
  }

  clearTimeout(lifecycleTimer);
  lifecycleTimer = window.setTimeout(() => {
    startStepObserver(true);
    restorePresence(true, reason, restartTransport);
  }, lifecycleDebounce);
}

function startStepObserver(force = false) {
  if (force) {
    stopStepObserver?.();
    stopStepObserver = undefined;
  } else if (stopStepObserver) {
    return;
  }

  clearTimeout(stepRetryTimer);
  stepObserverGeneration += 1;
  const generation = stepObserverGeneration;

  observeStep((step) => {
    if (generation !== stepObserverGeneration) {
      return;
    }

    currentStep = step;
    saveStep(step);
    screen.textContent = `Waiting — screen ${step}`;
    updatePlayerMode();
    updateDebugPanel();
  })
    .then((stopObserver) => {
      if (generation !== stepObserverGeneration) {
        stopObserver();
        return;
      }

      stopStepObserver = stopObserver;
    })
    .catch((error) => {
      if (generation !== stepObserverGeneration) {
        return;
      }

      console.error(
        "[BBQ player] Unable to observe the current screen; retrying.",
        error,
      );
      screen.textContent = "Unable to connect";
      stepRetryTimer = window.setTimeout(startStepObserver, retryDelay);
    });
}

function restorePresence(
  force = false,
  reason = "initial player restoration",
  restartTransport = false,
) {
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

  clearRecoveryTimers();

  if (restartTransport) {
    restartDatabaseConnection();
  }

  const controller = new AbortController();
  restoreController = controller;
  attemptNumber += 1;
  const currentAttemptNumber = attemptNumber;
  const attemptStarted = new Date();
  debugReconnect.textContent = formatAttempt(attemptStarted, reason);
  logDevelopment(`Reconnect attempt ${attemptNumber}: ${reason}.`);

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
      logDevelopment(`Presence confirmed for ${name}.`);
    })
    .catch((error) => {
      if (restoreAttempt !== attempt || error?.name === "AbortError") {
        return;
      }

      console.error(
        `[BBQ player] Reconnect attempt ${currentAttemptNumber} failed (${reason}); automatic recovery remains active.`,
        error,
      );
      setConnectionState("Reconnecting");
    })
    .finally(() => {
      if (restoreAttempt === attempt) {
        restoreAttempt = undefined;
      }
  });

  retryTimer = window.setTimeout(() => {
    if (restoreAttempt === attempt || !presence) {
      restorePresence(true, "automatic recovery watchdog", true);
    }
  }, retryDelay);

  scheduleFailureMessage();
}

function beginReconnecting(name) {
  showReconnecting(name);
}

function handlePresenceChange(confirmed) {
  const name = loadPlayerName();

  if (!name) {
    return;
  }

  if (confirmed) {
    clearRecoveryTimers();
    showConnected(name);
    return;
  }

  logDevelopment("Firebase presence record is missing; restoring it.");
  beginReconnecting(name);
  retryTimer = window.setTimeout(() => {
    restorePresence(true, "presence record disappeared", true);
  }, retryDelay);
  scheduleFailureMessage();
}

function showReconnectTimeout() {
  failureTimer = undefined;
  setConnectionState("Disconnected");

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
  setConnectionState("Reconnecting");
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
  clearRecoveryTimers();
  setConnectionState("Connected");
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

function scheduleFailureMessage() {
  if (failureTimer) {
    return;
  }

  failureTimer = window.setTimeout(showReconnectTimeout, failureDelay);
}

function clearRecoveryTimers() {
  clearTimeout(retryTimer);
  clearTimeout(failureTimer);
  retryTimer = undefined;
  failureTimer = undefined;
}

function setConnectionState(connectionState) {
  debugConnection.textContent = connectionState;
  debugConnection.dataset.state = connectionState.toLowerCase();
  updateDebugPanel();
}

function updateDebugPanel() {
  debugName.textContent = loadPlayerName() || "Not joined";
  debugScreen.textContent = String(currentStep);
}

function formatAttempt(date, reason) {
  return `${date.toLocaleTimeString()} — ${reason}`;
}

function logDevelopment(message, details) {
  if (!import.meta.env.DEV) {
    return;
  }

  if (details) {
    console.info(`[BBQ development] ${message}`, details);
  } else {
    console.info(`[BBQ development] ${message}`);
  }
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
    console.error("[BBQ player] Unable to read the saved player name.");
    return "";
  }
}

function savePlayerName(name) {
  try {
    localStorage.setItem(playerNameKey, name);
  } catch (error) {
    console.error("[BBQ player] Unable to save the player name.", error);
    // Storage can be unavailable in strict private-browsing modes. The player
    // can still join for the lifetime of the page.
  }
}

function loadSavedStep() {
  try {
    const step = Number.parseInt(localStorage.getItem(playerStepKey), 10);
    return Number.isInteger(step) && step >= 1 ? step : 1;
  } catch (error) {
    console.error("[BBQ player] Unable to read the saved screen.", error);
    return 1;
  }
}

function saveStep(step) {
  try {
    localStorage.setItem(playerStepKey, String(step));
  } catch (error) {
    console.error("[BBQ player] Unable to save the current screen.", error);
    // The live Firebase value remains authoritative when storage is unavailable.
  }
}
