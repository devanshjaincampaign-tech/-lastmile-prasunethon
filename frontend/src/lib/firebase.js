import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// These values come from your Firebase project settings
// (Project settings -> General -> Your apps -> SDK setup and configuration).
// They are safe to expose in frontend code — Firebase enforces access via
// Security Rules, not by hiding these values.
//
// NOTE: This app deliberately does NOT use Firebase Storage — Firebase now
// requires the paid Blaze plan to enable Storage. Doubt photos are instead
// compressed and stored directly inside Firestore documents, so the whole
// app runs on Firebase's free Spark plan with no card required.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Ensures the visitor has an anonymous Firebase Auth session and resolves
 * with their uid. Used as the "device id" for the doubt queue.
 */
export function ensureAnonymousAuth() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        if (user) {
          resolve(user.uid);
        } else {
          signInAnonymously(auth)
            .then((cred) => resolve(cred.user.uid))
            .catch(reject);
        }
      },
      reject
    );
  });
}