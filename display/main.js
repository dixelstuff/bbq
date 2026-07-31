import "../shared/development.js";
import "./styles.css";
import QRCode from "qrcode";
import { observeGame, phases } from "../shared/game-engine.js";
import { observePlayers } from "../shared/players.js";
import { observeGrouping } from "../shared/grouping.js";
import { releaseId } from "../shared/release.js";
import { ensureSessionRelease } from "../shared/session-state.js";
import { resolveDisplayMedia } from "./media.js";
import {
  formatNumericAnswer,
  mediaForAudience,
  roundTypes,
} from "../shared/round-types.js";
import { displayModes, displayModeForPhase } from "../shared/display-modes.js";

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

let players = [];
let gameSnapshot;
let groupingSnapshot = { groups: [] };

await ensureSessionRelease(releaseId);

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
  renderGame(snapshot);
}).catch((error) => {
  console.error("Unable to observe game", error);
  showOnly(holdingScreen);
  holdingText.textContent = "OFFLINE";
});

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
  const { state, definition, round, submissions, leaderboard: scores } = snapshot;

  if (groupingSnapshot.showAssignments) {
    renderGroupingPresentation();
    return;
  }

  if (state.phase === phases.lobby) {
    showOnly(waitingScreen);
    return;
  }

  if (state.phase === phases.question && definition) {
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
    displayPrompt.textContent = definition.prompt ?? "";
    return;
  }

  if (state.phase === phases.marking) {
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
    revealRoundType.textContent = definition.typeLabel;
    revealQuestion.textContent = definition.question;
    revealCorrectAnswer.textContent = `CORRECT ANSWER: ${
      definition.type === roundTypes.closestWins
        ? formatNumericAnswer(definition.correctValue)
        : definition.answer
    }`;
    revealAnswers.replaceChildren(
      ...submissions.map((submission) => {
        const item = document.createElement("li");
        item.className = submission.status;
        if (definition.type === roundTypes.closestWins) {
          item.className = "closest-result";
          item.innerHTML = `<strong>${submission.placing}</strong><strong>${escapeHtml(
            submission.playerName,
          )}</strong><span>${escapeHtml(submission.answer)}</span><strong>+${
            submission.points ?? 0
          }</strong>`;
        } else {
          item.innerHTML = `<strong>${escapeHtml(
            submission.playerName,
          )}</strong><span>${escapeHtml(submission.answer)}</span><span>${
            submission.status === "correct" ? "Correct" : "Incorrect"
          } · ${submission.points ?? 0} pts</span>`;
        }
        return item;
      }),
    );
    return;
  }

  if (state.phase === phases.leaderboard) {
    showOnly(leaderboardScreen);
    leaderboard.replaceChildren(
      ...scores.map((player, index) => {
        const item = document.createElement("li");
        item.innerHTML = `<span>${index + 1}. ${escapeHtml(
          player.name,
        )}</span><strong>${player.score ?? 0}</strong>`;
        return item;
      }),
    );
    return;
  }

  showOnly(holdingScreen);
  holdingText.textContent = "WAITING FOR NEXT ROUND…";
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
  ].forEach((screen) => {
    screen.hidden = screen !== activeScreen;
  });
}

function renderArtwork(definition, mode) {
  showOnly(artworkScreen);
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
  spellingRevealStatus.textContent = round?.result?.correct
    ? "CORRECT"
    : "INCORRECT";
  spellingRevealStatus.className = round?.result?.correct
    ? "is-correct"
    : "is-incorrect";
  spellingRevealWord.textContent = round?.result?.word ?? "";
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
        : groups.every((group) => group.memberIds?.length === 2)
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
