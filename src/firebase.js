import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot, deleteDoc,
} from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// ── REPLACE WITH YOUR FIREBASE CONFIG ────────────────────────────────────────
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
// ─────────────────────────────────────────────────────────────────────────────

// ── REPLACE WITH YOUR FCM VAPID KEY (from Firebase Console → Cloud Messaging) ─
export const VAPID_KEY = "YOUR_VAPID_KEY";
// ─────────────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let messaging = null;
try { messaging = getMessaging(app); } catch(e) { /* not supported */ }
export { messaging };

export const fsGet = async (path) => {
  const snap = await getDoc(doc(db, ...path.split("/")));
  return snap.exists() ? snap.data() : null;
};
export const fsSet = async (path, data) => {
  await setDoc(doc(db, ...path.split("/")), data, { merge: true });
};
export const fsDelete = async (path) => {
  await deleteDoc(doc(db, ...path.split("/")));
};
export const fsListen = (path, cb) => {
  return onSnapshot(doc(db, ...path.split("/")), (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
};

export const requestNotifPermission = async () => {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    return token;
  } catch (e) {
    console.warn("FCM token error:", e);
    return null;
  }
};

export const onForegroundMessage = (cb) => {
  if (!messaging) return () => {};
  return onMessage(messaging, cb);
};
