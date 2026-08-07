import "../shared/development.js";
import "../shared/styles.css";
import {
  awardRevealedSubmissionPoints,
  advanceCharadesSet,
  beginRound,
  charadesSetPhases,
  confirmCharadesSetScore,
  controlRoundVideo,
  controlRoundAudio,
  advanceSpellingBel,
  closeAnswers,
  closeDefinitionVoting,
  finishRound,
  hideLeaderboard,
  markAllRemaining,
  openDefinitionVoting,
  openRoundQuestion,
  finishCharadesSet,
  recordCharadesAttempt,
  markSubmission,
  observeGame,
  overrideSubmissionPoints,
  phases,
  finalizeProgressiveReveal,
  revealSubmission,
  revealGenuineAnswer,
  revealRoundPoints,
  scoreAndReveal,
  showLeaderboard,
  setCharadesClueResult,
  startCharadesSet,
  startRoundTimer,
  setSubmissionBonus,
  skipToNextRound,
  toggleSpellingBelPuzzleDisplay,
} from "../shared/game-engine.js";
import {
  getRounds,
  partyGame,
} from "../shared/games/party-game.js";
import { maintainHostPresence } from "../shared/host-presence.js";
import {
  generateGrouping,
  groupingModes,
  observeGrouping,
  participationModes,
  setGroupingPresentation,
} from "../shared/grouping.js";
import { observePlayers } from "../shared/players.js";
import { releaseId, releaseOrder } from "../shared/release.js";
import {
  awardsPointsAfterGenuineAnswer,
  requiresGenuineAnswerReveal,
  roundTypes,
  usesProgressiveFreeTextReveal,
} from "../shared/round-types.js";
import {
  ensureSessionRelease,
  resetGame,
} from "../shared/session-state.js";
import { validateSpellingBelWord } from "../shared/rounds/spelling-bee/round.js";
import { wouldIMimeSets } from "./rounds/charades/content.js";
import {
  definitionContent,
  getHostContent,
} from "./rounds/demo-night/content.js";
import { hostSubmissionLabel } from "./marking-presentation.js";

const nextButton = document.querySelector("#next");
const nextHelp = document.querySelector("#next-help");
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
const revealGridButton = document.querySelector("#reveal-show-grid");
const revealRealAnswerButton = document.querySelector("#reveal-real-answer");
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
const spellingPuzzleLabel = document.querySelector("#spelling-puzzle-label");
const spellingStartTimer = document.querySelector("#spelling-start-timer");
const spellingShowPuzzle = document.querySelector("#spelling-show-puzzle");
const charadesHost = document.querySelector("#charades-host");
const charadesLive = document.querySelector("#charades-live");
const charadesControl = document.querySelector("#charades-control");
const charadesClue = document.querySelector("#charades-clue");
const charadesPassButton = document.querySelector("#charades-pass");
const charadesCorrectButton = document.querySelector("#charades-correct");
const charadesStartSetButton = document.querySelector("#charades-start-set");
const charadesSetLabel = document.querySelector("#charades-set-label");
const charadesTeam = document.querySelector("#charades-team");
const charadesSetStatus = document.querySelector("#charades-set-status");
const charadesSummary = document.querySelector("#charades-summary");
const charadesSetScore = document.querySelector("#charades-set-score");
const charadesClueResults = document.querySelector("#charades-clue-results");
const charadesConfirmScore = document.querySelector("#charades-confirm-score");
const charadesNextSet = document.querySelector("#charades-next-set");
const audioControls = document.querySelector("#audio-controls");
const audioFile = document.querySelector("#audio-file");
const audioStatus = document.querySelector("#audio-status");
const audioButtons = {
  play: document.querySelector("#audio-play"),
  replay: document.querySelector("#audio-replay"),
  extend: document.querySelector("#audio-extend"),
  stop: document.querySelector("#audio-stop"),
};
const videoControls = document.querySelector("#video-controls");
const videoStatus = document.querySelector("#video-status");
const videoPlayButton = document.querySelector("#video-play");

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

let finishingExpiredCharadesSet = false;
setInterval(() => {
  const set = gameSnapshot?.round?.sets?.[
    gameSnapshot?.round?.activeSetIndex ?? 0
  ];
  if (
    gameSnapshot?.definition?.type === roundTypes.charades &&
    gameSnapshot?.state.phase === phases.question &&
    gameSnapshot?.round?.charadesPhase === charadesSetPhases.active &&
    set?.timer?.status === "running" &&
    Date.now() >= set.timer.endsAt &&
    !finishingExpiredCharadesSet
  ) {
    finishingExpiredCharadesSet = true;
    finishCharadesSet()
      .catch((error) =>
        console.error("[BBQ host] Unable to finish expired set.", error),
      )
      .finally(() => {
        finishingExpiredCharadesSet = false;
      });
  }
}, 250);

for (const [action, button] of Object.entries(audioButtons)) {
  button.addEventListener("click", () =>
    runAction(button, () => controlRoundAudio(action)),
  );
}

videoPlayButton.addEventListener("click", () =>
  runAction(videoPlayButton, () =>
    controlRoundVideo(
      gameSnapshot?.definition?.video?.fullAfterAnswer ? "full" : "answer",
    ),
  ),
);

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
  const revealTotal = gameSnapshot?.submissions?.length ?? 0;
  const revealedCount = gameSnapshot?.round?.revealedSubmissionIds?.length ?? 0;
  const progressiveReveal = usesProgressiveFreeTextReveal(
    gameSnapshot?.definition,
  );
  const stagedGenuineAnswer = requiresGenuineAnswerReveal(
    gameSnapshot?.definition,
  );
  const videoAnswer = Boolean(gameSnapshot?.definition?.video?.initialStop);
  const revealAction = !progressiveReveal
    ? finishRound
    : revealedCount < revealTotal
      ? null
      : !gameSnapshot?.round?.revealGridFinalized
        ? finalizeProgressiveReveal
        : stagedGenuineAnswer && !gameSnapshot?.round?.genuineAnswerRevealed
          ? videoAnswer ? null : revealGenuineAnswer
        : !gameSnapshot?.round?.revealPoints && revealTotal > 0
          ? revealRoundPoints
          : finishRound;
  const spellingRevealAction = !progressiveReveal
    ? advanceSpellingBel
    : revealedCount < revealTotal
      ? null
      : !gameSnapshot?.round?.revealGridFinalized
        ? finalizeProgressiveReveal
        : !gameSnapshot?.round?.revealPoints && revealTotal > 0
          ? revealRoundPoints
          : advanceSpellingBel;
  const action = {
    [phases.lobby]: () => beginRound(roundSelect.value),
    [phases.opening]: openRoundQuestion,
    [phases.question]: charadesRound
      ? null
      : pairingRound
      ? finishRound
      : closeAnswers,
    [phases.marking]: definitionRound
      ? () =>
          openDefinitionVoting(
            definitionContent[gameSnapshot?.definition?.word]?.definition,
          )
      : scoreAndReveal,
    [phases.voting]: closeDefinitionVoting,
    [phases.reveal]: spellingRound ? spellingRevealAction : revealAction,
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
revealGridButton.addEventListener("click", () =>
  runAction(revealGridButton, finalizeProgressiveReveal),
);
revealRealAnswerButton.addEventListener("click", () =>
  runAction(revealRealAnswerButton, revealGenuineAnswer),
);
revealPointsButton.addEventListener("click", () =>
  runAction(revealPointsButton, revealRoundPoints),
);

spellingStartTimer.addEventListener("click", () =>
  runAction(spellingStartTimer, () => startRoundTimer(30)),
);
spellingShowPuzzle.addEventListener("click", () =>
  runAction(spellingShowPuzzle, toggleSpellingBelPuzzleDisplay),
);

charadesStartSetButton.addEventListener("click", () =>
  runAction(charadesStartSetButton, startCharadesSet),
);
charadesCorrectButton.addEventListener("click", () =>
  runAction(charadesCorrectButton, () => recordCharadesAttempt("correct")),
);
charadesPassButton.addEventListener("click", () =>
  runAction(charadesPassButton, () => recordCharadesAttempt("passed")),
);
charadesClueResults.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-charades-clue-index]");
  if (!button) return;
  runAction(button, () =>
    setCharadesClueResult(
      button.dataset.charadesClueIndex,
      button.dataset.correct !== "true",
    ),
  );
});
charadesConfirmScore.addEventListener("click", () =>
  runAction(charadesConfirmScore, confirmCharadesSetScore),
);
charadesNextSet.addEventListener("click", () =>
  runAction(charadesNextSet, advanceCharadesSet),
);
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
  const revealButton = event.target.closest("button[data-reveal-player]");
  if (revealButton) {
    await runAction(revealButton, () =>
      revealSubmission(revealButton.dataset.revealPlayer),
    );
    return;
  }
  const pointsButton = event.target.closest("button[data-manual-points]");
  if (pointsButton) {
    await runAction(pointsButton, () =>
      awardsPointsAfterGenuineAnswer(gameSnapshot?.definition)
        ? awardRevealedSubmissionPoints(
            pointsButton.dataset.playerId,
            pointsButton.dataset.manualPoints,
          )
        : overrideSubmissionPoints(
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

  gamePanel.hidden = !definition || isCharades;
  spellingHost.hidden =
    !isSpelling || ![phases.question, phases.marking, phases.reveal].includes(state.phase);
  charadesHost.hidden = !isCharades || state.phase !== phases.question;
  document.body.classList.toggle(
    "charades-live-mode",
    isCharades &&
      state.phase === phases.question &&
      round?.charadesPhase === charadesSetPhases.active,
  );
  renderAudioControls(definition, round, state.phase);
  renderVideoControls(definition, round, state.phase, submissions.length);
  bulkActions.hidden =
    state.phase !== phases.marking ||
    definition?.type !== roundTypes.fastestFreeText;
  const answerRound =
    definition &&
    ![
      roundTypes.pairingPrototype,
      roundTypes.charades,
    ].includes(
      definition.type,
    );
  submissionsHeading.hidden = !answerRound;
  submissionsList.hidden = !answerRound;
  emptySubmissions.hidden = !answerRound || submissions.length > 0;

  if (definition) {
    const hostRenderKey = `${definition.id}:${definition.puzzle?.id ?? ""}`;
    if (renderedHostRoundId !== hostRenderKey) {
      const hostContent = getHostContent(definition.id);
      questionText.textContent = definition.question ?? definition.title;
      correctAnswerRow.hidden = !(hostContent?.answer ?? definition.answer);
      correctAnswer.textContent = hostContent?.answer ?? definition.answer ?? "";
      notes.replaceChildren(...hostNoteBlocks(hostContent, definition.notes));
      roundType.textContent = definition.typeLabel;
      renderedHostRoundId = hostRenderKey;
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

  const stagedReveal =
    state.phase === phases.reveal &&
    usesProgressiveFreeTextReveal(definition) &&
    submissions.length > 0;

  const nextLabels = {
    [phases.lobby]: "START GAME",
    [phases.opening]: isSpelling
      ? (round?.openingIndex ?? 0) < (definition?.openingMedia?.length ?? 1) - 1
        ? "NEXT"
        : "START HAIRBRUSH"
      : "OPEN QUESTION",
    [phases.question]:
      isCharades || isPairing
          ? "FINISH ROUND"
        : definition?.flow?.question?.hostLabel ?? "CLOSE ANSWERS",
    [phases.marking]:
      definition?.type === roundTypes.myDefinition
        ? "OPEN VOTING"
        : "REVEAL RESULTS",
    [phases.voting]: "CLOSE VOTING & REVEAL",
    [phases.reveal]: !usesProgressiveFreeTextReveal(definition)
        ? "NEXT QUESTION"
        : (round?.revealedSubmissionIds?.length ?? 0) < submissions.length
          ? "CHOOSE AN ANSWER TO REVEAL"
          : !round?.revealGridFinalized
            ? "SHOW ALL ANSWERS"
            : requiresGenuineAnswerReveal(definition) &&
                !round?.genuineAnswerRevealed
              ? definition?.video?.initialStop
                ? "PLAY ANSWER CLIP"
                : "REVEAL REAL ANSWER"
            : !round?.revealPoints && submissions.length > 0
              ? "REVEAL POINTS"
              : isSpelling
                ? (round?.puzzleIndex ?? 0) + 1 < (definition?.puzzles?.length ?? 0)
                  ? "NEXT PUZZLE"
                  : "FINISH ROUND"
                : "NEXT QUESTION",
    [phases.leaderboard]: "RETURN TO ROUND",
    [phases.intermission]: "START SELECTED ROUND",
  };

  nextButton.textContent = nextLabels[state.phase] ?? "NEXT";
  nextHelp.textContent = nextActionExplanation(state, definition, round, submissions);
  nextButton.hidden = isCharades && state.phase === phases.question;
  nextButton.disabled =
    (stagedReveal &&
      (round?.revealedSubmissionIds?.length ?? 0) < submissions.length);
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
  revealControls.hidden = !stagedReveal;
  revealGridButton.disabled =
    !stagedReveal ||
    (round?.revealedSubmissionIds?.length ?? 0) < submissions.length ||
    Boolean(round?.revealGridFinalized);
  const needsGenuineAnswer = requiresGenuineAnswerReveal(definition);
  revealRealAnswerButton.hidden =
    !needsGenuineAnswer || Boolean(definition?.video?.initialStop);
  revealRealAnswerButton.disabled =
    !stagedReveal ||
    !round?.revealGridFinalized ||
    Boolean(round?.genuineAnswerRevealed);
  revealPointsButton.disabled =
    !stagedReveal ||
    !round?.revealGridFinalized ||
    (needsGenuineAnswer && !round?.genuineAnswerRevealed) ||
    Boolean(round?.revealPoints);
}

function nextActionExplanation(state, definition, round, submissions) {
  const isSpelling = definition?.type === roundTypes.spellingBee;
  if (state.phase === phases.opening && isSpelling) {
    const nextOpening = definition.openingMedia?.[(round?.openingIndex ?? 0) + 1];
    if (nextOpening) {
      const names = {
        "spelling-bel-title": "the Spelling Bel title slide",
        "spelling-bel-rules": "the Spelling Bel rules slide",
      };
      return `Next shows ${names[nextOpening.id] ?? "the next opening slide"} on the Display.`;
    }
    return "Next opens the Hairbrush puzzle and allows players to submit words.";
  }
  if (state.phase === phases.opening) {
    return "Next opens the question on the Display and allows phone submissions.";
  }
  if (state.phase === phases.question) {
    if (definition?.type === roundTypes.charades) return "Use the round controls above to finish this set.";
    if (definition?.type === roundTypes.pairingPrototype) return "Next finishes this round.";
    return "Next closes phone submissions and opens Host marking.";
  }
  if (state.phase === phases.marking) {
    return definition?.type === roundTypes.myDefinition
      ? "Next opens voting on every player's phone."
      : "Next reveals the marked results on the Display.";
  }
  if (state.phase === phases.voting) return "Next closes voting and reveals the real definition.";
  if (state.phase === phases.reveal) {
    if (!usesProgressiveFreeTextReveal(definition)) {
      return "Next finishes this question and moves to the next question or round.";
    }
    const revealed = round?.revealedSubmissionIds?.length ?? 0;
    if (usesProgressiveFreeTextReveal(definition) && revealed < submissions.length) {
      return "Reveal each submitted answer first; Next remains unavailable until all are shown.";
    }
    if (!round?.revealGridFinalized && usesProgressiveFreeTextReveal(definition)) {
      return "Next arranges all revealed answers into the final grid.";
    }
    if (requiresGenuineAnswerReveal(definition) && !round?.genuineAnswerRevealed) {
      return definition?.video?.initialStop
        ? "Play Answer Clip above to reveal the genuine line."
        : "Next reveals the genuine answer.";
    }
    if (!round?.revealPoints && submissions.length) return "Next reveals the awarded points.";
    if (isSpelling && (round?.puzzleIndex ?? 0) + 1 < (definition?.puzzles?.length ?? 0)) {
      return "Next opens the Marathon puzzle for player submissions.";
    }
    return "Next finishes this question and moves to the next question or round.";
  }
  if (state.phase === phases.leaderboard) return "Next returns to the current round.";
  if (state.phase === phases.intermission) return "Next starts the round selected above.";
  return "Next starts the round selected above.";
}

function renderVideoControls(definition, round, phase, submissionCount) {
  const hasVideo = Boolean(definition?.video);
  const initialAnswerClip = Boolean(definition?.video?.initialStop);
  const allRevealed =
    (round?.revealedSubmissionIds?.length ?? 0) === submissionCount;
  const canPlayAnswer =
    initialAnswerClip && phase === phases.reveal && allRevealed;
  const canPlayFull =
    definition?.video?.fullAfterAnswer &&
    phase === phases.reveal &&
    round?.genuineAnswerRevealed;
  videoControls.hidden = !hasVideo || (!canPlayAnswer && !canPlayFull);
  videoPlayButton.textContent = canPlayAnswer ? "PLAY ANSWER CLIP" : "PLAY CLIP";
  videoPlayButton.disabled = round?.videoStatus?.state === "playing";
  const messages = {
    loading: "Loading on Display…",
    playing: "Playing on Display",
    blocked: round?.videoStatus?.message ?? "Display needs media permission",
    finished: "Clip finished",
    error: round?.videoStatus?.message ?? "Video unavailable",
  };
  videoStatus.textContent = messages[round?.videoStatus?.state] ?? "Ready";
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
  const setIndex = round?.activeSetIndex ?? 0;
  const set = round?.sets?.[setIndex];
  const definitionSet = gameSnapshot?.definition?.sets?.[setIndex];
  const hostSet = wouldIMimeSets[setIndex];
  if (!set || !definitionSet || !hostSet) return;

  const team = latestGrouping.groups.find(
    (group) => group.id === set.teamGroupId,
  );
  const active = round.charadesPhase === charadesSetPhases.active;
  const summary = [
    charadesSetPhases.summary,
    charadesSetPhases.confirmed,
  ].includes(round.charadesPhase);
  const confirmed = round.charadesPhase === charadesSetPhases.confirmed;
  const lastSet = setIndex === round.sets.length - 1;

  charadesLive.hidden = !active;
  charadesControl.hidden = active;
  charadesClue.textContent =
    hostSet.clues[set.activeClueIndex] ?? "";
  charadesPassButton.disabled = !active;
  charadesCorrectButton.disabled = !active;

  charadesSetLabel.textContent = `SET ${set.setNumber} OF ${round.sets.length}`;
  charadesTeam.textContent = team?.name ?? `TEAM ${definitionSet.teamIndex + 1}`;
  charadesSetStatus.textContent = confirmed
    ? `Score confirmed: ${set.score} / 5`
    : summary
      ? "Check each result before confirming the score."
      : "Ready when your performer has the Host phone.";
  charadesStartSetButton.hidden = summary;
  charadesStartSetButton.disabled =
    state.phase !== phases.question ||
    round.charadesPhase !== charadesSetPhases.holding;
  charadesSummary.hidden = !summary;
  charadesSetScore.textContent = String(set.score ?? 0);
  charadesConfirmScore.hidden = confirmed;
  charadesNextSet.hidden = !confirmed;
  charadesNextSet.textContent = lastSet ? "FINISH ROUND" : "NEXT SET";

  charadesClueResults.replaceChildren(
    ...hostSet.clues.map((clue, index) => {
      const correct = set.clues[index]?.status === "correct";
      const item = document.createElement("li");
      item.className = correct ? "is-correct" : "is-not-correct";
      item.innerHTML = `<span>${escapeHtml(clue)}</span><button class="${
        correct ? "mark-correct" : "secondary"
      }" type="button" data-charades-clue-index="${index}" data-correct="${
        correct
      }" ${confirmed ? "disabled" : ""}>${
        correct ? "CORRECT" : "NOT CORRECT"
      }</button>`;
      return item;
    }),
  );
}

function renderSpellingHost(state, round) {
  const puzzle = gameSnapshot?.definition?.puzzle;
  spellingPuzzleLabel.textContent = puzzle
    ? `PUZZLE ${(round?.puzzleIndex ?? 0) + 1} · ${puzzle.title}`
    : "SPELLING BEL";
  spellingStartTimer.hidden = state.phase !== phases.question;
  spellingStartTimer.disabled = round?.timer?.status === "running";
  spellingStartTimer.textContent =
    round?.timer?.status === "running" ? "TIMER RUNNING" : "START 30-SECOND TIMER";
  spellingShowPuzzle.hidden = ![phases.marking, phases.reveal].includes(state.phase);
  spellingShowPuzzle.textContent = round?.forcePuzzleDisplay
    ? "RETURN TO ANSWER REVEAL"
    : "SHOW PUZZLE ON DISPLAY";
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
    revealedSubmissionIds: gameSnapshot?.round?.revealedSubmissionIds,
    revealGridFinalized: gameSnapshot?.round?.revealGridFinalized,
    genuineAnswerRevealed: gameSnapshot?.round?.genuineAnswerRevealed,
    revealPoints: gameSnapshot?.round?.revealPoints,
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
      const answerLabel = hostSubmissionLabel(submission, index, phase);
      const spellingWarning =
        definition?.type === roundTypes.spellingBee
          ? validateSpellingBelWord(submission.answer, definition.puzzle)
          : null;
      answer.innerHTML = `<strong>${escapeHtml(
        answerLabel,
      )}</strong><span>${escapeHtml(submission.answer)}</span>${
        spellingWarning?.warned
          ? `<span class="submission-warning">CHECK: ${escapeHtml([
              spellingWarning.missingCentreLetter
                ? `missing ${definition.puzzle.centreLetter}`
                : "",
              spellingWarning.unavailableLetters.length
                ? `unavailable ${spellingWarning.unavailableLetters.join(", ")}`
                : "",
            ].filter(Boolean).join(" · "))}</span>`
          : ""
      }`;
      controls.className = "mark-actions";

      if (
        phase === phases.reveal &&
        usesProgressiveFreeTextReveal(definition)
      ) {
        const revealed = gameSnapshot?.round?.revealedSubmissionIds?.includes(
          submission.playerId,
        );
        if (
          revealed &&
          awardsPointsAfterGenuineAnswer(definition) &&
          gameSnapshot?.round?.genuineAnswerRevealed &&
          (definition?.type !== roundTypes.spellingBee ||
            gameSnapshot?.round?.revealGridFinalized) &&
          !gameSnapshot?.round?.revealPoints
        ) {
          appendManualPointButtons(controls, submission);
        } else if (revealed) {
          controls.textContent = "REVEALED";
        } else {
          const reveal = document.createElement("button");
          reveal.type = "button";
          reveal.className = "small-button";
          reveal.dataset.revealPlayer = submission.playerId;
          reveal.textContent = "REVEAL";
          controls.append(reveal);
        }
      } else if (
        phase === phases.marking &&
        awardsPointsAfterGenuineAnswer(definition)
      ) {
        controls.textContent = "Ready for ordered reveal";
      } else if (
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
        definition?.type === roundTypes.bestFreeText &&
        !awardsPointsAfterGenuineAnswer(definition)
      ) {
        appendManualPointButtons(controls, submission);
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

function appendManualPointButtons(container, submission) {
  const maxPoints = gameSnapshot?.definition?.scoring?.maxPoints ?? 5;
  for (let points = 0; points <= maxPoints; points += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `small-button${
      Number(submission.points ?? 0) === points ? " is-selected" : ""
    }`;
    button.dataset.playerId = submission.playerId;
    button.dataset.manualPoints = String(points);
    button.textContent = String(points);
    button.setAttribute(
      "aria-label",
      `Award ${points} points to ${submission.playerName}`,
    );
    container.append(button);
  }
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
    return "Accepting words";
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
