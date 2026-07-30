import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
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

export async function signIn() {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await signInAnonymously(auth);
  return credential.user;
}
