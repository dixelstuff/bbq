export const mediaActions = Object.freeze([
  "play",
  "replay",
  "extend",
  "stop",
]);

export function normalizeTimedMediaCue(cue) {
  const file = String(cue?.file ?? "").replace(/^\/+/, "");
  if (!file || file.split("/").includes("..")) {
    throw new Error("Media file must be a safe path relative to its media folder");
  }
  return {
    file,
    start: Math.max(0, Number(cue.start) || 0),
    duration: Math.max(0.1, Number(cue.duration) || 15),
  };
}

export function createMediaCommand(action, previousSequence = 0, now = Date.now()) {
  if (!mediaActions.includes(action)) throw new Error("Unknown media action");
  return {
    action,
    sequence: Math.max(0, Number(previousSequence) || 0) + 1,
    requestedAt: now,
  };
}

export function configuredStopTime(cue) {
  const normalized = normalizeTimedMediaCue(cue);
  return normalized.start + normalized.duration;
}

export function extendedStopTime(currentTime, previousStopTime, seconds = 15) {
  const current = Math.max(0, Number(currentTime) || 0);
  const previous = Number(previousStopTime);
  const extension = Math.max(0.1, Number(seconds) || 15);
  return (Number.isFinite(previous) ? Math.max(previous, current) : current) +
    extension;
}
