import { reportRoundAudioStatus } from "../shared/game-engine.js";
import {
  configuredStopTime,
  extendedStopTime,
  normalizeTimedMediaCue,
} from "../shared/media-cues.js";

const audio = new Audio();
audio.preload = "metadata";

let activeRoundId;
let activeConfig;
let handledSequence = 0;
let stopAt;
let stopTimer;
let pendingCommand;
let enableButton;

export function setupDisplayAudio(button) {
  enableButton = button;
  enableButton.addEventListener("click", async () => {
    enableButton.hidden = true;
    if (pendingCommand) await runCommand(pendingCommand);
  });
  audio.addEventListener("error", () => {
    clearScheduledStop();
    report("missing", `Missing audio file: ${activeConfig?.file ?? "unknown"}`);
  });
  audio.addEventListener("loadedmetadata", () => {
    report("ready", `Ready: ${activeConfig?.file ?? "audio clip"}`);
  });
  audio.addEventListener("ended", () => {
    clearScheduledStop();
    report("stopped", "Clip finished");
  });
  audio.addEventListener("timeupdate", () => {
    if (Number.isFinite(stopAt) && audio.currentTime >= stopAt) stopPlayback();
  });
}

export function syncDisplayAudio(snapshot) {
  const { definition, round } = snapshot;
  if (!definition?.audio) {
    resetAudio();
    return;
  }

  if (activeRoundId !== definition.id) {
    resetAudio();
    activeRoundId = definition.id;
    activeConfig = normalizeTimedMediaCue(definition.audio);
    audio.src = `/${activeConfig.file}`;
    report("loading", `Checking ${activeConfig.file}…`);
    audio.load();
  }

  const command = round?.audioCommand;
  if (!command || command.sequence <= handledSequence) return;
  handledSequence = command.sequence;
  pendingCommand = command;
  runCommand(command).catch((error) => {
    console.error("[BBQ display] Audio command failed.", error);
    report("error", error.message || "Audio playback failed");
  });
}

async function runCommand(command) {
  if (!activeConfig) return;
  if (command.action === "stop") {
    stopPlayback("Stopped by Host");
    return;
  }
  try {
    if (command.action === "extend") {
      stopAt = extendedStopTime(audio.currentTime, stopAt);
    } else {
      await waitForMetadata();
      audio.currentTime = activeConfig.start;
      stopAt = configuredStopTime(activeConfig);
    }
    await audio.play();
    pendingCommand = undefined;
    enableButton.hidden = true;
    scheduleStop();
    report("playing", `Playing ${activeConfig.file}`);
  } catch (error) {
    if (audio.error || error.message?.startsWith("Missing or unsupported")) {
      report("missing", `Missing or unsupported audio file: ${activeConfig.file}`);
      return;
    }
    if (error.name === "NotAllowedError") {
      enableButton.hidden = false;
      report("blocked", "Sound blocked — click ENABLE DISPLAY SOUND on the Display");
      return;
    }
    throw error;
  }
}

function waitForMetadata() {
  if (audio.readyState > 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const loaded = () => {
      cleanup();
      resolve();
    };
    const failed = () => {
      cleanup();
      reject(new Error(`Missing or unsupported audio file: ${activeConfig.file}`));
    };
    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", loaded);
      audio.removeEventListener("error", failed);
    };
    audio.addEventListener("loadedmetadata", loaded, { once: true });
    audio.addEventListener("error", failed, { once: true });
  });
}

function scheduleStop() {
  clearTimeout(stopTimer);
  const milliseconds = Math.max(0, (stopAt - audio.currentTime) * 1000);
  stopTimer = window.setTimeout(() => stopPlayback(), milliseconds + 30);
}

function stopPlayback(message = "Clip stopped automatically") {
  audio.pause();
  clearScheduledStop();
  report("stopped", message);
}

function clearScheduledStop() {
  clearTimeout(stopTimer);
  stopTimer = undefined;
  stopAt = undefined;
}

function resetAudio() {
  if (!activeRoundId) return;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  clearScheduledStop();
  activeRoundId = undefined;
  activeConfig = undefined;
  handledSequence = 0;
  pendingCommand = undefined;
  if (enableButton) enableButton.hidden = true;
}

function report(state, message) {
  if (!activeRoundId) return;
  reportRoundAudioStatus(activeRoundId, { state, message }).catch((error) => {
    console.error("[BBQ display] Unable to report audio status.", error);
  });
}
