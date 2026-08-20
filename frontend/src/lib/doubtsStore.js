import {
  collection,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase.js";

// NOTE: Firebase Storage now requires the paid Blaze plan to even enable,
// so this app deliberately avoids it. Doubt photos are compressed
// client-side (see DoubtCapture.jsx) and stored as base64 directly inside
// the Firestore document instead — Firestore alone stays on the free
// Spark plan with no card required. Compression keeps each doc well under
// Firestore's 1MB document limit.

function doubtsCollection(deviceId) {
  return collection(db, "devices", deviceId, "doubts");
}

/**
 * Subscribes to the live doubt queue for a device. Calls `callback` with
 * an array of doubt objects (including their Firestore doc id) whenever
 * the queue changes. Returns an unsubscribe function.
 */
export function subscribeToDoubts(deviceId, callback) {
  const q = query(doubtsCollection(deviceId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const doubts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(doubts);
  });
}

/** Adds a text doubt to the queue. */
export async function addTextDoubt(deviceId, text, studentName = "Self") {
  await addDoc(doubtsCollection(deviceId), {
    type: "text",
    content: text,
    studentName,
    status: "pending",
    answer: null,
    subject: null,
    gradeLevel: "default",
    createdAt: serverTimestamp(),
    solvedAt: null,
  });
}

/**
 * Adds an image doubt. `base64Data` should already be compressed/resized
 * (see compressImageToBase64 in DoubtCapture.jsx) — it's stored directly
 * in the Firestore document, doubling as both the display image and the
 * payload sent to Gemini for solving. No Storage bucket involved.
 */
export async function addImageDoubt(deviceId, base64Data, mimeType, studentName = "Self") {
  await addDoc(doubtsCollection(deviceId), {
    type: "image",
    content: base64Data,
    mimeType,
    studentName,
    status: "pending",
    answer: null,
    subject: null,
    gradeLevel: "default",
    createdAt: serverTimestamp(),
    solvedAt: null,
  });
}

/** Marks a doubt as solved with its answer + subject tag. */
export async function markSolved(deviceId, doubtId, answer, subject) {
  await updateDoc(doc(db, "devices", deviceId, "doubts", doubtId), {
    status: "solved",
    answer,
    subject,
    solvedAt: serverTimestamp(),
  });
}

/** Marks a doubt as failed (Gemini call errored). */
export async function markError(deviceId, doubtId, errorMessage) {
  await updateDoc(doc(db, "devices", deviceId, "doubts", doubtId), {
    status: "error",
    answer: errorMessage,
  });
}

/** Updates the answer text after a "simplify" call. */
export async function updateSimplifiedAnswer(deviceId, doubtId, simplifiedAnswer) {
  await updateDoc(doc(db, "devices", deviceId, "doubts", doubtId), {
    answer: simplifiedAnswer,
    gradeLevel: "simplified",
  });
}

/** Removes a doubt from the queue. */
export async function deleteDoubt(deviceId, doubtId) {
  await deleteDoc(doc(db, "devices", deviceId, "doubts", doubtId));
}