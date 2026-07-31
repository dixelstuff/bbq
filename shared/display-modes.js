export const displayModes = Object.freeze({
  artwork: "artwork",
  overlay: "overlay",
  reveal: "reveal",
  leaderboard: "leaderboard",
  media: "media",
});

export function displayModeForPhase(definition, phase) {
  return (
    definition?.display?.phases?.[phase] ??
    {
      question: displayModes.overlay,
      marking: displayModes.artwork,
      reveal: displayModes.reveal,
      leaderboard: displayModes.leaderboard,
    }[phase] ??
    displayModes.artwork
  );
}
