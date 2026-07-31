import "../shared/development.js";
import "./styles.css";
import QRCode from "qrcode";
import { observeGame, phases } from "../shared/game-engine.js";
import { observePlayers } from "../shared/players.js";

const joinUrl = "https://dixelstuff.github.io/bbq/";
const waitingScreen = document.querySelector("#waiting-screen");
const questionScreen = document.querySelector("#question-screen");
const holdingScreen = document.querySelector("#holding-screen");
const revealScreen = document.querySelector("#reveal-screen");
const leaderboardScreen = document.querySelector("#leaderboard-screen");
const waitingPlayerCount = document.querySelector("#waiting-player-count");
const cornerPlayerCounts = document.querySelectorAll(".corner-player-count");
const playerNames = document.querySelector("#player-names");
const qrCanvas = document.querySelector("#join-qr");
const questionImage = document.querySelector("#display-question-image");
const questionText = document.querySelector("#display-question");
const holdingText = document.querySelector("#holding-text");
const revealQuestion = document.querySelector("#reveal-question");
const revealAnswers = document.querySelector("#reveal-answers");
const leaderboard = document.querySelector("#leaderboard");

let players = [];

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

observeGame(renderGame).catch((error) => {
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
  const { state, definition, submissions, leaderboard: scores } = snapshot;

  if (state.phase === phases.lobby) {
    showOnly(waitingScreen);
    return;
  }

  if (state.phase === phases.question && definition) {
    showOnly(questionScreen);
    questionImage.src = definition.image;
    questionImage.alt = definition.imageAlt;
    questionText.textContent = definition.question;
    return;
  }

  if (state.phase === phases.marking) {
    showOnly(holdingScreen);
    holdingText.textContent = "ANSWERS LOCKED";
    return;
  }

  if (state.phase === phases.reveal && definition) {
    showOnly(revealScreen);
    revealQuestion.textContent = definition.question;
    revealAnswers.replaceChildren(
      ...submissions.map((submission) => {
        const item = document.createElement("li");
        item.className = submission.status;
        item.innerHTML = `<strong>${escapeHtml(
          submission.playerName,
        )}</strong><span>${escapeHtml(submission.answer)}</span><span>${
          submission.status === "correct" ? "Correct" : "Incorrect"
        } · ${submission.points ?? 0} pts</span>`;
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
  ].forEach((screen) => {
    screen.hidden = screen !== activeScreen;
  });
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}
