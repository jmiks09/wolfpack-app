const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const MAX_WORKOUTS_PER_DAY = 10;
const MAX_FORM_CUES_PER_DAY = 30;
const MAX_NUTRITION_PLANS_PER_DAY = 5;
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
async function callClaude(systemPrompt, userPrompt, apiKey) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {"Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01"},
    body: JSON.stringify({model: "claude-haiku-4-5-20251001", max_tokens: 2000, system: systemPrompt, messages: [{role: "user", content: userPrompt}]}),
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

exports.generateWorkout = onCall({secrets: [ANTHROPIC_API_KEY], cors: true}, async (request) => {
  const {userName, goal, experience, injuries, equipment, recentHistory, muscleGroup, numExercises, setsPerExercise, secondaryGoal, priorPerformance} = request.data || {};
  await checkRateLimit(userName, "workouts", MAX_WORKOUTS_PER_DAY);
  const exerciseCount = numExercises || 5;
  const sets = setsPerExercise || 4;
  const hasMuscleTarget = muscleGroup && muscleGroup !== "AI's choice based on history";
  const muscleRule = hasMuscleTarget
    ? `MUSCLE GROUP (NON-NEGOTIABLE): This workout is EXCLUSIVELY for ${muscleGroup}. Every single exercise MUST directly target ${muscleGroup}. Do NOT include exercises for any other muscle group.`
    : `MUSCLE GROUP: Choose the muscle group trained least recently based on workout history.`;
  const sys = `You are an expert personal trainer for WOLFPACK fitness app.

CRITICAL RULES — follow every one exactly:
1. ${muscleRule}
2. EQUIPMENT: ONLY use exercises possible with listed equipment. Never suggest equipment not listed.
3. EXERCISE COUNT: Return EXACTLY ${exerciseCount} exercises. No more, no less.
4. SETS: Every exercise gets EXACTLY ${sets} sets.
5. EXPERIENCE: Match exercise complexity and weights to experience level.
6. INJURIES: Never include movements that aggravate listed injuries.
7. PRIOR PERFORMANCE: If prior weight data is provided, use it. Easy rating = increase 5-10%. Hard = hold. Wrecked = decrease slightly. No prior data = estimate based on experience.
8. SECONDARY GOAL: ${secondaryGoal ? `"${secondaryGoal}" — adjust rep ranges, rest periods, and structure accordingly.` : "None — optimize purely for primary goal."}
9. Return ONLY valid JSON. No markdown, no extra text.`;

  const usr = `Workout for ${userName}.
Goal: ${goal}
Experience: ${experience}
Injuries: ${injuries||"None"}
Equipment: ${equipment}
Recent history: ${recentHistory||"None"}
Prior performance:
${priorPerformance||"No prior data."}

JSON format:
{"title":"","reasoning":"","estimatedMinutes":45,"exercises":[{"name":"","sets":${sets},"reps":"8-10","weight":"135 lbs","restSeconds":90,"primaryMuscle":"","notes":""}]}`;

  const workout = parseJSON(await callClaude(sys, usr, ANTHROPIC_API_KEY.value()));
  return {workout};
});

exports.generateFormCues = onCall({secrets: [ANTHROPIC_API_KEY], cors: true}, async (request) => {
  const {userName, exerciseName, experience, injuries} = request.data || {};
  const cacheKey = `${exerciseName}__${experience||"any"}__${injuries||"none"}`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const cacheRef = getDb().doc(`wolfpack/ai_cues_cache/cues/${cacheKey}`);
  const cached = await cacheRef.get();
  if (cached.exists) return {cues: cached.data().cues, cached: true};
  await checkRateLimit(userName, "formCues", MAX_FORM_CUES_PER_DAY);
  const sys = `Write concise exercise form cues. Direct, no fluff. Return ONLY valid JSON, no markdown.`;
  const usr = `Form cues for "${exerciseName}", ${experience||"intermediate"} lifter, injuries: ${injuries||"None"}. JSON: {"setup":"","execution":"","commonMistakes":["","",""],"breathing":""}`;
  const cues = parseJSON(await callClaude(sys, usr, ANTHROPIC_API_KEY.value()));
  const {FieldValue} = require("firebase-admin/firestore");
  await cacheRef.set({cues, createdAt: FieldValue.serverTimestamp()});
  return {cues, cached: false};
});

exports.generateNutritionPlan = onCall({secrets: [ANTHROPIC_API_KEY], cors: true}, async (request) => {
  const {userName, age, heightInches, weightLbs, gender, bulkCut, activityLevel, dietaryRestrictions, goal} = request.data || {};
  await checkRateLimit(userName, "nutritionPlans", MAX_NUTRITION_PLANS_PER_DAY);
  const sys = `Fitness nutrition assistant, informational only, not medical advice. Mifflin-St Jeor TDEE. Only OTC supplements (protein, creatine, vitamin D, fish oil, electrolytes, multivitamin). NEVER suggest SARMs or prescription items. Return ONLY valid JSON, no markdown.`;
  const usr = `Plan for age ${age}, height ${heightInches}in, weight ${weightLbs}lbs, gender ${gender}, mode ${bulkCut}, goal ${goal}, activity ${activityLevel}, diet ${dietaryRestrictions||"None"}. JSON: {"calorieTarget":0,"macros":{"proteinGrams":0,"carbsGrams":0,"fatGrams":0},"tdee":0,"explanation":"","mealTiming":"","supplements":[{"name":"","why":"","typicalUse":"","priority":"high"}]}`;
  const plan = parseJSON(await callClaude(sys, usr, ANTHROPIC_API_KEY.value()));
  return {plan};
});
