import { onValue, ref, runTransaction, set } from "firebase/database";
import { database, signIn } from "./firebase.js";

const stepPath = "sessions/default/state/step";
const firstStep = 1;

function validStep(value) {
  return Number.isInteger(value) && value >= firstStep ? value : firstStep;
}

export async function observeStep(onChange) {
  await signIn();
  const stepRef = ref(database, stepPath);

  // Create the shared state on first use without overwriting an existing step.
  await runTransaction(stepRef, (step) => validStep(step));

  return onValue(stepRef, (snapshot) => {
    onChange(validStep(snapshot.val()));
  });
}

export async function incrementStep() {
  await signIn();

  const result = await runTransaction(
    ref(database, stepPath),
    (step) => validStep(step) + 1,
  );

  return validStep(result.snapshot.val());
}

export async function resetStep() {
  await signIn();
  await set(ref(database, stepPath), firstStep);
  return firstStep;
}
