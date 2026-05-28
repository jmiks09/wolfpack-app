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
  const now = new Date();
  const centralDate = new Date(now.getTime() + (-5 * 60 * 60 * 1000));
  const today = centralDate.toISOString().slice(0, 10);
  const ref = getDb().doc(`wolfpack/ai_usage_${userName}_${today}`);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const count = data[action] || 0;
  if (count >= maxPerDay) {
    throw new HttpsError("resource-exhausted", `Daily limit reached. Resets at midnight Central time.`);
  }
  await ref.set({[action]: FV.increment(1)}, {merge: true});
}
async function callClaude(sys, usr, apiKey, model) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {"Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01"},
    body: JSON.stringify({model: model||MODEL, max_tokens: 2000, system: sys, messages: [{role: "user", content: usr}]}),
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
// Handles three request types:
//   design_block   — design a full 4-6 week training program split
//   program_session — generate a session within an existing block
//   freestyle       — one-off session, no block tracking
exports.generateWorkout = onCall({secrets: [ANTHROPIC_API_KEY], cors: true}, async (request) => {
  const {
    userName, goal, experience, injuries, equipment, recentHistory,
    muscleGroup, numExercises, setsPerExercise, requestType,
    trainingMode, daysPerWeek, detectedMuscles, hasHistory,
    blockContext, priorPerformance,
  } = request.data || {};

  console.log("=== WOLFMODE REQUEST ===", requestType, userName, muscleGroup);
  await checkRateLimit(userName, "workouts", MAX_WORKOUTS_PER_DAY);

  const apiKey = ANTHROPIC_API_KEY.value();
  const exCount = numExercises || 5;
  const sets = setsPerExercise || 4;

  // ── TYPE 1: Design a training block ───────────────────────────────────────
  if (requestType === "design_block") {
    const modeDescriptions = {
      structured: "Core lifts stay consistent 4-6 weeks, only rotate 20% of exercises, progressive overload weekly",
      variety: "Rotate 40% of exercises each session while maintaining progressive overload on key lifts",
      athletic: "Include conditioning finishers, explosive movements, and unilateral work alongside strength",
      beginner: "Simple 3-4 exercise workouts, repeat same exercises for 2 weeks before any rotation",
    };

    // Hardcoded balanced splits — goal never changes the split structure
    const SPLITS = {
      2: [
        {id:"upper",label:"Upper Body",type:"wolfmode",muscles:["chest","back","shoulders","arms"]},
        {id:"lower",label:"Lower Body",type:"wolfmode",muscles:["quads","hamstrings","glutes","calves"]},
      ],
      3: [
        {id:"push",label:"Push Day",type:"wolfmode",muscles:["chest","shoulders","triceps"]},
        {id:"pull",label:"Pull Day",type:"wolfmode",muscles:["back","biceps","rear delts"]},
        {id:"legs",label:"Legs & Glutes",type:"wolfmode",muscles:["quads","hamstrings","glutes","calves"]},
      ],
      4: [
        {id:"push",label:"Push Day",type:"wolfmode",muscles:["chest","shoulders","triceps"]},
        {id:"pull",label:"Pull Day",type:"wolfmode",muscles:["back","biceps","rear delts"]},
        {id:"legs",label:"Legs & Glutes",type:"wolfmode",muscles:["quads","hamstrings","glutes","calves"]},
        {id:"upper",label:"Upper Body",type:"wolfmode",muscles:["chest","back","shoulders","arms"]},
      ],
      5: [
        {id:"chest",label:"Chest Day",type:"wolfmode",muscles:["chest","front delts","triceps"]},
        {id:"back",label:"Back Day",type:"wolfmode",muscles:["lats","traps","biceps","rear delts"]},
        {id:"legs",label:"Legs & Glutes",type:"wolfmode",muscles:["quads","hamstrings","glutes","calves"]},
        {id:"shoulders",label:"Shoulders & Arms",type:"wolfmode",muscles:["delts","biceps","triceps"]},
        {id:"arms",label:"Arms & Core",type:"wolfmode",muscles:["biceps","triceps","abs"]},
      ],
    };

    const days = parseInt(daysPerWeek)||3;
    const splitTemplate = SPLITS[days] || SPLITS[3];

    const sys = `You are a strength coach. Given a training split, assign core lifts and accessories to each day.
For each day, choose exercises that match the day's muscle groups and the available equipment.
The primary goal (${goal}) determines exercise selection and volume emphasis, NOT the split structure.
Return ONLY valid JSON, no markdown.`;

    const usr = `Assign exercises to this ${days}-day split for:
Goal: ${goal} (influences exercise choice and volume, not split structure)
Experience: ${experience}
Injuries: ${injuries||"None"}
Equipment: ${equipment}
Training mode: ${trainingMode||"structured"}

Split days to fill:
${splitTemplate.map(d => `- ${d.label} (muscles: ${d.muscles.join(", ")})`).join("\n")}

Return this exact JSON structure (fill in the exercises for each day):
${JSON.stringify({
  blockName: `${days}-Day ${goal} Block`,
  blockWeeks: 5,
  split: splitTemplate.map(d => ({
    ...d,
    coreLifts: ["FILL IN 2-3 compound lifts for " + d.label],
    accessoryPool: ["FILL IN 4-6 accessories for " + d.label]
  })),
  coreLifts: ["all core lifts"],
  progressionNotes: "progression note"
}, null, 2)}`;

        const responseText = await callClaude(sys, usr, apiKey, "claude-haiku-4-5-20251001");
    const blockData = parseJSON(responseText);
    return { workout: { block: blockData } };
  }

  // ── TYPE 2: Program session within a block ────────────────────────────────
  if (requestType === "program_session") {
    let blockInfo = {};
    try { blockInfo = JSON.parse(blockContext || "{}"); } catch(e) {}

    const hasMuscleTarget = muscleGroup && muscleGroup !== "AI choice";
    const rotationPct = blockInfo.rotationPct || 20;
    const coreLifts = blockInfo.coreLifts || [];
    const week = blockInfo.week || 1;

    // Progression guidance based on week
    const progressionGuide = week === 1
      ? "Week 1: Establish baseline weights. Choose moderate weights the athlete can complete with good form."
      : week <= 3
      ? `Week ${week}: Increase weight by 5-10% from previous week on core lifts. Add 1-2 reps if weight hasn't changed.`
      : `Week ${week}: Final weeks — push for strength gains. Increase weight or reps vs prior week.`;

    const sys = `You are a personal trainer executing Week ${week} of the "${blockInfo.blockName||"Training Block"}" program.

ABSOLUTE RULES — these cannot be broken:
1. MUSCLE GROUP: This is a ${muscleGroup} session. EVERY exercise targets ${muscleGroup} ONLY.
2. CORE LIFTS — MANDATORY: The first ${coreLifts.length||2} exercises MUST be EXACTLY these lifts in this order:
${coreLifts.length > 0
  ? coreLifts.map((l,i) => `   Exercise ${i+1}: ${l} (LOCKED — same name every week, same muscle group)`).join("\n")
  : "   Choose 2-3 appropriate compound lifts and keep them consistent."}
3. CORE LIFT NAMES: Use the EXACT same exercise name as listed above. Do not rename, substitute, or swap core lifts unless equipment makes them impossible. If impossible, use closest equivalent and note it.
4. ACCESSORIES: Fill remaining exercises with accessories targeting ${muscleGroup}. Rotate these each session.
5. PROGRESSION: ${progressionGuide}
6. EQUIPMENT: Only exercises possible with: ${equipment}
7. VOLUME: Exactly ${exCount} total exercises, exactly ${sets} sets each.
8. Return ONLY valid JSON, no markdown.`;

    const usr = `Generate Week ${week} ${muscleGroup} session.
Athlete: ${userName}, experience: ${experience||"intermediate"}
Goal: ${goal}
Injuries: ${injuries||"None"}
Equipment: ${equipment}
Recent training: ${recentHistory||"None"}
Prior performance (use these weights as starting point and progress from them):
${priorPerformance||"Week 1 — no prior data, establish baseline weights."}

REMINDER: Core lifts must appear FIRST and use EXACT names: ${coreLifts.join(", ")||"choose compound lifts"}

JSON: {"title":"","reasoning":"","estimatedMinutes":0,"exercises":[{"name":"","sets":${sets},"reps":"","weight":"","restSeconds":0,"primaryMuscle":"${hasMuscleTarget?muscleGroup:""}","notes":"","isCoreLift":false}]}`;

    const responseText = await callClaude(sys, usr, apiKey);
    console.log("Program session response:", responseText.slice(0, 200));
    const workout = parseJSON(responseText);
    return { workout };
  }

  // ── TYPE 3: Freestyle session ─────────────────────────────────────────────
  const hasMuscleTarget = muscleGroup && muscleGroup !== "AI choice";

  const sys = `You are a personal trainer. Build a single workout session.

RULE 1 — MUSCLE (most important): ${hasMuscleTarget
    ? `Train ${muscleGroup.toUpperCase()} ONLY. Every exercise must target ${muscleGroup}. Nothing else.`
    : `Pick the muscle group least trained recently.`}
RULE 2 — EQUIPMENT: Only use exercises possible with: ${equipment}
RULE 3 — GOAL: ${goal}. Match rep ranges to this goal.
RULE 4 — INJURIES: Never suggest exercises that aggravate: ${injuries||"none"}
RULE 5 — VOLUME: Exactly ${exCount} exercises, exactly ${sets} sets each.
RULE 6 — Return ONLY valid JSON, no other text.`;

  const usr = `Athlete: ${userName}, experience: ${experience||"intermediate"}
Recent training: ${recentHistory||"none"}
Prior performance: ${priorPerformance||"none"}

JSON: {"title":"","reasoning":"","estimatedMinutes":0,"exercises":[{"name":"","sets":${sets},"reps":"","weight":"","restSeconds":0,"primaryMuscle":"${hasMuscleTarget?muscleGroup:""}","notes":""}]}`;

  const responseText = await callClaude(sys, usr, apiKey);
  console.log("Freestyle response:", responseText.slice(0, 200));
  const workout = parseJSON(responseText);
  return { workout };
});

// ── generateFormCues ─────────────────────────────────────────────────────────
exports.generateFormCues = onCall({secrets: [ANTHROPIC_API_KEY], cors: true}, async (request) => {
  const {userName, exerciseName, experience, injuries} = request.data || {};
  const cacheKey = `${exerciseName}__${experience||"any"}__${injuries||"none"}`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const cacheRef = getDb().doc(`wolfpack/ai_cues_cache/cues/${cacheKey}`);
  const cached = await cacheRef.get();
  if (cached.exists) return {cues: cached.data().cues, cached: true};
  await checkRateLimit(userName, "formCues", MAX_FORM_CUES_PER_DAY);
  const sys = `Write concise exercise form cues. Return ONLY valid JSON, no markdown.`;
  const usr = `Exercise: "${exerciseName}", level: ${experience||"intermediate"}, injuries: ${injuries||"none"}. JSON: {"setup":"","execution":"","commonMistakes":["","",""],"breathing":""}`;
  const cues = parseJSON(await callClaude(sys, usr, ANTHROPIC_API_KEY.value()));
  const {FieldValue} = require("firebase-admin/firestore");
  await cacheRef.set({cues, createdAt: FieldValue.serverTimestamp()});
  return {cues, cached: false};
});

// ── generateNutritionPlan ────────────────────────────────────────────────────
exports.generateNutritionPlan = onCall({secrets: [ANTHROPIC_API_KEY], cors: true}, async (request) => {
  const {userName, age, heightInches, weightLbs, gender, bulkCut, activityLevel, dietaryRestrictions, goal} = request.data || {};
  await checkRateLimit(userName, "nutritionPlans", MAX_NUTRITION_PLANS_PER_DAY);
  const sys = `Fitness nutrition assistant. Informational only. Mifflin-St Jeor TDEE. OTC supplements only. Return ONLY valid JSON.`;
  const usr = `Age: ${age}, height: ${heightInches}in, weight: ${weightLbs}lbs, gender: ${gender}, mode: ${bulkCut}, goal: ${goal}, activity: ${activityLevel}, diet: ${dietaryRestrictions||"none"}. JSON: {"calorieTarget":0,"macros":{"proteinGrams":0,"carbsGrams":0,"fatGrams":0},"tdee":0,"explanation":"","mealTiming":"","supplements":[{"name":"","why":"","typicalUse":"","priority":"high"}]}`;
  const plan = parseJSON(await callClaude(sys, usr, ANTHROPIC_API_KEY.value()));
  return {plan};
});
