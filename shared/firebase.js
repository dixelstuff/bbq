import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInAnonymously,
} from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD-oRUweSg1pHQiu7NDGnd0cSJvyMJE_gQ",
  authDomain: "the-bbq-26ca7.firebaseapp.com",
  databaseURL:
    "https://the-bbq-26ca7-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "the-bbq-26ca7",
  storageBucket: "the-bbq-26ca7.firebasestorage.app",
  messagingSenderId: "887971776046",
  appId: "1:887971776046:web:ce492a70ba454175be01bf",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);

let signInPromise;

export function signIn() {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  // Every page starts several Firebase listeners at once. Share one sign-in
  // attempt so they cannot race and create competing anonymous sessions.
  if (!signInPromise) {
    signInPromise = setPersistence(auth, browserLocalPersistence)
      .then(() => signInAnonymously(auth))
      .then((credential) => credential.user)
      .catch((error) => {
        signInPromise = undefined;
        throw error;
      });
  }

  return signInPromise;
}
