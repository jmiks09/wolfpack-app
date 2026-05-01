import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";

// ── REPLACE WITH YOUR FIREBASE CONFIG ────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCw-u1ghZgJfeXGjojHP1dHOfNu_SGrhc0",
  authDomain: "wolfpack-app-a6e70.firebaseapp.com",
  projectId: "wolfpack-app-a6e70",
  storageBucket: "wolfpack-app-a6e70.firebasestorage.app",
  messagingSenderId: "385988372173",
  appId: "1:385988372173:web:785904dd2cfdae28042b84"
};
// ─────────────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
  const unsub = onSnapshot(doc(db, ...path.split("/")), (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
  return unsub;
};
