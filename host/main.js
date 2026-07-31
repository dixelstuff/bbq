import "../shared/development.js";
import "../shared/styles.css";
import {
  beginRound,
  controlRoundAudio,
  advanceSpelling,
  closeAnswers,
  closeDefinitionVoting,
  finishRound,
  markAllRemaining,
  markSpelling,
  openDefinitionVoting,
  openRoundQuestion,
  moveCharadesPrompt,
  recordCharadesAttempt,
  markSubmission,
  observeGame,
  overrideSubmissionPoints,
  phases,
  scoreAndReveal,
  showPairingLeaderboard,
  showLeaderboard,
  showCharadesLeaderboard,
  startRoundTimer,
  stopRoundTimer,
  setRoundDisplayOverlay,
  setSubmissionBonus,
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
  nextActiveGroupId,
  observeGrouping,
  participationModes,
  setActiveGroup,
  setGroupingPresentation,
} from "../shared/grouping.js";
import { observePlayers } from "../shared/players.js";
import { releaseId, releaseOrder } from "../shared/release.js";
import { roundTypes } from "../shared/round-types.js";
import {
  ensureSessionRelease,
  resetGame,
} from "../shared/session-state.js";
import { spellingBeeWords } from "./rounds/spelling-bee/content.js";
import { charadesPrompts } from "./rounds/charades/content.js";
import {
  definitionContent,
  getHostContent,
} from "./rounds/demo-night/content.js";
import { remainingTimerSeconds } from "../shared/presentation.js";

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
const spellingHost = document.querySelector("#spelling-host");
const spellingPlayer = document.querySelector("#spelling-player");
const spellingWord = document.querySelector("#spelling-word");
const spellingPronunciation = document.querySelector("#spelling-pronunciation");
const spellingDefinition = document.querySelector("#spelling-definition");
const spellingExample = document.querySelector("#spelling-example");
const spellingNotes = document.querySelector("#spelling-notes");
const spellingMarking = document.querySelector("#spelling-marking");
const spellingCorrect = document.querySelector("#spelling-correct");
const spellingIncorrect = document.querySelector("#spelling-incorrect");
const charadesHost = document.querySelector("#charades-host");
const charadesGroup = document.querySelector("#charades-group");
const charadesPrompt = document.querySelector("#charades-prompt");
const charadesSeconds = document.querySelector("#charades-seconds");
const charadesStartTimer = document.querySelector("#charades-start-timer");
const charadesStopTimer = document.querySelector("#charades-stop-timer");
const charadesOverlay = document.querySelector("#charades-overlay");
const charadesScoreButtons = document.querySelector("#charades-score-buttons");
const charadesAttempt = document.querySelector("#charades-attempt");
const charadesCorrectCount = document.querySelector("#charades-correct-count");
const charadesSkippedCount = document.querySelector("#charades-skipped-count");
const charadesTime = document.querySelector("#charades-time");
const charadesCategory = document.querySelector("#charades-category");
const charadesCorrectButton = document.querySelector("#charades-correct");
const charadesSkipButton = document.querySelector("#charades-skip");
const audioControls = document.querySelector("#audio-controls");
const audioFile = document.querySelector("#audio-file");
const audioStatus = document.querySelector("#audio-status");
const audioButtons = {
  play: document.querySelector("#audio-play"),
  replay: document.querySelector("#audio-replay"),
  extend: document.querySelector("#audio-extend"),
  stop: document.querySelector("#audio-stop"),
};

let gameSnapshot;
let latestPlayers = [];
let latestGrouping = { groups: [] };

if (document.documentElement.dataset.hostAccess !== "granted") {
  await new Promise((resolve) =>
    window.addEventListener("bbq-host-unlocked", resolve, { once: true }),
  );
}

await ensureSessionRelease(releaseId, releaseOrder);

renderRoundOptions();

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
  if (gameSnapshot?.definition?.type === roundTypes.spellingBee) {
    renderSpellingHost(gameSnapshot.state, gameSnapshot.round);
  }
  if (gameSnapshot?.definition?.type === roundTypes.charades) {
    renderCharadesHost(gameSnapshot.state, gameSnapshot.round);
  }
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

setInterval(() => {
  if (
    gameSnapshot?.definition?.type === roundTypes.charades &&
    gameSnapshot?.state.phase === phases.question
  ) {
    renderCharadesHost(gameSnapshot.state, gameSnapshot.round);
  }
}, 250);

for (const [action, button] of Object.entries(audioButtons)) {
  button.addEventListener("click", () =>
    runAction(button, () => controlRoundAudio(action)),
  );
}

nextButton.addEventListener("click", async () => {
  const phase = gameSnapshot?.state.phase;
  const pairingRound =
    gameSnapshot?.definition?.type === roundTypes.pairingPrototype;
  const spellingRound =
    gameSnapshot?.definition?.type === roundTypes.spellingBee;
  const charadesRound =
    gameSnapshot?.definition?.type === roundTypes.charades;
  const definitionRound =
    gameSnapshot?.definition?.type === roundTypes.myDefinition;
  const action = {
    [phases.lobby]: () => beginRound(roundSelect.value),
    [phases.opening]: openRoundQuestion,
    [phases.question]: spellingRound
      ? null
      : charadesRound
      ? showCharadesLeaderboard
      : pairingRound
      ? showPairingLeaderboard
      : closeAnswers,
    [phases.marking]: definitionRound
      ? () =>
          openDefinitionVoting(
            definitionContent[gameSnapshot?.definition?.word]?.definition,
          )
      : scoreAndReveal,
    [phases.voting]: closeDefinitionVoting,
    [phases.reveal]: spellingRound ? advanceSpelling : showLeaderboard,
    [phases.leaderboard]: finishRound,
    [phases.intermission]: () => beginRound(roundSelect.value),
  }[phase];

  if (action) {
    await runAction(nextButton, action);
  }
});

spellingPlayer.addEventListener("change", () =>
  runAction(spellingPlayer, () => setActiveGroup(spellingPlayer.value)),
);

spellingCorrect.addEventListener("click", () =>
  markCurrentSpelling(true, spellingCorrect),
);

spellingIncorrect.addEventListener("click", () =>
  markCurrentSpelling(false, spellingIncorrect),
);

document.querySelector("#generate-individuals").addEventListener("click", (event) =>
  runAction(event.currentTarget, () =>
    generateGrouping(groupingModes.individual, participationModes.turnBased),
  ),
);

document.querySelector("#generate-pairs").addEventListener("click", (event) =>
  runAction(event.currentTarget, () =>
    generateGrouping(groupingModes.pairs, participationModes.turnBased),
  ),
);

document.querySelector("#generate-threes").addEventListener("click", (event) =>
  runAction(event.currentTarget, () =>
    generateGrouping(groupingModes.threes, participationModes.turnBased),
  ),
);

document.querySelector("#charades-previous-group").addEventListener("click", () =>
  cycleActiveGroup(-1),
);
document.querySelector("#charades-next-group").addEventListener("click", () =>
  cycleActiveGroup(1),
);
document.querySelector("#charades-previous-prompt").addEventListener("click", (event) =>
  runAction(event.currentTarget, () => moveCharadesPrompt(-1)),
);
document.querySelector("#charades-next-prompt").addEventListener("click", (event) =>
  runAction(event.currentTarget, () => moveCharadesPrompt(1)),
);
charadesStartTimer.addEventListener("click", () =>
  runAction(charadesStartTimer, () => startRoundTimer(charadesSeconds.value)),
);
charadesStopTimer.addEventListener("click", () =>
  runAction(charadesStopTimer, stopRoundTimer),
);
charadesCorrectButton.addEventListener("click", () =>
  runAction(charadesCorrectButton, () => recordCharadesAttempt("correct")),
);
charadesSkipButton.addEventListener("click", () =>
  runAction(charadesSkipButton, () => recordCharadesAttempt("skipped")),
);
charadesOverlay.addEventListener("click", () =>
  runAction(charadesOverlay, () =>
    setRoundDisplayOverlay(gameSnapshot?.round?.displayMode !== "overlay"),
  ),
);
charadesScoreButtons.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-charades-points]");
  if (button) awardCurrentCharadesGroup(button.dataset.charadesPoints, button);
});
document.querySelector("#charades-leaderboard").addEventListener("click", (event) =>
  runAction(event.currentTarget, showCharadesLeaderboard),
);

document.querySelector("#generate-teams").addEventListener("click", (event) =>
  runAction(event.currentTarget, () =>
    generateGrouping(groupingModes.twoTeams, participationModes.simultaneous),
  ),
);

document.querySelector("#show-groups").addEventListener("click", (event) =>
  runAction(event.currentTarget, () =>
    setGroupingPresentation(!latestGrouping.showAssignments),
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
  const pointsButton = event.target.closest("button[data-manual-points]");
  if (pointsButton) {
    await runAction(pointsButton, () =>
      overrideSubmissionPoints(
        pointsButton.dataset.playerId,
        pointsButton.dataset.manualPoints,
      ),
    );
    return;
  }
  const bonusButton = event.target.closest("button[data-bonus-player]");
  if (bonusButton) {
    await runAction(bonusButton, () =>
      setSubmissionBonus(
        bonusButton.dataset.bonusPlayer,
        Number(bonusButton.dataset.currentBonus) ? 0 : 1,
      ),
    );
    return;
  }
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
  const { state, definition, round, submissions } = snapshot;
  const isSpelling = definition?.type === roundTypes.spellingBee;
  const isCharades = definition?.type === roundTypes.charades;
  phaseLabel.textContent = phaseTitle(state.phase, definition);
  cueHeading.textContent =
    state.phase === phases.lobby ? "Welcome" : definition?.typeLabel ?? partyGame.title;

  gamePanel.hidden = !definition || isSpelling || isCharades;
  spellingHost.hidden = !isSpelling;
  charadesHost.hidden = !isCharades || state.phase !== phases.question;
  renderAudioControls(definition, round, state.phase);
  bulkActions.hidden =
    state.phase !== phases.marking ||
    definition?.type !== roundTypes.fastestFreeText;
  const answerRound =
    definition &&
    ![
      roundTypes.pairingPrototype,
      roundTypes.spellingBee,
      roundTypes.charades,
    ].includes(
      definition.type,
    );
  submissionsHeading.hidden = !answerRound;
  submissionsList.hidden = !answerRound;
  emptySubmissions.hidden = !answerRound || submissions.length > 0;

  if (definition) {
    const hostContent = getHostContent(definition.id);
    questionText.textContent = definition.question ?? definition.title;
    correctAnswerRow.hidden = !(hostContent?.answer ?? definition.answer);
    correctAnswer.textContent = hostContent?.answer ?? definition.answer ?? "";
    notes.replaceChildren(...hostNoteBlocks(hostContent, definition.notes));
    roundType.textContent = definition.typeLabel;
    renderSubmissions(submissions, state.phase);
  }
  if (state.phase === phases.intermission && state.nextRoundId) {
    roundSelect.value = state.nextRoundId;
  }
  roundSelection.hidden = ![phases.lobby, phases.intermission].includes(
    state.phase,
  );
  const bespokeRoundActive =
    (isSpelling || isCharades) &&
    ![phases.lobby, phases.intermission].includes(state.phase);
  groupingPanel.hidden = bespokeRoundActive || !(
    state.phase === phases.lobby ||
    state.phase === phases.intermission ||
    [roundTypes.pairingPrototype, roundTypes.charades].includes(definition?.type)
  );

  if (isSpelling) {
    renderSpellingHost(state, round);
  }
  if (isCharades) {
    renderCharadesHost(state, round);
  }

  const nextLabels = {
    [phases.lobby]: "START GAME",
    [phases.opening]: "OPEN QUESTION",
    [phases.question]:
      isSpelling
        ? "MARK THE SPELLING"
        : isCharades
          ? "SHOW LEADERBOARD"
        : definition?.flow?.question?.hostLabel ?? "CLOSE ANSWERS",
    [phases.marking]:
      definition?.type === roundTypes.myDefinition
        ? "OPEN VOTING"
        : "REVEAL RESULTS",
    [phases.voting]: "CLOSE VOTING & REVEAL",
    [phases.reveal]: isSpelling ? "NEXT PLAYER" : "SHOW LEADERBOARD",
    [phases.leaderboard]: "FINISH",
    [phases.intermission]: "START SELECTED ROUND",
  };

  nextButton.textContent = nextLabels[state.phase] ?? "NEXT";
  nextButton.disabled = isSpelling && state.phase === phases.question;
}

function renderAudioControls(definition, round, phase) {
  const configured = Boolean(definition?.audio);
  audioControls.hidden = !configured;
  if (!configured) return;

  audioFile.textContent = `${definition.audio.file} · ${definition.audio.start}s–${
    definition.audio.start + definition.audio.duration
  }s`;
  const status = round?.audioStatus;
  const messages = {
    loading: status?.message ?? "Checking local Display…",
    ready: status?.message ?? "Clip ready on Display",
    playing: status?.message ?? "Playing on Display",
    stopped: status?.message ?? "Stopped",
    missing: status?.message ?? "Audio file is missing on the Display Mac",
    blocked: status?.message ?? "Display browser is waiting for sound permission",
    error: status?.message ?? "Display audio failed",
  };
  audioStatus.textContent = status
    ? messages[status.state] ?? status.message
    : "Waiting for local Display…";
  audioStatus.dataset.error = ["missing", "blocked", "error"].includes(
    status?.state,
  )
    ? "true"
    : "false";
  const active = ![phases.lobby, phases.intermission].includes(phase);
  Object.values(audioButtons).forEach((button) => {
    button.disabled = !active;
  });
}

function renderCharadesHost(state, round) {
  const active = latestGrouping.activeGroup;
  charadesGroup.textContent =
    active?.members?.map((member) => member.name).join(" · ") ??
    "No group selected";
  const prompt =
    charadesPrompts[(round?.promptIndex ?? 0) % charadesPrompts.length];
  charadesPrompt.textContent = prompt?.prompt ?? "No prompt configured";
  charadesCategory.textContent = prompt?.category ?? "";
  charadesAttempt.textContent = String(round?.attemptNumber ?? 1);
  charadesCorrectCount.textContent = String(round?.correctGuesses ?? 0);
  charadesSkippedCount.textContent = String(round?.skippedPrompts ?? 0);
  charadesTime.textContent = String(
    remainingTimerSeconds(round?.timer) ?? Number(charadesSeconds.value),
  );
  charadesOverlay.textContent =
    round?.displayMode === "overlay"
      ? "HIDE ACTIVE OVERLAY"
      : "SHOW ACTIVE OVERLAY";
  charadesStartTimer.disabled = state.phase !== phases.question;
  charadesStopTimer.disabled =
    state.phase !== phases.question || round?.timer?.status !== "running";
  charadesScoreButtons.querySelectorAll("button").forEach((button) => {
    button.disabled = state.phase !== phases.question || !active;
  });
  charadesCorrectButton.disabled = state.phase !== phases.question;
  charadesSkipButton.disabled = state.phase !== phases.question;
}

function renderSpellingHost(state, round) {
  const groups = latestGrouping.groups ?? [];
  spellingPlayer.replaceChildren(
    ...groups.map((group) => {
      const option = document.createElement("option");
      option.value = group.id;
      option.textContent = group.members?.[0]?.name ?? group.name;
      option.selected = group.id === latestGrouping.activeGroupId;
      return option;
    }),
  );
  spellingPlayer.disabled = state.phase !== phases.question;
  const item = spellingBeeWords[
    (round?.itemIndex ?? 0) % spellingBeeWords.length
  ];
  spellingWord.textContent = item?.word ?? "No word configured";
  spellingPronunciation.textContent = item?.pronunciation ?? "";
  spellingDefinition.textContent = item?.definition ?? "";
  spellingExample.textContent = item?.example ?? "";
  spellingNotes.textContent = item?.notes ?? "";
  spellingMarking.hidden = state.phase !== phases.question;
}

async function markCurrentSpelling(correct, button) {
  const item = spellingBeeWords[
    (gameSnapshot?.round?.itemIndex ?? 0) % spellingBeeWords.length
  ];
  await runAction(button, () => markSpelling({ word: item.word, correct }));
}

async function awardCurrentCharadesGroup(points, button) {
  const groupId = latestGrouping.activeGroupId;
  if (!groupId) return;
  await runAction(button, () =>
    awardGroupPoints(groupId, points, {
      roundType: roundTypes.charades,
      promptIndex: gameSnapshot?.round?.promptIndex ?? 0,
    }),
  );
}

function renderGrouping() {
  const groups = latestGrouping.groups ?? [];
  document.querySelector("#show-groups").textContent =
    latestGrouping.showAssignments
      ? "HIDE GROUPS ON DISPLAY"
      : "SHOW GROUPS ON DISPLAY";
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
  const nextId = nextActiveGroupId(
    groups,
    latestGrouping.activeGroupId,
    direction,
  );
  if (!nextId) return;
  setActiveGroup(nextId).catch((error) => {
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
      } else if (
        phase === phases.marking &&
        definition?.type === roundTypes.bestFreeText
      ) {
        for (let points = 0; points <= 5; points += 1) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "small-button";
          button.dataset.playerId = submission.playerId;
          button.dataset.manualPoints = String(points);
          button.textContent = String(points);
          button.setAttribute(
            "aria-label",
            `Award ${points} points to ${submission.playerName}`,
          );
          controls.append(button);
        }
      } else if (
        phase === phases.marking &&
        definition?.type === roundTypes.myDefinition
      ) {
        controls.textContent = "Ready for the vote";
      } else if (
        phase === phases.marking &&
        definition?.type === roundTypes.mcq
      ) {
        controls.textContent = `${submission.status} · ${
          submission.points ?? 0
        } pts`;
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
        if (
          definition?.type === roundTypes.fastestFreeText &&
          definition?.id === "fastest-shakespeare"
        ) {
          const bonus = document.createElement("button");
          bonus.type = "button";
          bonus.className = "small-button secondary";
          bonus.dataset.bonusPlayer = submission.playerId;
          bonus.dataset.currentBonus = String(submission.bonusPoints ?? 0);
          bonus.textContent = submission.bonusPoints
            ? "REMOVE UNIQUE +1"
            : "UNIQUE +1";
          controls.append(bonus);
        }
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

function phaseTitle(phase, definition) {
  if (phase === phases.question && definition?.type === roundTypes.charades) {
    return "Round in progress";
  }
  if (phase === phases.question && definition?.type === roundTypes.spellingBee) {
    return "Spell the word";
  }
  return {
    [phases.lobby]: "Lobby",
    [phases.opening]: "Round opening",
    [phases.question]: "Accepting answers",
    [phases.marking]: "Mark answers",
    [phases.voting]: "Definition voting",
    [phases.reveal]: "Reveal",
    [phases.leaderboard]: "Leaderboard",
    [phases.intermission]: "Waiting",
  }[phase];
}

function renderRoundOptions() {
  const sections = new Map();
  for (const round of getRounds()) {
    const section = round.section ?? "Other";
    if (!sections.has(section)) sections.set(section, []);
    sections.get(section).push(round);
  }
  roundSelect.replaceChildren(
    ...[...sections.entries()].map(([section, rounds]) => {
      const group = document.createElement("optgroup");
      group.label = section;
      group.append(
        ...rounds.map((round) => {
          const option = document.createElement("option");
          option.value = round.id;
          option.textContent = round.title;
          return option;
        }),
      );
      return group;
    }),
  );
}

function hostNoteBlocks(content, fallback = "") {
  const sections = [
    ["Accept", content?.acceptable?.join(" · ")],
    ["Pronunciation", content?.pronunciation],
    ["Definition", content?.definition],
    ["Origin", content?.origin],
    ["Facts", content?.facts?.join(" ")],
    ["Common misconception", content?.misconception],
    ["Scoring", content?.scoring],
    ["Media", content?.media],
    ["Notes", fallback],
  ].filter(([, value]) => value);

  return sections.map(([label, value]) => {
    const paragraph = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    paragraph.append(strong, document.createTextNode(value));
    return paragraph;
  });
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

document.addEventListener("keydown", (event) => {
  if (
    gameSnapshot?.definition?.type !== roundTypes.charades ||
    gameSnapshot?.state.phase !== phases.question ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)
  ) {
    return;
  }
  const action = {
    ArrowLeft: () => cycleActiveGroup(-1),
    ArrowRight: () => cycleActiveGroup(1),
    "[": () => moveCharadesPrompt(-1),
    "]": () => moveCharadesPrompt(1),
    " ": () =>
      gameSnapshot?.round?.timer?.status === "running"
        ? stopRoundTimer()
        : startRoundTimer(charadesSeconds.value),
  }[event.key];
  if (action) {
    event.preventDefault();
    Promise.resolve(action()).catch((error) =>
      console.error("[BBQ host] Keyboard control failed.", error),
    );
    return;
  }
  if (/^[0-5]$/.test(event.key)) {
    event.preventDefault();
    const button = charadesScoreButtons.querySelector(
      `[data-charades-points="${event.key}"]`,
    );
    awardCurrentCharadesGroup(event.key, button);
  }
});
