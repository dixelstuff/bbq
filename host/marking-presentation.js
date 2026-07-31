export function hostSubmissionLabel(submission, index, phase) {
  if (phase === "marking") return `ANSWER ${index + 1}`;
  const prefix = submission.placing ? `${submission.placing}.` : `${index + 1}.`;
  return `${prefix} ${submission.playerName}`;
}
