import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot, deleteDoc,
} from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";

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

// ── REPLACE WITH YOUR FCM VAPID KEY (from Firebase Console → Cloud Messaging) ─
export const VAPID_KEY = "YOUR_VAPID_KEY";
// ─────────────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const functions = getFunctions(app);
const storage = getStorage(app);

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

// ── AI Trainer — Cloud Function callers ─────────────────────────────────────
// These call the secure backend that holds the Anthropic API key.
// Backend enforces per-user daily rate limits.

const generateWorkoutFn = httpsCallable(functions, "generateWorkout");
const generateFormCuesFn = httpsCallable(functions, "generateFormCues");
const generateNutritionPlanFn = httpsCallable(functions, "generateNutritionPlan");

export const aiGenerateWorkout = async (params) => {
  try {
    const result = await generateWorkoutFn(params);
    return { ok: true, ...result.data };
  } catch (e) {
    return { ok: false, error: e.message || "Failed to generate workout." };
  }
};

export const aiGenerateFormCues = async (params) => {
  try {
    const result = await generateFormCuesFn(params);
    return { ok: true, ...result.data };
  } catch (e) {
    return { ok: false, error: e.message || "Failed to generate form cues." };
  }
};

export const aiGenerateNutritionPlan = async (params) => {
  try {
    const result = await generateNutritionPlanFn(params);
    return { ok: true, ...result.data };
  } catch (e) {
    return { ok: false, error: e.message || "Failed to generate nutrition plan." };
  }
};

export const aiScanMeal = async (base64Image, mediaType="image/jpeg") => {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {"Content-Type": "application/json", "anthropic-version": "2023-06-01"},
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {type: "base64", media_type: mediaType, data: base64Image},
            },
            {
              type: "text",
              text: `Analyze this meal photo and estimate calories and macros. Be practical and realistic about portion sizes.
Return ONLY valid JSON, no markdown:
{"totalCalories":0,"protein":0,"carbs":0,"fat":0,"confidence":"low|medium|high","items":[{"name":"","calories":0,"protein":0,"carbs":0,"fat":0,"portionEstimate":""}],"note":""}

Confidence guide: high=simple identifiable foods, medium=mixed dish or unclear portions, low=very unclear or complex dish.`
            }
          ]
        }]
      })
    });
    if (!response.ok) return {ok: false, error: "API error"};
    const data = await response.json();
    const text = data.content[0].text;
    const cleaned = text.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
    const parsed = JSON.parse(cleaned);
    return {ok: true, scan: parsed};
  } catch(e) {
    return {ok: false, error: e.message||"Failed to scan meal."};
  }
};

