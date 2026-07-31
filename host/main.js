import "../shared/development.js";
import "../shared/styles.css";
import {
  beginFirstGame,
  closeAnswers,
  finishGame,
  markAllRemaining,
  markSubmission,
  maybeAutoCloseAnswers,
  observeGame,
  phases,
  scoreAndReveal,
  showLeaderboard,
} from "../shared/game-engine.js";
import { maintainHostPresence } from "../shared/host-presence.js";
import { observePlayers } from "../shared/players.js";
import { resetGame } from "../shared/session-state.js";

const nextButton = document.querySelector("#next");
const joinedCount = document.querySelector("#joined-count");
const disconnectedWarning = document.querySelector("#disconnected-warning");
const disconnectedPlayers = document.querySelector("#disconnected-players");
const resetButton = document.querySelector("#reset-game");
const resetDialog = document.querySelector("#reset-dialog");
const resetConfirmButton = document.querySelector("#reset-confirm");
const resetCancelButton = document.querySelector("#reset-cancel");
const actionStatus = document.querySelector("#action-status");
const phaseLabel = document.querySelector("#phase");
const cueHeading = document.querySelector("#cue");
const gamePanel = document.querySelector("#host-game");
const gameImage = document.querySelector("#host-game-image");
const questionText = document.querySelector("#host-question");
const correctAnswer = document.querySelector("#correct-answer");
const notes = document.querySelector("#notes");
const roundType = document.querySelector("#round-type");
const submissionsHeading = document.querySelector("#submissions-heading");
const submissionsList = document.querySelector("#submissions");
const emptySubmissions = document.querySelector("#empty-submissions");
const bulkActions = document.querySelector("#bulk-actions");
const markAllCorrectButton = document.querySelector("#mark-all-correct");
const markAllIncorrectButton = document.querySelector("#mark-all-incorrect");

let gameSnapshot;
let latestPlayers = [];
let autoClosePending = false;

maintainHostPresence().catch((error) => {
  console.error("[BBQ host] Unable to register Host presence.", error);
});

observePlayers(renderPlayers).catch((error) => {
  console.error("[BBQ host] Unable to observe players.", error);
  joinedCount.textContent = "Unable to connect to Firebase.";
});

observeGame((snapshot) => {
  gameSnapshot = snapshot;
  renderGame(snapshot);
  renderSimulatorPlayers();
  if (snapshot.state.phase === phases.question && !autoClosePending) {
    autoClosePending = true;
    maybeAutoCloseAnswers()
      .catch((error) =>
        console.error("[BBQ host] Automatic answer close failed.", error),
      )
      .finally(() => {
        autoClosePending = false;
      });
  }
}).catch((error) => {
  console.error("[BBQ host] Unable to observe the game.", error);
  phaseLabel.textContent = "Unable to connect to Firebase.";
});

nextButton.addEventListener("click", async () => {
  const phase = gameSnapshot?.state.phase;
  const action = {
    [phases.lobby]: beginFirstGame,
    [phases.question]: closeAnswers,
    [phases.marking]: scoreAndReveal,
    [phases.reveal]: showLeaderboard,
    [phases.leaderboard]: finishGame,
  }[phase];

  if (action) {
    await runAction(nextButton, action);
  }
});

submissionsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-player-id]");
  if (!button) {
    return;
  }

  await runAction(button, () =>
    markSubmission(button.dataset.playerId, button.dataset.status),
  );
});

markAllCorrectButton.addEventListener("click", async () => {
  await runAction(markAllCorrectButton, () => markAllRemaining("correct"));
});

markAllIncorrectButton.addEventListener("click", async () => {
  await runAction(markAllIncorrectButton, () =>
    markAllRemaining("incorrect"),
  );
});

resetButton.addEventListener("click", () => {
  resetDialog.showModal();
});

resetCancelButton.addEventListener("click", () => {
  resetDialog.close();
});

resetConfirmButton.addEventListener("click", async () => {
  resetDialog.close();
  await runAction(resetButton, resetGame);
});

function renderPlayers(players) {
  latestPlayers = players;
  const disconnected = players.filter((player) => !player.connected);
  joinedCount.textContent = `${players.length} ${
    players.length === 1 ? "player" : "players"
  } joined`;
  disconnectedPlayers.replaceChildren(
    ...disconnected.map((player) => {
      const item = document.createElement("li");
      item.textContent = `${player.name}${player.simulated ? " · SIMULATED" : ""}`;
      return item;
    }),
  );
  disconnectedWarning.hidden = disconnected.length === 0;
  renderSimulatorPlayers();
}

function renderGame(snapshot) {
  const { state, definition, submissions } = snapshot;
  phaseLabel.textContent = phaseTitle(state.phase);
  cueHeading.textContent =
    state.phase === phases.lobby ? "Welcome" : "Fastest Correct Answer";

  gamePanel.hidden = !definition;
  bulkActions.hidden = state.phase !== phases.marking;
  submissionsHeading.hidden = !definition;
  submissionsList.hidden = !definition;
  emptySubmissions.hidden = !definition || submissions.length > 0;

  if (definition) {
    gameImage.src = definition.image;
    gameImage.alt = definition.imageAlt;
    questionText.textContent = definition.question;
    correctAnswer.textContent = definition.answer;
    notes.textContent = definition.notes;
    roundType.textContent = definition.typeLabel;
    renderSubmissions(submissions, state.phase);
  }

  const nextLabels = {
    [phases.lobby]: "START GAME",
    [phases.question]: "CLOSE ANSWERS",
    [phases.marking]: "REVEAL RESULTS",
    [phases.reveal]: "SHOW LEADERBOARD",
    [phases.leaderboard]: "FINISH",
    [phases.intermission]: "GAME COMPLETE",
  };

  nextButton.textContent = nextLabels[state.phase] ?? "NEXT";
  nextButton.disabled = state.phase === phases.intermission;
}

const simulatorPanel = document.querySelector("#simulator-panel");
let simulatorApi;

if (import.meta.env.DEV) {
  simulatorPanel.hidden = false;
  import("../shared/simulator.js").then((api) => {
    simulatorApi = api;
    setupSimulatorControls();
  }).catch((error) => {
    console.error("[BBQ host] Unable to load the player simulator.", error);
    simulatorPanel.querySelectorAll("button, input").forEach((control) => {
      control.disabled = true;
    });
  });
} else {
  simulatorPanel.remove();
}

function setupSimulatorControls() {
  document.querySelector("#sim-add").addEventListener("click", (event) =>
    runAction(event.currentTarget, () =>
      simulatorApi.addSimulatedPlayers(document.querySelector("#sim-count").value),
    ),
  );
  document.querySelector("#sim-remove").addEventListener("click", (event) =>
    runAction(event.currentTarget, () => simulatorApi.removeAllSimulatedPlayers()),
  );
  document.querySelector("#sim-submit").addEventListener("click", (event) =>
    runAction(event.currentTarget, () =>
      simulatorApi.submitAllSimulatedAnswers(
        simulatorPlayers(),
        document.querySelector("#sim-answer").value,
        Number(document.querySelector("#sim-delay").value),
      ),
    ),
  );
  document.querySelector("#simulated-players").addEventListener("change", (event) => {
    const input = event.target.closest("input[data-sim-player]");
    if (input) {
      simulatorApi.setSimulatedPlayerConnected(input.dataset.simPlayer, input.checked);
    }
  });
}

function simulatorPlayers() {
  return latestPlayers
    .filter((player) => player.simulated)
    .map((player) => ({
      ...player,
      answer: gameSnapshot?.submissions.find(
        (submission) => submission.playerId === player.id,
      )?.answer,
    }));
}

function renderSimulatorPlayers() {
  if (!import.meta.env.DEV) return;
  const container = document.querySelector("#simulated-players");
  container.replaceChildren(
    ...simulatorPlayers().map((player) => {
      const row = document.createElement("label");
      const submission = gameSnapshot?.submissions.find(
        (item) => item.playerId === player.id,
      );
      row.className = "simulated-player";
      row.innerHTML = `<input type="checkbox" data-sim-player="${escapeHtml(
        player.id,
      )}" ${player.connected ? "checked" : ""}><strong>${escapeHtml(
        player.name,
      )}</strong><span>${escapeHtml(
        gameSnapshot?.state.phase ?? "lobby",
      )}</span><span>${escapeHtml(
        submission?.answer ?? "No answer",
      )}</span><span>${player.score ?? 0} pts</span>`;
      return row;
    }),
  );
}

function renderSubmissions(submissions, phase) {
  submissionsList.replaceChildren(
    ...submissions.map((submission, index) => {
      const item = document.createElement("li");
      const answer = document.createElement("div");
      const controls = document.createElement("div");

      item.className = `submission-row ${submission.status}`;
      answer.innerHTML = `<strong>${index + 1}. ${escapeHtml(
        submission.playerName,
      )}</strong><span>${escapeHtml(submission.answer)}</span>`;
      controls.className = "mark-actions";

      if (phase === phases.marking) {
        if (submission.status !== "pending") {
          const status = document.createElement("strong");
          status.className = `marking-status ${submission.status}`;
          status.textContent =
            submission.status === "correct" ? "✓ Correct" : "✕ Incorrect";
          controls.append(status);
        }
        controls.append(
          markingButton(submission.playerId, "correct", "✓ Correct"),
          markingButton(submission.playerId, "incorrect", "✕ Incorrect"),
        );
      } else {
        controls.textContent =
          submission.status === "pending"
            ? "Awaiting mark"
            : `${submission.status} · ${submission.points ?? 0} pts`;
      }

      item.append(answer, controls);
      return item;
    }),
  );
}

function markingButton(playerId, status, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "small-button";
  button.dataset.playerId = playerId;
  button.dataset.status = status;
  button.textContent = label;
  return button;
}

function phaseTitle(phase) {
  return {
    [phases.lobby]: "Lobby",
    [phases.question]: "Accepting answers",
    [phases.marking]: "Mark answers",
    [phases.reveal]: "Reveal",
    [phases.leaderboard]: "Leaderboard",
    [phases.intermission]: "Waiting",
  }[phase];
}

async function runAction(button, action) {
  button.disabled = true;
  actionStatus.dataset.error = "false";
  actionStatus.textContent = "";

  try {
    await action();
  } catch (error) {
    console.error("[BBQ host] Unable to update the game.", error);
    actionStatus.dataset.error = "true";
    actionStatus.textContent = error.message || "Couldn’t update the game.";
  } finally {
    button.disabled =
      button === nextButton &&
      gameSnapshot?.state.phase === phases.intermission;
  }
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}
