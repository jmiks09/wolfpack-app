const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const MAX_WORKOUTS_PER_DAY = 10;
const MAX_FORM_CUES_PER_DAY = 30;
const MAX_NUTRITION_PLANS_PER_DAY = 5;
const MODEL = "claude-haiku-4-5-20251001";

let _db = null;
function getDb() {
  if (!_db) {
    const {initializeApp, getApps} = require("firebase-admin/app");
    const {getFirestore} = require("firebase-admin/firestore");
    if (!getApps().length) initializeApp();
    _db = getFirestore();
  }
  return _db;
}
async function checkRateLimit(userName, action, maxPerDay) {
  if (!userName) throw new HttpsError("invalid-argument", "Missing user name.");
  const {FieldValue: FV} = require("firebase-admin/firestore");
  const today = new Date().toISOString().slice(0, 10);
  const ref = getDb().doc(`wolfpack/ai_usage_${userName}_${today}`);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const count = data[action] || 0;
  if (count >= maxPerDay) {
    throw new HttpsError("resource-exhausted", `Daily limit reached for ${action}. Try again tomorrow.`);
  }
  await ref.set({[action]: FV.increment(1)}, {merge: true});
}
async function callClaude(sys, usr, apiKey) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {"Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01"},
    body: JSON.stringify({model: MODEL, max_tokens: 1500, system: sys, messages: [{role: "user", content: usr}]}),
  });
  if (!response.ok) throw new HttpsError("internal", `Anthropic API error: ${response.status}`);
  const data = await response.json();
  return data.content[0].text;
}
function parseJSON(text) {
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(cleaned); } catch (e) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch (e2) {} }
    throw new HttpsError("internal", "AI returned invalid JSON.");
  }
}

// ── generateWorkout ──────────────────────────────────────────────────────────
exports.generateWorkout = onCall({secrets: [ANTHROPIC_API_KEY], cors: true}, async (request) => {
  const {userName, goal, experience, injuries, equipment, recentHistory, muscleGroup} = request.data || {};
  await checkRateLimit(userName, "workouts", MAX_WORKOUTS_PER_DAY);

  const hasMuscleTarget = muscleGroup && muscleGroup !== "AI's choice based on history";

  // CRITICAL SEPARATION:
  // muscleGroup = which muscles to train (chosen by user TODAY — always wins)
  // goal = how to train them (rep ranges, intensity, weight style)
  // These are separate concerns. The goal NEVER changes which muscle group is trained.
  const muscleInstruction = hasMuscleTarget
    ? `TODAY'S TARGET MUSCLE: ${muscleGroup.toUpperCase()}. Every single exercise must target ${muscleGroup}. This overrides everything else.`
    : `Choose the muscle group least trained recently: ${recentHistory||"no history — pick any"}.`;

  const sys = `You are a personal trainer building a single-muscle workout.

${muscleInstruction}

RULES (in priority order):
1. MUSCLE FOCUS: All exercises target ${hasMuscleTarget ? muscleGroup : "the chosen muscle group"} only.
2. EQUIPMENT: Only use exercises possible with available equipment.
3. TRAINING STYLE: Use ${goal} to decide rep ranges and weight intensity only — not which muscles to train.
4. INJURIES: Skip any exercise that aggravates: ${injuries||"none"}.
5. Return ONLY valid JSON, no other text.`;

  const usr = `Athlete: ${userName}
Experience: ${experience||"intermediate"}
Available equipment: ${equipment}
Recent training (last 3 days): ${recentHistory||"none"}

Return this JSON with 4-6 exercises, all targeting ${hasMuscleTarget ? muscleGroup : "the chosen muscle group"}:
{"title":"","reasoning":"","estimatedMinutes":0,"exercises":[{"name":"","sets":0,"reps":"","weight":"","restSeconds":0,"primaryMuscle":"${hasMuscleTarget?muscleGroup:""}","notes":""}]}`;

  const workout = parseJSON(await callClaude(sys, usr, ANTHROPIC_API_KEY.value()));
  return {workout};
});

// ── generateFormCues ─────────────────────────────────────────────────────────
exports.generateFormCues = onCall({secrets: [ANTHROPIC_API_KEY], cors: true}, async (request) => {
  const {userName, exerciseName, experience, injuries} = request.data || {};
  const cacheKey = `${exerciseName}__${experience||"any"}__${injuries||"none"}`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const cacheRef = getDb().doc(`wolfpack/ai_cues_cache/cues/${cacheKey}`);
  const cached = await cacheRef.get();
  if (cached.exists) return {cues: cached.data().cues, cached: true};
  await checkRateLimit(userName, "formCues", MAX_FORM_CUES_PER_DAY);
  const sys = `Write concise exercise form cues. Be direct. Return ONLY valid JSON, no markdown.`;
  const usr = `Exercise: "${exerciseName}", level: ${experience||"intermediate"}, injuries: ${injuries||"none"}.
JSON: {"setup":"","execution":"","commonMistakes":["","",""],"breathing":""}`;
  const cues = parseJSON(await callClaude(sys, usr, ANTHROPIC_API_KEY.value()));
  const {FieldValue} = require("firebase-admin/firestore");
  await cacheRef.set({cues, createdAt: FieldValue.serverTimestamp()});
  return {cues, cached: false};
});

// ── generateNutritionPlan ────────────────────────────────────────────────────
exports.generateNutritionPlan = onCall({secrets: [ANTHROPIC_API_KEY], cors: true}, async (request) => {
  const {userName, age, heightInches, weightLbs, gender, bulkCut, activityLevel, dietaryRestrictions, goal} = request.data || {};
  await checkRateLimit(userName, "nutritionPlans", MAX_NUTRITION_PLANS_PER_DAY);
  const sys = `Fitness nutrition assistant. Informational only, not medical advice. Mifflin-St Jeor TDEE. Only recommend OTC supplements. NEVER suggest SARMs or prescriptions. Return ONLY valid JSON, no markdown.`;
  const usr = `Age: ${age}, height: ${heightInches}in, weight: ${weightLbs}lbs, gender: ${gender}, mode: ${bulkCut}, goal: ${goal}, activity: ${activityLevel}, diet: ${dietaryRestrictions||"none"}.
JSON: {"calorieTarget":0,"macros":{"proteinGrams":0,"carbsGrams":0,"fatGrams":0},"tdee":0,"explanation":"","mealTiming":"","supplements":[{"name":"","why":"","typicalUse":"","priority":"high"}]}`;
  const plan = parseJSON(await callClaude(sys, usr, ANTHROPIC_API_KEY.value()));
  return {plan};
});
