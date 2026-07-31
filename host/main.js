import "../shared/development.js";
import "../shared/styles.css";
import {
  beginRound,
  activateCharadesTeam,
  controlRoundAudio,
  advanceSpelling,
  closeAnswers,
  closeDefinitionVoting,
  finishRound,
  hideLeaderboard,
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
  revealNextAnswer,
  revealRoundPoints,
  scoreAndReveal,
  showLeaderboard,
  startRoundTimer,
  stopRoundTimer,
  setRoundDisplayOverlay,
  setSubmissionBonus,
  skipToNextRound,
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
import { charadesPromptSets } from "./rounds/charades/content.js";
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
const leaderboardToggle = document.querySelector("#leaderboard-toggle");
const skipButton = document.querySelector("#skip-round");
const revealControls = document.querySelector("#reveal-controls");
const revealNextButton = document.querySelector("#reveal-next-answer");
const revealPointsButton = document.querySelector("#reveal-points");
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
const spellingHost = document.querySelector("#spelling-host");
const spellingPlayer = document.querySelector("#spelling-player");
const spellingWord = document.querySelector("#spelling-word");
const spellingPronunciation = document.querySelector("#spelling-pronunciation");
const spellingDefinition = document.querySelector("#spelling-definition");
const spellingExample = document.querySelector("#spelling-example");
const spellingOrigin = document.querySelector("#spelling-origin");
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
let renderedHostRoundId;
let renderedSubmissionSignature;

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
  const revealCount = gameSnapshot?.round?.revealCount ?? 0;
  const revealTotal = gameSnapshot?.submissions?.length ?? 0;
  const revealAction = revealCount < revealTotal
    ? revealNextAnswer
    : !gameSnapshot?.round?.revealPoints && revealTotal > 0
      ? revealRoundPoints
      : finishRound;
  const action = {
    [phases.lobby]: () => beginRound(roundSelect.value),
    [phases.opening]: openRoundQuestion,
    [phases.question]: spellingRound
      ? null
      : charadesRound || pairingRound
      ? finishRound
      : closeAnswers,
    [phases.marking]: definitionRound
      ? () =>
          openDefinitionVoting(
            definitionContent[gameSnapshot?.definition?.word]?.definition,
          )
      : scoreAndReveal,
    [phases.voting]: closeDefinitionVoting,
    [phases.reveal]: spellingRound ? advanceSpelling : revealAction,
    [phases.leaderboard]: hideLeaderboard,
    [phases.intermission]: () => beginRound(roundSelect.value),
  }[phase];

  if (action) {
    await runAction(nextButton, action);
  }
});

leaderboardToggle.addEventListener("click", () =>
  runAction(
    leaderboardToggle,
    gameSnapshot?.state.phase === phases.leaderboard
      ? hideLeaderboard
      : showLeaderboard,
  ),
);

skipButton.addEventListener("click", () =>
  runAction(skipButton, skipToNextRound),
);
revealNextButton.addEventListener("click", () =>
  runAction(revealNextButton, revealNextAnswer),
);
revealPointsButton.addEventListener("click", () =>
  runAction(revealPointsButton, revealRoundPoints),
);

spellingPlayer.addEventListener("change", () =>
  runAction(spellingPlayer, () => setActiveGroup(spellingPlayer.value)),
);

spellingCorrect.addEventListener("click", () =>
  markCurrentSpelling(true, spellingCorrect),
);

spellingIncorrect.addEventListener("click", () =>
  markCurrentSpelling(false, spellingIncorrect),
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
document.querySelector("#generate-teams").addEventListener("click", (event) =>
  runAction(event.currentTarget, () =>
    generateGrouping(groupingModes.twoTeams, participationModes.turnBased),
  ),
);

document.querySelector("#show-groups").addEventListener("click", (event) =>
  runAction(event.currentTarget, () =>
    setGroupingPresentation(!latestGrouping.showAssignments),
  ),
);

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
  updateDisconnectedWarning();
  renderSimulatorPlayers();
  renderGrouping();
}

function renderGame(snapshot) {
  const { state, definition, round, submissions } = snapshot;
  const isSpelling = definition?.type === roundTypes.spellingBee;
  const isCharades = definition?.type === roundTypes.charades;
  const isPairing = definition?.type === roundTypes.pairingPrototype;
  updateDisconnectedWarning(definition, state.phase);
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
    if (renderedHostRoundId !== definition.id) {
      const hostContent = getHostContent(definition.id);
      questionText.textContent = definition.question ?? definition.title;
      correctAnswerRow.hidden = !(hostContent?.answer ?? definition.answer);
      correctAnswer.textContent = hostContent?.answer ?? definition.answer ?? "";
      notes.replaceChildren(...hostNoteBlocks(hostContent, definition.notes));
      roundType.textContent = definition.typeLabel;
      renderedHostRoundId = definition.id;
    }
    renderSubmissions(submissions, state.phase);
  } else {
    renderedHostRoundId = undefined;
    renderedSubmissionSignature = undefined;
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
        : isCharades || isPairing
          ? "FINISH ROUND"
        : definition?.flow?.question?.hostLabel ?? "CLOSE ANSWERS",
    [phases.marking]:
      definition?.type === roundTypes.myDefinition
        ? "OPEN VOTING"
        : "REVEAL RESULTS",
    [phases.voting]: "CLOSE VOTING & REVEAL",
    [phases.reveal]: isSpelling
      ? "NEXT PLAYER"
      : (round?.revealCount ?? 0) < submissions.length
        ? "REVEAL NEXT ANSWER"
        : !round?.revealPoints && submissions.length > 0
          ? "REVEAL POINTS"
          : "NEXT QUESTION",
    [phases.leaderboard]: "RETURN TO ROUND",
    [phases.intermission]: "START SELECTED ROUND",
  };

  nextButton.textContent = nextLabels[state.phase] ?? "NEXT";
  nextButton.disabled = isSpelling && state.phase === phases.question;
  leaderboardToggle.textContent =
    state.phase === phases.leaderboard
      ? "RETURN TO ROUND"
      : "SHOW LEADERBOARD";
  skipButton.hidden = ![
    phases.opening,
    phases.question,
    phases.marking,
    phases.voting,
  ].includes(state.phase);
  const stagedReveal =
    state.phase === phases.reveal &&
    !isSpelling &&
    submissions.length > 0;
  revealControls.hidden = !stagedReveal;
  revealNextButton.disabled =
    !stagedReveal || (round?.revealCount ?? 0) >= submissions.length;
  revealPointsButton.disabled = !stagedReveal || Boolean(round?.revealPoints);
}

function updateDisconnectedWarning(
  definition = gameSnapshot?.definition,
  phase = gameSnapshot?.state?.phase,
) {
  const phoneCritical = Boolean(definition?.submission) ||
    definition?.type === roundTypes.myDefinition;
  const approachingPhoneRound = [phases.opening, phases.question, phases.voting]
    .includes(phase);
  const hasDisconnected = latestPlayers.some((player) => !player.connected);
  disconnectedWarning.hidden = !(
    phoneCritical && approachingPhoneRound && hasDisconnected
  );
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
    charadesPromptSets[gameSnapshot?.definition?.promptSetIndex ?? 0]?.[
      Math.max(0, latestGrouping.groups.findIndex(
        (group) => group.id === latestGrouping.activeGroupId,
      )) * 5 + Math.min(4, round?.promptIndex ?? 0)
    ];
  charadesPrompt.textContent = prompt?.prompt ?? "No prompt configured";
  charadesCategory.textContent = prompt?.category ?? "";
  charadesAttempt.textContent = `${Math.min(5, round?.attemptNumber ?? 1)} / 5`;
  charadesCorrectCount.textContent = String(round?.correctGuesses ?? 0);
  charadesSkippedCount.textContent = String(round?.skippedPrompts ?? 0);
  charadesTime.textContent = String(
    remainingTimerSeconds(round?.timer) ?? Number(charadesSeconds.value),
  );
  const finishedSet = (round?.attemptNumber ?? 1) > 5;
  charadesCorrectButton.disabled = finishedSet;
  charadesSkipButton.disabled = finishedSet;
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
  spellingOrigin.textContent = item?.origin ?? "";
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
  await runAction(button, async () => {
    await awardGroupPoints(groupId, points, {
      roundType: roundTypes.charades,
      promptIndex: gameSnapshot?.round?.promptIndex ?? 0,
    });
    const nextId = nextActiveGroupId(
      latestGrouping.groups ?? [],
      groupId,
      1,
    );
    if (nextId && nextId !== groupId) await activateCharadesTeam(nextId);
  });
}

function renderGrouping() {
  const groups = latestGrouping.groups ?? [];
  document.querySelector("#show-groups").textContent =
    latestGrouping.showAssignments
      ? "HIDE TEAMS ON DISPLAY"
      : "SHOW TEAMS ON DISPLAY";
  hostGroups.replaceChildren(
    ...groups.map((group) => {
      const card = document.createElement("article");
      card.className = "host-group";
      card.innerHTML = `<div><strong>${escapeHtml(
        group.name,
      )}</strong><span>${escapeHtml(
        group.members.map((member) => member.name).join(", ") || "Empty",
      )}</span></div>`;
      return card;
    }),
  );
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
      vote: gameSnapshot?.round?.votes?.[player.id],
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
      const activity = submission?.answer ?? (player.vote ? "Vote locked" : "No answer");
      row.innerHTML = `<input type="checkbox" data-sim-player="${escapeHtml(
        player.id,
      )}" ${player.connected ? "checked" : ""}><strong>${escapeHtml(
        player.name,
      )}</strong><span>${escapeHtml(
        gameSnapshot?.state.phase ?? "lobby",
      )}</span><span>${escapeHtml(
        activity,
      )}</span><span>${player.score ?? 0} pts</span>`;
      return row;
    }),
  );
}

function renderSubmissions(submissions, phase) {
  const definition = gameSnapshot?.definition;
  const signature = JSON.stringify({
    phase,
    roundId: definition?.id,
    submissions: submissions.map((submission) => ({
      playerId: submission.playerId,
      answer: submission.answer,
      status: submission.status,
      points: submission.points,
      bonus: submission.bonus,
      placing: submission.placing,
    })),
  });
  if (signature === renderedSubmissionSignature) return;
  renderedSubmissionSignature = signature;
  submissionsList.replaceChildren(
    ...submissions.map((submission, index) => {
      const item = document.createElement("li");
      const answer = document.createElement("div");
      const controls = document.createElement("div");

      item.className = `submission-row ${submission.status}`;
      const prefix = submission.placing
        ? `${submission.placing}.`
        : `${index + 1}.`;
      const blindMarking = phase === phases.marking;
      const answerLabel = blindMarking
        ? `ANSWER ${index + 1}`
        : `${prefix} ${submission.playerName}`;
      answer.innerHTML = `<strong>${escapeHtml(
        answerLabel,
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

  const blocks = sections.map(([label, value]) => {
    const paragraph = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    paragraph.append(strong, document.createTextNode(value));
    return paragraph;
  });

  for (const section of content?.research ?? []) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const body = document.createElement("div");
    summary.textContent = section.title;
    body.className = "host-research-body";
    if (section.intro) {
      const intro = document.createElement("p");
      intro.textContent = section.intro;
      body.append(intro);
    }
    if (section.items?.length) {
      const list = document.createElement("ul");
      for (const item of section.items) {
        const row = document.createElement("li");
        row.textContent = item;
        list.append(row);
      }
      body.append(list);
    }
    if (section.source?.url) {
      const source = document.createElement("a");
      source.href = section.source.url;
      source.target = "_blank";
      source.rel = "noreferrer";
      source.textContent = `Source: ${section.source.label}`;
      body.append(source);
    }
    details.append(summary, body);
    blocks.push(details);
  }

  return blocks;
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
