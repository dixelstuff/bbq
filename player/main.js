import "../shared/development.js";
import "../shared/styles.css";
import { restartDatabaseConnection } from "../shared/firebase.js";
import {
  observeGame,
  phases,
  submitAnswer,
  submitDefinitionVote,
} from "../shared/game-engine.js";
import { observeHostConnected } from "../shared/host-presence.js";
import {
  observeGrouping,
  playerGroupLabel,
} from "../shared/grouping.js";
import {
  getJoinedPlayer,
  maintainPlayerPresence,
  NameLockedError,
  savePlayerName as savePlayerNameToFirebase,
} from "../shared/players.js";
import { observeSessionState } from "../shared/session-state.js";
import {
  formatNumericAnswer,
  mediaForAudience,
  roundTypes,
} from "../shared/round-types.js";

const hostPassword = "bigfat";
const hostAccessKey = "bbq.hostAccess";
const playerNameKey = "bbq.playerName";
const playerGenerationKey = "bbq.playerGeneration";
const playerStepKey = "bbq.currentStep";
const retryDelay = 5000;
const failureDelay = 12000;
const lifecycleDebounce = 150;

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
const waitingView = document.querySelector("#waiting-view");
const waitingMessage = document.querySelector("#waiting-message");
const questionView = document.querySelector("#question-view");
const questionMedia = document.querySelector("#question-media");
const playerRoundType = document.querySelector("#player-round-type");
const questionText = document.querySelector("#question-text");
const answerForm = document.querySelector("#answer-form");
const answerInput = document.querySelector("#answer");
const answerTextControl = document.querySelector("#answer-text-control");
const choiceOptions = document.querySelector("#choice-options");
const answerButton = document.querySelector("#answer-submit");
const answerStatus = document.querySelector("#answer-status");
const playerResult = document.querySelector("#player-result");
const pairView = document.querySelector("#pair-view");
const pairStatus = document.querySelector("#pair-status");
const pairMembers = document.querySelector("#pair-members");
const pairWaiting = document.querySelector("#pair-waiting");
const votingView = document.querySelector("#voting-view");
const definitionOptions = document.querySelector("#definition-options");
const voteStatus = document.querySelector("#vote-status");

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
let stepRetryTimer;
let stopStateObserver;
let stateObserverGeneration = 0;
let attemptNumber = 0;
let playerId;
let gameSnapshot;
let stopGameObserver;
let gameRetryTimer;
let hostConnected = false;
let hostStatusKnown = false;
let groupingSnapshot = { groups: [] };

debugPanel.hidden = !import.meta.env.DEV;
screen.textContent = `Waiting — screen ${currentState.step}`;
input.value = loadPlayerName();
updatePlayerMode();
updateDebugPanel();
startStateObserver();
startGameObserver();
startHostObserver();
startGroupingObserver();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await submitName(input.value);
});

refreshButton.addEventListener("click", () => {
  window.location.reload();
});

answerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await submitPlayerAnswer(answerInput.value);
});

choiceOptions.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-choice]");
  if (button) await submitPlayerAnswer(button.dataset.choice);
});

definitionOptions.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-definition-option]");
  if (!button) return;
  definitionOptions.querySelectorAll("button").forEach((item) => {
    item.disabled = true;
  });
  voteStatus.textContent = "Voting…";
  try {
    await submitDefinitionVote(button.dataset.definitionOption);
    voteStatus.dataset.error = "false";
    voteStatus.textContent = "Vote locked";
  } catch (error) {
    console.error("[BBQ player] Unable to submit definition vote.", error);
    definitionOptions.querySelectorAll("button").forEach((item) => {
      item.disabled = false;
    });
    voteStatus.dataset.error = "true";
    voteStatus.textContent = error.message || "Couldn’t vote. Try again.";
  }
});

async function submitPlayerAnswer(rawAnswer) {
  const answer = String(rawAnswer ?? "").trim();
  if (currentState.phase !== phases.question) {
    return;
  }
  if (!answer) {
    answerStatus.dataset.error = "true";
    answerStatus.textContent = "Enter an answer.";
    answerInput.focus();
    return;
  }

  answerInput.disabled = true;
  answerButton.disabled = true;
  answerStatus.dataset.error = "false";
  answerStatus.textContent = "Submitting…";

  try {
    await submitAnswer(answer);
    answerStatus.textContent = "Answer submitted";
  } catch (error) {
    console.error("[BBQ player] Unable to submit answer.", error);
    answerInput.disabled = false;
    answerButton.disabled = false;
    answerStatus.dataset.error = "true";
    answerStatus.textContent =
      error.message === "Enter a valid number"
        ? "Enter a valid number, such as 16900 or 16,900.5."
        : error.message || "Couldn’t submit. Please try again.";
  }
}

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

async function submitName(rawName) {
  const name = rawName.trim().toUpperCase();

  if (!name) {
    input.focus();
    return;
  }

  if (currentState.step !== 1) {
    showNameLocked();
    return;
  }

  joinButton.disabled = true;
  status.dataset.error = "false";
  status.textContent = joined ? "Updating name…" : "Joining…";

  try {
    const player = await savePlayerNameToFirebase(name);

    joined = true;
    playerId = player.id;
    currentState.generation = player.generation;
    activeGeneration = currentState.generation;
    savePlayerIdentity(player.name, player.generation);
    input.value = player.name;
    updatePlayerMode();
    updateDebugPanel();

    if (!presence && !restoreAttempt) {
      restorePresence(false, "player joined");
    } else {
      showConnected(player.name);
    }
  } catch (error) {
    if (error instanceof NameLockedError) {
      showNameLocked();
      startStateObserver(true);
      return;
    }

    console.error("[BBQ player] Unable to save the player name.", error);
    status.dataset.error = "true";
    status.textContent = "Couldn’t save that name. Please try again.";
  } finally {
    if (currentState.step === 1) {
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

function startGameObserver(force = false) {
  if (force) {
    stopGameObserver?.();
    stopGameObserver = undefined;
  } else if (stopGameObserver) {
    return;
  }

  clearTimeout(gameRetryTimer);
  observeGame((snapshot) => {
    gameSnapshot = snapshot;
    renderPlayerGame();
  })
    .then((stopObserver) => {
      stopGameObserver = stopObserver;
    })
    .catch((error) => {
      console.error("[BBQ player] Unable to observe the game; retrying.", error);
      gameRetryTimer = window.setTimeout(startGameObserver, retryDelay);
    });
}

function startHostObserver() {
  observeHostConnected((connected) => {
    hostConnected = connected;
    hostStatusKnown = true;
    updatePlayerMode();
  }).catch((error) => {
    console.error("[BBQ player] Unable to observe Host presence.", error);
    hostStatusKnown = true;
    updatePlayerMode();
  });
}

function startGroupingObserver() {
  observeGrouping((grouping) => {
    groupingSnapshot = grouping;
    renderPlayerGame();
  }).catch((error) => {
    console.error("[BBQ player] Unable to observe groups.", error);
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
  renderPlayerGame();
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
    playerId = player.id;
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
  playerId = undefined;
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
  renderPlayerGame();
}

function requestRecovery(reason, restartTransport = false) {
  if (!joined || !loadPlayerName()) {
    return;
  }

  clearTimeout(lifecycleTimer);
  lifecycleTimer = window.setTimeout(() => {
    startStateObserver(true);
    startGameObserver(true);
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
  hostOpenButton.hidden = gameStarted || !hostStatusKnown || hostConnected;
  playerBadge.hidden = !gameStarted || !joined || !name;
  screen.hidden = gameStarted;

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

function renderPlayerGame() {
  const phase = currentState.phase;
  const submission = gameSnapshot?.submissions.find(
    (item) => item.playerId === playerId,
  );
  const definition = gameSnapshot?.definition;

  waitingView.hidden = true;
  questionView.hidden = true;
  playerResult.hidden = true;
  pairView.hidden = true;
  votingView.hidden = true;

  if (!joined) {
    return;
  }

  const playerGroup = groupingSnapshot.groups?.find((group) =>
    group.memberIds?.includes(playerId),
  );

  if (currentState.step === 1) {
    if (playerGroup) {
      pairView.hidden = false;
      pairStatus.textContent = playerGroupLabel(
        playerGroup,
        groupingSnapshot.mode,
      );
      pairMembers.textContent = playerGroup.members
        .map((member) => member.name)
        .join("\n");
      pairWaiting.textContent = "Your group is ready.";
    }
    return;
  }

  if (phase === phases.opening) {
    waitingMessage.textContent = "Get ready…";
    waitingView.hidden = false;
    return;
  }

  if (
    definition?.type === roundTypes.pairingPrototype &&
    phase === phases.question
  ) {
    pairView.hidden = false;
    pairMembers.textContent =
      playerGroup?.members.map((member) => member.name).join("\n") ?? "";
    const active = playerGroup?.id === groupingSnapshot.activeGroupId;
    pairStatus.textContent = active
      ? "YOU’RE UP"
      : playerGroupLabel(playerGroup, groupingSnapshot.mode);
    pairWaiting.textContent = active
      ? "Head to the playing area!"
      : "Waiting for your turn…";
    return;
  }

  if (definition?.type === roundTypes.spellingBee) {
    waitingView.hidden = false;
    const active = playerGroup?.id === groupingSnapshot.activeGroupId;
    waitingMessage.textContent =
      phase === phases.question && active
        ? "You’re up."
        : phase === phases.reveal && active
          ? "The word has been revealed."
          : "Spelling Bee is underway…";
    return;
  }

  if (
    definition?.type === roundTypes.charades &&
    phase === phases.question
  ) {
    pairView.hidden = false;
    const active = playerGroup?.id === groupingSnapshot.activeGroupId;
    pairStatus.textContent = active
      ? "YOU’RE UP"
      : playerGroupLabel(playerGroup, groupingSnapshot.mode);
    pairMembers.textContent =
      playerGroup?.members.map((member) => member.name).join("\n") ?? "";
    pairWaiting.textContent = active
      ? "Head to the playing area!"
      : "Enjoy the questionable acting…";
    return;
  }

  if (phase === phases.question && definition) {
    questionView.hidden = false;
    const playerMedia = mediaForAudience(definition, "player");
    questionMedia.hidden = !playerMedia;
    if (playerMedia?.type === "image") {
      questionMedia.src = playerMedia.src;
      questionMedia.alt = playerMedia.alt ?? "";
    } else {
      questionMedia.removeAttribute("src");
      questionMedia.alt = "";
    }
    playerRoundType.textContent = definition.typeLabel;
    questionText.textContent = definition.question;
    const numeric = definition.type === roundTypes.closestWins;
    const choices = definition.choices ?? [];
    answerInput.inputMode = numeric ? "decimal" : "text";
    answerInput.placeholder = numeric ? "Enter a number" : "";
    answerTextControl.hidden = choices.length > 0;
    answerButton.hidden = choices.length > 0;
    choiceOptions.hidden = choices.length === 0;
    choiceOptions.replaceChildren(
      ...choices.map((choice, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.choice = choice;
        button.innerHTML = `<strong>${String.fromCharCode(
          65 + index,
        )}</strong><span>${escapeHtml(choice)}</span>`;
        button.disabled = Boolean(submission);
        return button;
      }),
    );

    if (submission) {
      answerInput.value = submission.answer;
      answerInput.disabled = true;
      answerButton.disabled = true;
      answerStatus.dataset.error = "false";
      answerStatus.textContent = "Answer submitted";
    } else {
      answerInput.value = "";
      answerInput.disabled = false;
      answerButton.disabled = false;
      answerStatus.textContent = "";
    }
    return;
  }

  if (phase === phases.voting && definition?.type === roundTypes.myDefinition) {
    votingView.hidden = false;
    const vote = gameSnapshot?.round?.votes?.[playerId];
    definitionOptions.replaceChildren(
      ...(gameSnapshot?.round?.definitionOptions ?? []).map((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.definitionOption = option.id;
        button.innerHTML = `<strong>${String.fromCharCode(
          65 + index,
        )}</strong><span>${escapeHtml(option.text)}</span>`;
        button.disabled = Boolean(vote) || option.authorId === playerId;
        return button;
      }),
    );
    voteStatus.textContent = vote ? "Vote locked" : "Choose carefully.";
    return;
  }

  if (phase === phases.marking) {
    waitingMessage.textContent = "Your answer is on the grill…";
    waitingView.hidden = false;
    return;
  }

  waitingMessage.textContent = "Waiting for next round…";

  if (phase === phases.reveal && submission) {
    playerResult.hidden = false;
    if (definition?.type === roundTypes.closestWins) {
      playerResult.innerHTML = `<strong>Your answer: ${escapeHtml(
        submission.answer,
      )}</strong><span>Correct answer: ${escapeHtml(
        formatNumericAnswer(definition.correctValue),
      )}</span><span>Place: ${submission.placing}</span><span>+${
        submission.points ?? 0
      } points</span>`;
    } else if (definition?.type === roundTypes.myDefinition) {
      const points =
        gameSnapshot?.round?.definitionScores?.[playerId] ?? 0;
      playerResult.innerHTML = `<strong>${escapeHtml(
        gameSnapshot?.round?.result?.word ?? definition.word,
      )}</strong><span>${escapeHtml(
        gameSnapshot?.round?.result?.definition ?? "",
      )}</span><span>+${points} points</span>`;
    } else if (definition?.type === roundTypes.bestFreeText) {
      playerResult.textContent = `Your answer earned ${
        submission.points ?? 0
      } points.`;
    } else {
      playerResult.textContent =
        submission.status === "correct"
          ? `Your answer was correct. +${submission.points ?? 0} points.`
          : "Your answer was incorrect. +0 points.";
    }
  }

  waitingView.hidden = false;
}

function updateBadge(name = loadPlayerName()) {
  playerBadge.textContent = name;
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
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
