import "../shared/development.js";
import "../shared/styles.css";
import { restartDatabaseConnection } from "../shared/firebase.js";
import {
  getJoinedPlayer,
  maintainPlayerPresence,
  NameLockedError,
  savePlayerName as savePlayerNameToFirebase,
} from "../shared/players.js";
import { observeSessionState } from "../shared/session-state.js";

const hostPassword = "bigfat";
const hostAccessKey = "bbq.hostAccess";
const playerNameKey = "bbq.playerName";
const playerGenerationKey = "bbq.playerGeneration";
const playerStepKey = "bbq.currentStep";
const retryDelay = 5000;
const failureDelay = 12000;
const lifecycleDebounce = 150;
const nameDebounce = 350;

const form = document.querySelector("#join-form");
const input = document.querySelector("#name");
const joinButton = form.querySelector('button[type="submit"]');
const screen = document.querySelector("#screen");
const status = document.querySelector("#status");
const hostDialog = document.querySelector("#host-dialog");
const hostForm = document.querySelector("#host-form");
const hostPasswordInput = document.querySelector("#host-password");
const hostError = document.querySelector("#host-error");
const hostOpenButton = document.querySelector("#host-open");
const hostCancelButton = document.querySelector("#host-cancel");
const playerBadge = document.querySelector("#player-badge");
const recoveryPanel = document.querySelector("#recovery-panel");
const refreshButton = document.querySelector("#refresh-player");
const debugPanel = document.querySelector("#debug-panel");
const debugConnection = document.querySelector("#debug-connection");
const debugName = document.querySelector("#debug-name");
const debugScreen = document.querySelector("#debug-screen");
const debugReconnect = document.querySelector("#debug-reconnect");

let currentState = {
  step: loadNumber(playerStepKey, 1),
  generation: loadNumber(playerGenerationKey, 0),
};
let joined = false;
let activeGeneration;
let membershipCheckGeneration = 0;
let presence;
let restoreAttempt;
let restoreController;
let retryTimer;
let failureTimer;
let lifecycleTimer;
let nameTimer;
let stepRetryTimer;
let stopStateObserver;
let stateObserverGeneration = 0;
let attemptNumber = 0;

debugPanel.hidden = !import.meta.env.DEV;
screen.textContent = `Waiting — screen ${currentState.step}`;
input.value = loadPlayerName();
updatePlayerMode();
updateDebugPanel();
startStateObserver();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearTimeout(nameTimer);
  await submitName(input.value);
});

input.addEventListener("input", () => {
  if (!joined || currentState.step !== 1) {
    return;
  }

  clearTimeout(nameTimer);
  nameTimer = window.setTimeout(() => {
    submitName(input.value, true);
  }, nameDebounce);
});

refreshButton.addEventListener("click", () => {
  window.location.reload();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    requestRecovery("page returned to foreground", true);
  }
});

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

async function submitName(rawName, quiet = false) {
  const name = rawName.trim();

  if (!name) {
    if (!quiet) {
      input.focus();
    }
    return;
  }

  if (currentState.step !== 1) {
    showNameLocked();
    return;
  }

  if (!quiet) {
    joinButton.disabled = true;
    status.dataset.error = "false";
    status.textContent = joined ? "Updating name…" : "Joining…";
  }

  try {
    const player = await savePlayerNameToFirebase(name);

    joined = true;
    currentState.generation = player.generation;
    activeGeneration = currentState.generation;
    savePlayerIdentity(player.name, player.generation);
    input.value = player.name;
    updatePlayerMode();
    updateDebugPanel();

    if (!presence && !restoreAttempt) {
      restorePresence(false, "player joined");
    } else if (!quiet) {
      showConnected(player.name);
    }
  } catch (error) {
    if (error instanceof NameLockedError) {
      showNameLocked();
      startStateObserver(true);
      return;
    }

    console.error("[BBQ player] Unable to save the player name.", error);
    if (!quiet) {
      status.dataset.error = "true";
      status.textContent = "Couldn’t save that name. Please try again.";
    }
  } finally {
    if (!quiet && currentState.step === 1) {
      joinButton.disabled = false;
    }
  }
}

function startStateObserver(force = false) {
  if (force) {
    stopStateObserver?.();
    stopStateObserver = undefined;
  } else if (stopStateObserver) {
    return;
  }

  clearTimeout(stepRetryTimer);
  stateObserverGeneration += 1;
  const observerGeneration = stateObserverGeneration;

  observeSessionState((state) => {
    if (observerGeneration !== stateObserverGeneration) {
      return;
    }

    handleSessionState(state);
  })
    .then((stopObserver) => {
      if (observerGeneration !== stateObserverGeneration) {
        stopObserver();
        return;
      }

      stopStateObserver = stopObserver;
    })
    .catch((error) => {
      if (observerGeneration !== stateObserverGeneration) {
        return;
      }

      console.error(
        "[BBQ player] Unable to observe game state; retrying.",
        error,
      );
      screen.textContent = "Unable to connect";
      stepRetryTimer = window.setTimeout(startStateObserver, retryDelay);
    });
}

function handleSessionState(state) {
  const previousGeneration = currentState.generation;
  currentState = state;
  saveNumber(playerStepKey, state.step);
  screen.textContent = `Waiting — screen ${state.step}`;

  const savedGeneration = loadNumber(playerGenerationKey, 0);
  const savedName = loadPlayerName();

  if (
    savedName &&
    savedGeneration &&
    savedGeneration !== state.generation
  ) {
    resetPlayerForNewGame();
  } else if (
    savedName &&
    state.generation &&
    activeGeneration !== state.generation
  ) {
    if (!savedGeneration) {
      saveNumber(playerGenerationKey, state.generation);
    }
    restoreSavedMembership(state.generation);
  }

  if (previousGeneration && previousGeneration !== state.generation && !savedName) {
    resetPlayerForNewGame();
  }

  updatePlayerMode();
  updateDebugPanel();
}

async function restoreSavedMembership(generation) {
  membershipCheckGeneration += 1;
  const checkGeneration = membershipCheckGeneration;

  try {
    const player = await getJoinedPlayer(generation);

    if (
      checkGeneration !== membershipCheckGeneration ||
      generation !== currentState.generation
    ) {
      return;
    }

    if (!player) {
      resetPlayerForNewGame();
      return;
    }

    joined = true;
    activeGeneration = generation;
    savePlayerIdentity(player.name, generation);
    input.value = player.name;
    updatePlayerMode();
    restorePresence(false, "saved player restored");
  } catch (error) {
    console.error("[BBQ player] Unable to restore saved membership.", error);
    scheduleFailureMessage();
  }
}

function resetPlayerForNewGame() {
  membershipCheckGeneration += 1;
  joined = false;
  activeGeneration = undefined;
  presence?.stop();
  presence = undefined;
  restoreController?.abort();
  restoreAttempt = undefined;
  clearRecoveryTimers();
  clearPlayerIdentity();
  input.value = "";
  input.disabled = false;
  joinButton.disabled = false;
  joinButton.textContent = "JOIN";
  status.dataset.error = "false";
  status.textContent = "";
  recoveryPanel.hidden = true;
  playerBadge.hidden = true;
  debugReconnect.textContent = "Never";
  setConnectionState("Disconnected");
  updatePlayerMode();
}

function requestRecovery(reason, restartTransport = false) {
  if (!joined || !loadPlayerName()) {
    return;
  }

  clearTimeout(lifecycleTimer);
  lifecycleTimer = window.setTimeout(() => {
    startStateObserver(true);
    restorePresence(true, reason, restartTransport);
  }, lifecycleDebounce);
}

function restorePresence(
  force = false,
  reason = "initial player restoration",
  restartTransport = false,
) {
  const name = loadPlayerName();

  if (!joined || !name || activeGeneration !== currentState.generation) {
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

  clearTimeout(retryTimer);

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
  showReconnecting(name);

  const attempt = maintainPlayerPresence(
    currentState.generation,
    handlePresenceChange,
    controller.signal,
  ).then((playerPresence) => {
    if (restoreController !== controller) {
      playerPresence.stop();
      return;
    }

    presence = playerPresence;
  });

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

function handlePresenceChange(confirmed) {
  if (!joined) {
    return;
  }

  if (confirmed) {
    clearRecoveryTimers();
    showConnected(loadPlayerName());
    return;
  }

  showReconnecting(loadPlayerName());
  clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => {
    restorePresence(true, "connection record disappeared", true);
  }, retryDelay);
  scheduleFailureMessage();
}

function showReconnecting(name) {
  setConnectionState("Reconnecting");
  updateBadge(name);
  recoveryPanel.hidden = true;

  if (currentState.step === 1) {
    input.disabled = false;
    joinButton.disabled = false;
    joinButton.textContent = joined ? "UPDATE NAME" : "JOIN";
    status.dataset.error = "false";
    status.textContent = "Reconnecting…";
  }
}

function showConnected(name) {
  clearRecoveryTimers();
  setConnectionState("Connected");
  updateBadge(name);
  recoveryPanel.hidden = true;

  if (currentState.step === 1) {
    input.disabled = false;
    joinButton.disabled = false;
    joinButton.textContent = "UPDATE NAME";
    status.dataset.error = "false";
    status.textContent = `You’re in, ${name}.`;
  }
}

function showNameLocked() {
  clearTimeout(nameTimer);
  input.value = loadPlayerName();
  input.disabled = true;
  joinButton.disabled = true;
  status.dataset.error = "true";
  status.textContent = "Names are locked because the game has started.";
}

function scheduleFailureMessage() {
  if (failureTimer) {
    return;
  }

  failureTimer = window.setTimeout(() => {
    failureTimer = undefined;
    setConnectionState("Disconnected");
    recoveryPanel.hidden = false;
  }, failureDelay);
}

function clearRecoveryTimers() {
  clearTimeout(retryTimer);
  clearTimeout(failureTimer);
  retryTimer = undefined;
  failureTimer = undefined;
}

function updatePlayerMode() {
  const gameStarted = currentState.step > 1;
  const name = loadPlayerName();

  form.hidden = gameStarted;
  hostOpenButton.hidden = gameStarted;
  playerBadge.hidden = !gameStarted || !joined || !name;

  if (gameStarted) {
    updateBadge(name);
    input.disabled = true;
    if (hostDialog.open) {
      hostDialog.close();
    }
  } else {
    form.hidden = false;
    input.disabled = false;
    joinButton.disabled = false;
    joinButton.textContent = joined ? "UPDATE NAME" : "JOIN";
  }
}

function updateBadge(name = loadPlayerName()) {
  playerBadge.textContent = name;
}

function setConnectionState(connectionState) {
  debugConnection.textContent = connectionState;
  debugConnection.dataset.state = connectionState.toLowerCase();
  updateDebugPanel();
}

function updateDebugPanel() {
  debugName.textContent = loadPlayerName() || "Not joined";
  debugScreen.textContent = String(currentState.step);
}

function formatAttempt(date, reason) {
  return `${date.toLocaleTimeString()} — ${reason}`;
}

function logDevelopment(message) {
  if (import.meta.env.DEV) {
    console.info(`[BBQ development] ${message}`);
  }
}

function loadPlayerName() {
  try {
    return localStorage.getItem(playerNameKey)?.trim() || "";
  } catch (error) {
    console.error("[BBQ player] Unable to read the saved player name.", error);
    return "";
  }
}

function savePlayerIdentity(name, generation) {
  try {
    localStorage.setItem(playerNameKey, name);
    localStorage.setItem(playerGenerationKey, String(generation));
  } catch (error) {
    console.error("[BBQ player] Unable to save player identity.", error);
  }
}

function clearPlayerIdentity() {
  try {
    localStorage.removeItem(playerNameKey);
    localStorage.removeItem(playerGenerationKey);
  } catch (error) {
    console.error("[BBQ player] Unable to clear player identity.", error);
  }
}

function loadNumber(key, fallback) {
  try {
    const value = Number.parseInt(localStorage.getItem(key), 10);
    return Number.isInteger(value) ? value : fallback;
  } catch (error) {
    console.error(`[BBQ player] Unable to read ${key}.`, error);
    return fallback;
  }
}

function saveNumber(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch (error) {
    console.error(`[BBQ player] Unable to save ${key}.`, error);
  }
}
