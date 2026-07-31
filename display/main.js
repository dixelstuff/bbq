import "../shared/development.js";
import "./styles.css";
import QRCode from "qrcode";
import { observePlayers } from "../shared/players.js";
import { observeStep } from "../shared/session-state.js";

const joinUrl = "https://dixelstuff.github.io/bbq/";
const waitingScreen = document.querySelector("#waiting-screen");
const gameScreen = document.querySelector("#game-screen");
const waitingPlayerCount = document.querySelector("#waiting-player-count");
const gamePlayerCount = document.querySelector("#game-player-count");
const qrCanvas = document.querySelector("#join-qr");
const screen = document.querySelector("#screen");

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

observePlayers((players) => {
  const count = players.length;
  waitingPlayerCount.textContent = `${count} ${count === 1 ? "PLAYER" : "PLAYERS"}`;
  gamePlayerCount.textContent = `${count} ${count === 1 ? "player" : "players"}`;
}).catch((error) => {
  console.error("Unable to observe players", error);
  waitingPlayerCount.textContent = "OFFLINE";
  gamePlayerCount.textContent = "Offline";
});

observeStep((step) => {
  const waiting = step === 1;
  waitingScreen.hidden = !waiting;
  gameScreen.hidden = waiting;
  screen.textContent = `SCREEN ${step}`;
}).catch((error) => {
  console.error("Unable to observe session step", error);
  waitingScreen.hidden = true;
  gameScreen.hidden = false;
  screen.textContent = "OFFLINE";
});
