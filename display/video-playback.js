import { reportRoundVideoStatus } from "../shared/game-engine.js";
import { resolveDisplayMedia } from "./media.js";

let video;
let enableButton;
let activeRoundKey;
let activeRoundId;
let activeDefinition;
let handledSequence = 0;
let stopAt;
let pendingCommand;
let completionReported = false;

export function setupDisplayVideo(element, button) {
  video = element;
  enableButton = button;
  button.addEventListener("click", () => {
    button.hidden = true;
    if (pendingCommand) runCommand(pendingCommand);
  });
  video.addEventListener("timeupdate", () => {
    if (Number.isFinite(stopAt) && video.currentTime >= stopAt) {
      video.pause();
      finishPlayback("Initial clip complete");
    }
  });
  video.addEventListener("ended", () => finishPlayback("Clip complete"));
  video.addEventListener("error", () =>
    report("error", "Video file is missing or unsupported"),
  );
}

export function syncDisplayVideo(snapshot) {
  const { definition, round, state } = snapshot;
  if (!definition?.video || ["lobby", "intermission"].includes(state.phase)) {
    resetVideo();
    return;
  }

  const roundKey = `${definition.id}:${round?.startedAt ?? "unknown"}`;
  if (roundKey !== activeRoundKey) {
    resetVideo();
    const media = resolveDisplayMedia({ id: definition.video.id, type: "video" });
    activeRoundKey = roundKey;
    activeRoundId = definition.id;
    activeDefinition = definition;
    if (!media?.src) {
      report("error", "Video file is missing");
      return;
    }
    video.src = media.src;
    video.load();
  }

  const command = round?.videoCommand;
  if (!command || command.sequence <= handledSequence) return;
  handledSequence = command.sequence;
  pendingCommand = command;
  completionReported = false;
  runCommand(command);
}

export function isDisplayVideoActive(snapshot) {
  const status = snapshot?.round?.videoStatus;
  return Boolean(
    snapshot?.definition?.video &&
      status &&
      ["loading", "playing", "blocked"].includes(status.state),
  );
}

async function runCommand(command) {
  if (!activeDefinition || !video.src) return;
  const config = activeDefinition.video;
  try {
    await metadataReady();
    if (command.mode === "initial") {
      video.currentTime = 0;
      stopAt = config.initialStop;
    } else if (command.mode === "answer") {
      video.currentTime = Math.max(
        0,
        config.initialStop - (config.answerLead ?? 13),
      );
      stopAt = undefined;
    } else {
      video.currentTime = 0;
      stopAt = undefined;
    }
    await video.play();
    pendingCommand = undefined;
    enableButton.hidden = true;
    report("playing", "Playing on Display", command.mode);
  } catch (error) {
    if (error.name === "NotAllowedError") {
      enableButton.hidden = false;
      report("blocked", "Click ENABLE DISPLAY VIDEO", command.mode);
      return;
    }
    console.error("[BBQ display] Video playback failed.", error);
    report("error", error.message || "Video playback failed", command.mode);
  }
}

function finishPlayback(message) {
  if (completionReported || !pendingOrCurrentMode()) return;
  completionReported = true;
  stopAt = undefined;
  report("finished", message, pendingOrCurrentMode());
}

function pendingOrCurrentMode() {
  return pendingCommand?.mode ?? video.dataset.mode;
}

function report(state, message, mode = pendingOrCurrentMode()) {
  if (!activeRoundId || !mode) return;
  video.dataset.mode = mode;
  reportRoundVideoStatus(activeRoundId, { state, message, mode }).catch((error) =>
    console.error("[BBQ display] Unable to report video status.", error),
  );
}

function metadataReady() {
  if (video.readyState > 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    video.addEventListener("loadedmetadata", resolve, { once: true });
    video.addEventListener("error", () => reject(new Error("Video unavailable")), {
      once: true,
    });
  });
}

function resetVideo() {
  if (!video || !activeRoundKey) return;
  video.pause();
  video.removeAttribute("src");
  video.load();
  delete video.dataset.mode;
  activeRoundKey = undefined;
  activeRoundId = undefined;
  activeDefinition = undefined;
  handledSequence = 0;
  stopAt = undefined;
  pendingCommand = undefined;
  completionReported = false;
  if (enableButton) enableButton.hidden = true;
}
