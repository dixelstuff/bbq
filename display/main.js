import "../shared/development.js";
import "./styles.css";
import QRCode from "qrcode";
import { observeGame, phases } from "../shared/game-engine.js";
import { observePlayers } from "../shared/players.js";
import { observeGrouping } from "../shared/grouping.js";
import { releaseId, releaseOrder } from "../shared/release.js";
import { ensureSessionRelease } from "../shared/session-state.js";
import { resolveDisplayMedia } from "./media.js";
import {
  formatNumericAnswer,
  mediaForAudience,
  requiresGenuineAnswerReveal,
  roundTypes,
  usesProgressiveFreeTextReveal,
} from "../shared/round-types.js";
import { displayModes, displayModeForPhase } from "../shared/display-modes.js";
import {
  leaderboardLayout,
  remainingTimerSeconds,
} from "../shared/presentation.js";
import { production } from "./production.js";
import { setupDisplayAudio, syncDisplayAudio } from "./audio-playback.js";

const joinUrl = "https://dixelstuff.github.io/bbq/";
const waitingScreen = document.querySelector("#waiting-screen");
const questionScreen = document.querySelector("#question-screen");
const holdingScreen = document.querySelector("#holding-screen");
const revealScreen = document.querySelector("#reveal-screen");
const leaderboardScreen = document.querySelector("#leaderboard-screen");
const artworkScreen = document.querySelector("#artwork-screen");
const roundArtwork = document.querySelector("#round-artwork");
const activeGroupOverlay = document.querySelector("#active-group-overlay");
const activeGroupNames = document.querySelector("#active-group-names");
const groupsScreen = document.querySelector("#groups-screen");
const groupsBackground = document.querySelector("#groups-background");
const groupsModeTitle = document.querySelector("#groups-mode-title");
const displayGroups = document.querySelector("#display-groups");
const waitingPlayerCount = document.querySelector("#waiting-player-count");
const cornerPlayerCounts = document.querySelectorAll(".corner-player-count");
const playerNames = document.querySelector("#player-names");
const qrCanvas = document.querySelector("#join-qr");
const questionImage = document.querySelector("#display-question-image");
const questionText = document.querySelector("#display-question");
const displayRoundType = document.querySelector("#display-round-type");
const displayPrompt = document.querySelector("#display-prompt");
const holdingText = document.querySelector("#holding-text");
const revealQuestion = document.querySelector("#reveal-question");
const revealRoundType = document.querySelector("#reveal-round-type");
const revealCorrectAnswer = document.querySelector("#reveal-correct-answer");
const revealAnswers = document.querySelector("#reveal-answers");
const leaderboard = document.querySelector("#leaderboard");
const spellingRevealScreen = document.querySelector("#spelling-reveal-screen");
const spellingRevealArtwork = document.querySelector("#spelling-reveal-artwork");
const spellingRevealStatus = document.querySelector("#spelling-reveal-status");
const spellingRevealWord = document.querySelector("#spelling-reveal-word");
const timerScreen = document.querySelector("#timer-screen");
const timerValue = document.querySelector("#timer-value");
const enableAudioButton = document.querySelector("#enable-audio");

let players = [];
let gameSnapshot;
let groupingSnapshot = { groups: [] };
let progressiveRevealRoundKey;
let progressiveRevealCount = 0;
let progressiveRevealFinalized = false;

await ensureSessionRelease(releaseId, releaseOrder);
setupDisplayAudio(enableAudioButton);

QRCode.toCanvas(qrCanvas, joinUrl, {
  width: 520,
  margin: 2,
  color: {
    dark: "#08211a",
    light: "#f4fff8",
  },
}).catch((error) => {
  console.error("Unable to generate join QR code", error);
});

observePlayers((nextPlayers) => {
  players = nextPlayers;
  renderPlayerCounts();
}).catch((error) => {
  console.error("Unable to observe players", error);
  waitingPlayerCount.textContent = "OFFLINE";
});

observeGrouping((grouping) => {
  groupingSnapshot = grouping;
  renderGroupingPresentation();
}).catch((error) => {
  console.error("Unable to observe groups", error);
});

observeGame((snapshot) => {
  gameSnapshot = snapshot;
  syncDisplayAudio(snapshot);
  renderGame(snapshot);
}).catch((error) => {
  console.error("Unable to observe game", error);
  showOnly(holdingScreen);
  holdingText.textContent = "OFFLINE";
});

setInterval(renderTimerTick, 200);

function renderPlayerCounts() {
  const count = players.length;
  waitingPlayerCount.textContent = `${count} ${count === 1 ? "PLAYER" : "PLAYERS"}`;
  cornerPlayerCounts.forEach((element) => {
    element.textContent = `${count} ${count === 1 ? "player" : "players"}`;
  });
  playerNames.replaceChildren(
    ...players.map((player) => {
      const item = document.createElement("li");
      item.textContent = player.name;
      return item;
    }),
  );
}

function renderGame(snapshot) {
  const {
    state,
    definition,
    nextDefinition,
    round,
    submissions,
    leaderboard: scores,
  } = snapshot;

  if (groupingSnapshot.showAssignments) {
    renderGroupingPresentation();
    return;
  }

  if (state.phase === phases.lobby) {
    showOnly(waitingScreen);
    return;
  }

  if (state.phase === phases.opening && definition) {
    renderArtwork(definition, displayModes.artwork);
    return;
  }

  if (state.phase === phases.question && definition) {
    if (definition.type === roundTypes.charades && round?.timer) {
      renderTimer(round.timer);
      return;
    }
    const mode = round?.displayMode ?? displayModeForPhase(definition, state.phase);
    if (
      definition.type === roundTypes.spellingBee ||
      definition.type === roundTypes.pairingPrototype ||
      (definition.display &&
        [displayModes.artwork, displayModes.overlay].includes(mode))
    ) {
      renderArtwork(definition, mode);
      return;
    }
    showOnly(questionScreen);
    const media = resolveDisplayMedia(
      mediaForAudience(definition, "display"),
    );
    questionImage.hidden = !media;
    if (media?.type === "image") {
      questionImage.src = media.src;
      questionImage.alt = media.alt ?? "";
    } else {
      questionImage.removeAttribute("src");
      questionImage.alt = "";
    }
    displayRoundType.textContent = definition.typeLabel;
    questionText.textContent = definition.question;
    questionText.dataset.density =
      definition.question.length > 220
        ? "compact"
        : definition.question.length > 120
          ? "balanced"
          : "roomy";
    displayPrompt.textContent = definition.prompt ?? "";
    return;
  }

  if ([phases.marking, phases.voting].includes(state.phase)) {
    if (definition?.media?.title) {
      renderArtwork(definition, displayModes.artwork);
    } else {
      showOnly(holdingScreen);
      holdingText.textContent = "";
    }
    return;
  }

  if (state.phase === phases.reveal && definition) {
    if (definition.type === roundTypes.spellingBee) {
      renderSpellingReveal(definition, round);
      return;
    }
    showOnly(revealScreen);
    revealScreen.classList.toggle("mcq-results", definition.type === roundTypes.mcq);
    revealScreen.classList.toggle("lyric-results", Boolean(definition.genuineAnswer));
    revealRoundType.textContent = "";
    revealQuestion.textContent =
      definition.type === roundTypes.mcq || definition.genuineAnswer
        ? definition.question
        : "";
    const revealedAnswer =
      definition.type === roundTypes.closestWins
        ? formatNumericAnswer(definition.correctValue)
        : definition.type === roundTypes.myDefinition
          ? round?.result?.definition
          : definition.revealAnswer ?? definition.answer;
    const genuineAnswerStaged = requiresGenuineAnswerReveal(definition);
    const showGenuineAnswer =
      (!genuineAnswerStaged || round?.genuineAnswerRevealed) &&
      (definition.type !== roundTypes.bestFreeText ||
        definition.flow?.reveal?.showGenuineAnswer);
    revealCorrectAnswer.classList.toggle(
      "is-genuine",
      genuineAnswerStaged && Boolean(round?.genuineAnswerRevealed),
    );
    if (showGenuineAnswer && genuineAnswerStaged) {
      renderGenuineAnswer(definition, revealedAnswer);
    } else {
      revealCorrectAnswer.textContent = showGenuineAnswer
        ? definition.type === roundTypes.myDefinition
          ? `${definition.word}: ${revealedAnswer ?? ""}`
          : revealedAnswer ?? ""
        : "";
    }
    const progressive = usesProgressiveFreeTextReveal(definition);
    revealAnswers.classList.toggle("free-text-stage", progressive);
    revealAnswers.classList.toggle("mcq-summary", definition.type === roundTypes.mcq);
    if (definition.type === roundTypes.mcq) {
      revealAnswers.classList.remove("is-final-grid");
      revealAnswers.classList.remove("is-finalizing");
      renderMcqSummary(submissions);
      progressiveRevealRoundKey = undefined;
      progressiveRevealCount = 0;
      progressiveRevealFinalized = false;
      return;
    }
    const revealedIds = round?.revealedSubmissionIds ?? [];
    const revealCount = progressive ? revealedIds.length : submissions.length;
    const visibleSubmissions = progressive
      ? revealedIds
          .map((playerId) =>
            submissions.find((submission) => submission.playerId === playerId),
          )
          .filter(Boolean)
      : submissions;
    const showPoints = progressive ? Boolean(round?.revealPoints) : true;
    const finalGrid = progressive && Boolean(round?.revealGridFinalized);
    revealAnswers.classList.toggle("is-final-grid", finalGrid);
    revealAnswers.classList.toggle(
      "is-finalizing",
      finalGrid && !progressiveRevealFinalized,
    );
    const revealKey = `${definition.id}:${round?.startedAt ?? ""}`;
    const newAnswerArrived =
      progressive &&
      (revealKey !== progressiveRevealRoundKey ||
        revealCount > progressiveRevealCount);
    const justSettledIndex =
      progressive &&
      revealKey === progressiveRevealRoundKey &&
      revealCount === progressiveRevealCount + 1
        ? revealCount - 2
        : -1;
    revealAnswers.replaceChildren(
      ...visibleSubmissions.map((submission, index) => {
        const item = document.createElement("li");
        item.className = submission.status;
        if (progressive) {
          item.className = `free-text-card${
            index === visibleSubmissions.length - 1 && !finalGrid
              ? " is-featured"
              : ""
          }${
            index === visibleSubmissions.length - 1 &&
            newAnswerArrived &&
            !finalGrid
              ? " is-arriving"
              : ""
          }${index === justSettledIndex ? " just-settled" : ""}`;
          item.innerHTML = `<strong>${escapeHtml(
            submission.playerName,
          )}</strong><span class="free-text-answer">“${escapeHtml(
            submission.answer,
          )}”</span><span class="points-badge${
            showPoints ? " is-visible" : ""
          }">+${submission.points ?? 0}</span>`;
        } else if (definition.type === roundTypes.closestWins) {
          item.className = "closest-result";
          item.innerHTML = `<strong>${submission.placing}</strong><strong>${escapeHtml(
            submission.playerName,
          )}</strong><span>${escapeHtml(submission.answer)}</span><strong>${
            showPoints ? `+${submission.points ?? 0}` : ""
          }</strong>`;
        } else if (definition.type === roundTypes.myDefinition) {
          const points =
            round?.definitionScores?.[submission.playerId] ?? 0;
          item.innerHTML = `<strong>${escapeHtml(
            submission.playerName,
          )}</strong><span>${escapeHtml(
            submission.answer,
          )}</span><span>${showPoints ? `+${points}` : ""}</span>`;
        } else if (definition.type === roundTypes.bestFreeText) {
          item.innerHTML = `<strong>${escapeHtml(
            submission.playerName,
          )}</strong><span>${escapeHtml(submission.answer)}</span><span>${
            showPoints ? `+${submission.points ?? 0}` : ""
          }</span>`;
        } else {
          item.innerHTML = `<strong>${escapeHtml(
            submission.playerName,
          )}</strong><span>${escapeHtml(submission.answer)}</span><span>${
            showPoints
              ? `${submission.status === "correct" ? "Correct" : "Incorrect"} · ${submission.points ?? 0} pts`
              : ""
          }</span>`;
        }
        return item;
      }),
    );
    if (progressive) {
      progressiveRevealRoundKey = revealKey;
      progressiveRevealCount = revealCount;
      progressiveRevealFinalized = finalGrid;
    } else {
      progressiveRevealRoundKey = undefined;
      progressiveRevealCount = 0;
      progressiveRevealFinalized = false;
    }
    return;
  }

  if (state.phase === phases.leaderboard) {
    showOnly(leaderboardScreen);
    const layout = leaderboardLayout(scores.length);
    leaderboard.style.setProperty("--leaderboard-columns", layout.columns);
    leaderboard.style.setProperty("--leaderboard-rows", layout.rows);
    leaderboard.dataset.density =
      scores.length > 14 ? "compact" : scores.length > 7 ? "balanced" : "roomy";
    leaderboard.replaceChildren(
      ...scores.map((player, index) => {
        const item = document.createElement("li");
        item.innerHTML = `<span>${index + 1}. ${escapeHtml(
          player.name,
        )}</span><strong>${player.score ?? 0}</strong>`;
        return item;
      }),
    );
    production.playLeaderboard(
      leaderboardScreen,
      `leaderboard:${snapshot.round?.startedAt}`,
    );
    return;
  }

  if (state.phase === phases.intermission && nextDefinition) {
    renderArtwork(nextDefinition, displayModes.artwork);
    return;
  }

  showOnly(holdingScreen);
  holdingText.textContent = "WAITING FOR NEXT ROUND…";
}

function renderGenuineAnswer(definition, fallbackAnswer) {
  const answer = definition.genuineAnswer;
  const label = document.createElement("small");
  const lyric = document.createElement("span");
  label.textContent = answer ? "CORRECT LYRIC" : "GENUINE ANSWER";
  lyric.className = "genuine-lyric";

  if (answer?.lyricLines?.length) {
    lyric.replaceChildren(
      ...answer.lyricLines.map((line, index) => {
        const row = document.createElement("span");
        row.textContent = line;
        row.classList.toggle("is-emphasis", index === answer.emphasisLine);
        return row;
      }),
    );
  } else {
    lyric.textContent = fallbackAnswer ?? "";
  }

  revealCorrectAnswer.replaceChildren(label, lyric);
  if (answer?.song || answer?.artist) {
    const credit = document.createElement("span");
    credit.className = "genuine-credit";
    credit.textContent = [answer.song, answer.artist].filter(Boolean).join(" · ");
    revealCorrectAnswer.append(credit);
  }
}

function renderMcqSummary(submissions) {
  const groups = [
    ["CORRECT", submissions.filter((submission) => submission.status === "correct")],
    ["INCORRECT", submissions.filter((submission) => submission.status !== "correct")],
  ];
  revealAnswers.replaceChildren(
    ...groups.map(([heading, entries]) => {
      const column = document.createElement("li");
      const title = document.createElement("h2");
      const names = document.createElement("ul");
      column.className = `mcq-result-column ${heading.toLowerCase()}`;
      title.textContent = heading;
      names.replaceChildren(
        ...entries.map((submission) => {
          const row = document.createElement("li");
          const name = document.createElement("strong");
          name.textContent = submission.playerName;
          row.append(name);
          if (submission.status === "correct" && submission.points === 2) {
            const bonus = document.createElement("span");
            bonus.textContent = "FASTEST CORRECT · +1 SPEED BONUS";
            row.append(bonus);
          }
          return row;
        }),
      );
      if (!entries.length) {
        const empty = document.createElement("li");
        empty.textContent = "—";
        names.append(empty);
      }
      column.append(title, names);
      return column;
    }),
  );
}

function showOnly(activeScreen) {
  [
    waitingScreen,
    questionScreen,
    holdingScreen,
    revealScreen,
    leaderboardScreen,
    artworkScreen,
    groupsScreen,
    spellingRevealScreen,
    timerScreen,
  ].forEach((screen) => {
    screen.hidden = screen !== activeScreen;
  });
}

function renderArtwork(definition, mode) {
  showOnly(artworkScreen);
  roundArtwork.classList.remove("production-artwork-faded");
  const titleMedia = resolveDisplayMedia(
    mediaForAudience(definition, "display", "title"),
  );
  roundArtwork.hidden = !titleMedia;
  if (titleMedia) {
    roundArtwork.src = titleMedia.src;
    roundArtwork.alt = titleMedia.alt ?? "";
  }
  const showOverlay =
    mode === displayModes.overlay && definition.display?.overlay !== false;
  activeGroupOverlay.hidden = !showOverlay;
  activeGroupNames.replaceChildren(
    ...(groupingSnapshot.activeGroup?.members ?? []).map((member) => {
      const name = document.createElement("span");
      name.textContent = member.name;
      return name;
    }),
  );
  production.playTitle(
    artworkScreen,
    `title:${gameSnapshot?.round?.startedAt}:${mode}`,
  );
}

function renderSpellingReveal(definition, round) {
  showOnly(spellingRevealScreen);
  const titleMedia = resolveDisplayMedia(
    mediaForAudience(definition, "display", "title"),
  );
  spellingRevealArtwork.hidden = !titleMedia;
  if (titleMedia) {
    spellingRevealArtwork.src = titleMedia.src;
    spellingRevealArtwork.alt = titleMedia.alt ?? "";
  }
  production.fadeArtwork(spellingRevealArtwork);
  spellingRevealStatus.textContent = round?.result?.correct
    ? "CORRECT"
    : "INCORRECT";
  spellingRevealStatus.className = round?.result?.correct
    ? "is-correct"
    : "is-incorrect";
  spellingRevealWord.textContent = round?.result?.word ?? "";
  const revealKey = `${round?.startedAt}:${round?.result?.markedAt}`;
  production.playReveal(spellingRevealScreen, `reveal:${revealKey}`);
  if (round?.result?.correct) {
    production.playCorrect(`correct:${revealKey}`);
  } else {
    production.playWrong(`wrong:${revealKey}`);
  }
}

function renderTimer(timer) {
  showOnly(timerScreen);
  const seconds = remainingTimerSeconds(timer);
  timerValue.textContent = seconds > 0 ? String(seconds) : "TIME!";
  timerScreen.classList.toggle("timer-complete", seconds === 0);
  if (seconds === 0) {
    production.playTimerComplete(`timer:${timer.endsAt}`);
  }
}

function renderTimerTick() {
  if (
    gameSnapshot?.definition?.type === roundTypes.charades &&
    gameSnapshot.state.phase === phases.question &&
    gameSnapshot.round?.timer
  ) {
    renderTimer(gameSnapshot.round.timer);
  }
}

function renderGroupingPresentation() {
  if (!groupingSnapshot.showAssignments) {
    if (gameSnapshot) renderGame(gameSnapshot);
    return;
  }
  showOnly(groupsScreen);
  const groups = groupingSnapshot.groups ?? [];
  const rosterTerm =
    groupingSnapshot.mode === "two-teams"
      ? "TEAMS"
      : groupingSnapshot.mode === "individual"
        ? "PLAYERS"
        : groupingSnapshot.mode === "pairs"
          ? "PAIRS"
          : "GROUPS";
  groupsModeTitle.textContent = `TONIGHT'S ${rosterTerm}`;
  const titleMedia = resolveDisplayMedia(
    mediaForAudience(gameSnapshot?.definition, "display", "title"),
  );
  groupsBackground.hidden = !titleMedia;
  if (titleMedia) {
    groupsBackground.src = titleMedia.src;
    groupsBackground.alt = "";
  }
  displayGroups.replaceChildren(
    ...groups.map((group) => {
      const card = document.createElement("article");
      const heading = document.createElement("h2");
      heading.textContent = group.name;
      const names = document.createElement("div");
      names.className = "roster-names";
      names.replaceChildren(
        ...group.members.map((member) => {
          const name = document.createElement("span");
          name.textContent = member.name;
          return name;
        }),
      );
      card.append(heading, names);
      return card;
    }),
  );
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}
