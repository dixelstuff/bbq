import "../shared/styles.css";
import QRCode from "qrcode";
import { observePlayers } from "../shared/players.js";
import { observeStep } from "../shared/session-state.js";

const joinUrl = "https://dixelstuff.github.io/bbq/";
const playerCount = document.querySelector("#player-count");
const playerNames = document.querySelector("#player-names");
const qrCanvas = document.querySelector("#join-qr");
const screen = document.querySelector("#screen");

QRCode.toCanvas(qrCanvas, joinUrl, {
  width: 320,
  margin: 2,
  color: {
    dark: "#181816",
    light: "#ffffff",
  },
}).catch((error) => {
  console.error("Unable to generate join QR code", error);
});

observePlayers((players) => {
  const count = players.length;
  playerCount.textContent = `${count} ${
    count === 1 ? "player" : "players"
  } connected`;

  playerNames.replaceChildren(
    ...players.map((player) => {
      const item = document.createElement("li");
      item.textContent = player.name;
      return item;
    }),
  );
}).catch((error) => {
  console.error("Unable to observe players", error);
  playerCount.textContent = "Unable to connect";
});

observeStep((step) => {
  screen.textContent = `Screen ${step}`;
}).catch((error) => {
  console.error("Unable to observe session step", error);
  screen.textContent = "Unable to connect";
});
