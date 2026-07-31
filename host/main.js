import "../shared/development.js";
import "../shared/styles.css";
import {
  beginRound,
  closeAnswers,
  finishRound,
  markAllRemaining,
  markSubmission,
  observeGame,
  overrideSubmissionPoints,
  phases,
  scoreAndReveal,
  showPairingLeaderboard,
  showLeaderboard,
} from "../shared/game-engine.js";
import {
  getRounds,
  partyGame,
} from "../shared/games/party-game.js";
import { maintainHostPresence } from "../shared/host-presence.js";
import {
  awardGroupPoints,
  generateGrouping,
  groupingModes,
  movePlayerToGroup,
  observeGrouping,
  participationModes,
  setActiveGroup,
} from "../shared/grouping.js";
import { observePlayers } from "../shared/players.js";
import { releaseId } from "../shared/release.js";
import { roundTypes } from "../shared/round-types.js";
import {
  ensureSessionRelease,
  resetGame,
} from "../shared/session-state.js";

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
const questionText = document.querySelector("#host-question");
const correctAnswer = document.querySelector("#correct-answer");
const correctAnswerRow = document.querySelector("#correct-answer-row");
const notes = document.querySelector("#notes");
const roundType = document.querySelector("#round-type");
const submissionsHeading = document.querySelector("#submissions-heading");
const submissionsList = document.querySelector("#submissions");
const emptySubmissions = document.querySelector("#empty-submissions");
const bulkActions = document.querySelector("#bulk-actions");
const markAllCorrectButton = document.querySelector("#mark-all-correct");
const markAllIncorrectButton = document.querySelector("#mark-all-incorrect");
const roundSelection = document.querySelector("#round-selection");
const roundSelect = document.querySelector("#round-select");
const groupingPanel = document.querySelector("#grouping-panel");
const hostGroups = document.querySelector("#host-groups");
const groupAssignments = document.querySelector("#group-assignments");

let gameSnapshot;
let latestPlayers = [];
let latestGrouping = { groups: [] };

await ensureSessionRelease(releaseId);

roundSelect.replaceChildren(
  ...getRounds().map((round) => {
    const option = document.createElement("option");
    option.value = round.id;
    option.textContent = `${round.typeLabel} — ${round.title}`;
    return option;
  }),
);

maintainHostPresence().catch((error) => {
  console.error("[BBQ host] Unable to register Host presence.", error);
});

observePlayers(renderPlayers).catch((error) => {
  console.error("[BBQ host] Unable to observe players.", error);
  joinedCount.textContent = "Unable to connect to Firebase.";
});

observeGrouping((grouping) => {
  latestGrouping = grouping;
  renderGrouping();
}).catch((error) => {
  console.error("[BBQ host] Unable to observe groups.", error);
});

observeGame((snapshot) => {
  gameSnapshot = snapshot;
  renderGame(snapshot);
  renderSimulatorPlayers();
}).catch((error) => {
  console.error("[BBQ host] Unable to observe the game.", error);
  phaseLabel.textContent = "Unable to connect to Firebase.";
});

nextButton.addEventListener("click", async () => {
  const phase = gameSnapshot?.state.phase;
  const pairingRound =
    gameSnapshot?.definition?.type === roundTypes.pairingPrototype;
  const action = {
    [phases.lobby]: () => beginRound(roundSelect.value),
    [phases.question]: pairingRound
      ? showPairingLeaderboard
      : closeAnswers,
    [phases.marking]: scoreAndReveal,
    [phases.reveal]: showLeaderboard,
    [phases.leaderboard]: finishRound,
    [phases.intermission]: () => beginRound(roundSelect.value),
  }[phase];

  if (action) {
    await runAction(nextButton, action);
  }
});

document.querySelector("#generate-pairs").addEventListener("click", (event) =>
  runAction(event.currentTarget, () =>
    generateGrouping(groupingModes.pairs, participationModes.turnBased),
  ),
);

document.querySelector("#previous-group").addEventListener("click", () =>
  cycleActiveGroup(-1),
);

document.querySelector("#next-group").addEventListener("click", () =>
  cycleActiveGroup(1),
);

hostGroups.addEventListener("click", async (event) => {
  const activeButton = event.target.closest("button[data-active-group]");
  if (activeButton) {
    await runAction(activeButton, () =>
      setActiveGroup(activeButton.dataset.activeGroup),
    );
    return;
  }
  const awardButton = event.target.closest("button[data-award-group]");
  if (awardButton) {
    const points = awardButton
      .closest(".host-group")
      .querySelector("input[data-group-points]").value;
    await runAction(awardButton, () =>
      awardGroupPoints(awardButton.dataset.awardGroup, points),
    );
  }
});

groupAssignments.addEventListener("change", async (event) => {
  const select = event.target.closest("select[data-group-player]");
  if (select) {
    await runAction(select, () =>
      movePlayerToGroup(select.dataset.groupPlayer, select.value),
    );
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

submissionsList.addEventListener("change", async (event) => {
  const input = event.target.closest("input[data-points-player]");
  if (!input) return;
  await runAction(input, () =>
    overrideSubmissionPoints(input.dataset.pointsPlayer, input.value),
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
  renderGrouping();
}

function renderGame(snapshot) {
  const { state, definition, submissions } = snapshot;
  phaseLabel.textContent = phaseTitle(state.phase);
  cueHeading.textContent =
    state.phase === phases.lobby ? "Welcome" : definition?.typeLabel ?? partyGame.title;

  gamePanel.hidden = !definition;
  bulkActions.hidden =
    state.phase !== phases.marking ||
    definition?.type !== roundTypes.fastestFreeText;
  const answerRound =
    definition && definition.type !== roundTypes.pairingPrototype;
  submissionsHeading.hidden = !answerRound;
  submissionsList.hidden = !answerRound;
  emptySubmissions.hidden = !answerRound || submissions.length > 0;

  if (definition) {
    questionText.textContent = definition.question ?? definition.title;
    correctAnswerRow.hidden = !definition.answer;
    correctAnswer.textContent = definition.answer ?? "";
    notes.textContent = definition.notes;
    roundType.textContent = definition.typeLabel;
    renderSubmissions(submissions, state.phase);
  }
  roundSelection.hidden = ![phases.lobby, phases.intermission].includes(
    state.phase,
  );
  groupingPanel.hidden = !(
    state.phase === phases.lobby ||
    state.phase === phases.intermission ||
    definition?.type === roundTypes.pairingPrototype
  );

  const nextLabels = {
    [phases.lobby]: "START GAME",
    [phases.question]:
      definition?.flow?.question?.hostLabel ?? "CLOSE ANSWERS",
    [phases.marking]: "REVEAL RESULTS",
    [phases.reveal]: "SHOW LEADERBOARD",
    [phases.leaderboard]: "FINISH",
    [phases.intermission]: "START SELECTED ROUND",
  };

  nextButton.textContent = nextLabels[state.phase] ?? "NEXT";
  nextButton.disabled = false;
}

function renderGrouping() {
  const groups = latestGrouping.groups ?? [];
  hostGroups.replaceChildren(
    ...groups.map((group) => {
      const card = document.createElement("article");
      const active = group.id === latestGrouping.activeGroupId;
      card.className = `host-group${active ? " active" : ""}`;
      card.innerHTML = `<div><strong>${escapeHtml(
        group.name,
      )}${active ? " · ACTIVE" : ""}</strong><span>${escapeHtml(
        group.members.map((member) => member.name).join(" + ") || "Empty",
      )}</span></div><div class="group-score-controls"><button class="secondary small-button" type="button" data-active-group="${escapeHtml(
        group.id,
      )}">MAKE ACTIVE</button><input type="number" value="1" data-group-points aria-label="Points for ${escapeHtml(
        group.name,
      )}"><button type="button" data-award-group="${escapeHtml(
        group.id,
      )}">AWARD</button></div>`;
      return card;
    }),
  );

  groupAssignments.replaceChildren(
    ...latestPlayers.map((player) => {
      const label = document.createElement("label");
      const currentGroup = groups.find((group) =>
        group.memberIds?.includes(player.id),
      );
      const select = document.createElement("select");
      const name = document.createElement("span");
      name.textContent = player.name;
      select.dataset.groupPlayer = player.id;
      select.setAttribute("aria-label", `Group for ${player.name}`);
      select.replaceChildren(
        ...groups.map((group) => {
          const option = document.createElement("option");
          option.value = group.id;
          option.textContent = group.name;
          option.selected = group.id === currentGroup?.id;
          return option;
        }),
      );
      select.disabled = groups.length === 0;
      label.append(name, select);
      return label;
    }),
  );
}

function cycleActiveGroup(direction) {
  const groups = latestGrouping.groups ?? [];
  if (!groups.length) return;
  const current = groups.findIndex(
    (group) => group.id === latestGrouping.activeGroupId,
  );
  const next = (Math.max(current, 0) + direction + groups.length) % groups.length;
  setActiveGroup(groups[next].id).catch((error) => {
    console.error("[BBQ host] Unable to change the active group.", error);
  });
}

const simulatorPanel = document.querySelector("#simulator-panel");
let simulatorApi;

import("../shared/simulator.js")
  .then((api) => {
    simulatorApi = api;
    setupSimulatorControls();
  })
  .catch((error) => {
    console.error("[BBQ host] Unable to load the player simulator.", error);
    simulatorPanel.querySelectorAll("button, input").forEach((control) => {
      control.disabled = true;
    });
  });

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
        gameSnapshot?.definition,
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
  const definition = gameSnapshot?.definition;
  submissionsList.replaceChildren(
    ...submissions.map((submission, index) => {
      const item = document.createElement("li");
      const answer = document.createElement("div");
      const controls = document.createElement("div");

      item.className = `submission-row ${submission.status}`;
      const prefix = submission.placing
        ? `${submission.placing}.`
        : `${index + 1}.`;
      answer.innerHTML = `<strong>${prefix} ${escapeHtml(
        submission.playerName,
      )}</strong><span>${escapeHtml(submission.answer)}</span>`;
      controls.className = "mark-actions";

      if (
        phase === phases.marking &&
        definition?.type === roundTypes.closestWins
      ) {
        const check = document.createElement("span");
        const points = document.createElement("input");
        check.className = "closeness-check";
        check.textContent = `${submission.difference} away · proposed +${
          submission.proposedPoints ?? 0
        }`;
        points.type = "number";
        points.step = "1";
        points.value = String(submission.points ?? 0);
        points.dataset.pointsPlayer = submission.playerId;
        points.setAttribute("aria-label", `Points for ${submission.playerName}`);
        controls.append(check, points);
      } else if (phase === phases.marking) {
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
    button.disabled = false;
  }
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}
