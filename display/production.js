// A small production surface for bespoke rounds. Effects stay restrained here
// so rounds request a cue instead of implementing their own animation/audio.
import { createCueGate } from "../shared/cue-gate.js";

const acceptCue = createCueGate();
let audioContext;

for (const eventName of ["pointerdown", "keydown"]) {
  window.addEventListener(eventName, unlockAudio, { once: true });
}

export const production = {
  playTitle(element, key) {
    cue(element, "production-title-in", key);
  },
  playReveal(element, key) {
    cue(element, "production-reveal-in", key);
  },
  playLeaderboard(element, key) {
    cue(element, "production-leaderboard-in", key);
  },
  playCorrect(key) {
    if (newCue(key)) tone([523.25, 659.25], 0.12, "sine");
  },
  playWrong(key) {
    if (newCue(key)) tone([220, 196], 0.16, "sine");
  },
  playTimerComplete(key) {
    if (newCue(key)) tone([440, 440, 659.25], 0.16, "triangle");
  },
  fadeArtwork(element) {
    element?.classList.add("production-artwork-faded");
  },
  fadeMusic() {},
  playStinger() {},
};

function cue(element, className, key) {
  if (!element || !newCue(key)) return;
  element.classList.remove(className);
  requestAnimationFrame(() => element.classList.add(className));
}

function newCue(key) {
  return acceptCue(key);
}

function tone(notes, noteLength, type) {
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    const start = audioContext.currentTime;
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const noteStart = start + index * noteLength;
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.12, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        noteStart + noteLength,
      );
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + noteLength);
    });
  } catch (error) {
    console.warn("[BBQ production] Audio cue could not play.", error);
  }
}

function unlockAudio() {
  try {
    audioContext ??= new AudioContext();
    audioContext.resume().catch(() => {});
  } catch {
    // Visual cues still run if the browser has no Web Audio support.
  }
}
