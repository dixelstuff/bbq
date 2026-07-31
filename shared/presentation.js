export function leaderboardLayout(playerCount) {
  if (playerCount <= 7) return { columns: 1, rows: playerCount };
  if (playerCount <= 14) return { columns: 2, rows: Math.ceil(playerCount / 2) };
  return { columns: 3, rows: Math.ceil(playerCount / 3) };
}

export function remainingTimerSeconds(timer, now = Date.now()) {
  if (!timer) return 0;
  if (timer.status === "stopped") return Math.max(0, timer.remainingSeconds ?? 0);
  if (timer.status !== "running") return 0;
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}
