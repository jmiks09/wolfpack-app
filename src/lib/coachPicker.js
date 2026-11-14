// ── COACH PICKER ─────────────────────────────────────────────────────────────
// Chooses the exercises for a WOLFMODE workout from the exercise library, so the
// rules are guaranteed no matter what the AI says:
//   • nothing unsafe for the person's injuries
//   • only the equipment they have, and the style they picked (e.g. dumbbells only)
//   • no two exercises from the same movement family when it can be avoided,
//     and never the exact same movement twice
//   • a different set of exercises each time (recently seen ones go last)
// The AI is then only asked for sets, reps, weights and notes for these exercises.
import { EQUIPMENT_STYLES, EXERCISES, INJURY_FLAGS, MUSCLES, TARGETS, injuryFlags } from "./exerciseLibrary";

const PRIORITY = ["quads", "back", "chest", "glutes", "hamstrings", "shoulders", "biceps", "triceps", "core", "calves"];
const LAST = new Set(["core", "calves"]); // finish the workout with these

export const musclesFor = targets =>
  [...new Set(targets.flatMap(t => TARGETS.find(x => x.id === t)?.muscles || []))];

export const findExercise = name => {
  const n = norm(name);
  return EXERCISES.find(e => norm(e.name) === n) || null;
};

export function isEligible(ex, { gear, style = "any", flags = new Set() }) {
  const styleGear = EQUIPMENT_STYLES.find(s => s.id === style)?.gear;
  const usable = ex.equip.filter(g => gear.has(g) && (!styleGear || styleGear.includes(g)));
  if (!usable.length) return false;
  if (ex.needs.some(n => !gear.has(n))) return false;
  if (ex.avoid.some(f => flags.has(f))) return false;
  return true;
}

export const eligiblePool = opts => EXERCISES.filter(e => isEligible(e, opts));

// Which muscle each exercise slot goes to.
export function planSlots(muscles, n, { recentMuscles = new Set(), rand = Math.random } = {}) {
  const byPriority = m => PRIORITY.indexOf(m);
  let order = [...muscles].sort((a, b) => byPriority(a) - byPriority(b));
  if (order.length > n) {
    // More muscles than exercises: keep the most important, but let recently
    // trained muscles drop out first, with some shuffling for variety.
    const score = m => byPriority(m) + (recentMuscles.has(m) ? 3 : 0) + rand() * 2.5;
    const scored = order.map(m => [m, score(m)]).sort((a, b) => a[1] - b[1]);
    order = scored.slice(0, n).map(x => x[0]).sort((a, b) => byPriority(a) - byPriority(b));
  }
  const slots = [...order];
  for (let i = 0; slots.length < n; i++) {
    const m = order[i % order.length];
    // Extra exercises go to bigger muscles first; calves and core get at most two.
    if (LAST.has(m) && slots.filter(x => x === m).length >= 2 && order.some(x => !LAST.has(x))) continue;
    slots.push(m);
  }
  return slots;
}

function pickFrom(cands, { preferCompound, rand }) {
  if (!cands.length) return null;
  const pool = preferCompound && cands.some(c => c.compound) ? cands.filter(c => c.compound) : cands;
  return pool[Math.floor(rand() * pool.length)];
}

// Tries stricter rules first and relaxes only when nothing fits.
function chooseFor(muscle, pool, state, { exclude, recent, rand, preferCompound }) {
  const base = pool.filter(e => e.muscle === muscle && !state.names.has(e.name));
  const tiers = [
    e => !exclude.has(e.name) && !recent.has(e.name) && !state.families.has(e.family),
    e => !exclude.has(e.name) && !state.families.has(e.family),
    e => !exclude.has(e.name) && !state.patterns.has(e.pattern),
    e => !state.families.has(e.family),
    e => !state.patterns.has(e.pattern),
  ];
  for (const ok of tiers) {
    const hit = pickFrom(base.filter(ok), { preferCompound, rand });
    if (hit) return hit;
  }
  return null;
}

/**
 * Builds the exercise list for a workout.
 * targets: picker ids (e.g. ["biceps","shoulders"]); n: number of exercises
 * gear: Set from availableGear(); style: EQUIPMENT_STYLES id; injuries: text or list
 * exclude: names to avoid entirely if possible (the workout being regenerated)
 * recent: names seen lately (used only if nothing fresher fits)
 * Returns { exercises, missing } — missing lists muscles with no safe option.
 */
export function buildPlan({ targets, n, gear, style = "any", injuries, exclude = new Set(), recent = new Set(), recentMuscles, rand = Math.random }) {
  const flags = injuryFlags(injuries);
  const pool = eligiblePool({ gear, style, flags });
  const muscles = musclesFor(targets);
  const available = muscles.filter(m => pool.some(e => e.muscle === m));
  const missing = muscles.filter(m => !available.includes(m));
  const state = { names: new Set(), families: new Set(), patterns: new Set() };
  const chosen = [];
  const add = (ex, slotIdx) => {
    chosen.push({ ...ex, slotIdx });
    state.names.add(ex.name); state.families.add(ex.family); state.patterns.add(ex.pattern);
  };
  if (!available.length) return { exercises: [], missing, flags };

  const slots = planSlots(available, n, { recentMuscles, rand });
  const firstOf = new Set();
  slots.forEach((m, i) => {
    const preferCompound = !firstOf.has(m);
    firstOf.add(m);
    const ex = chooseFor(m, pool, state, { exclude, recent, rand, preferCompound });
    if (ex) add(ex, i);
  });
  // A muscle ran out of options: fill the gap from the other chosen muscles.
  for (let guard = 0; chosen.length < n && guard < 20; guard++) {
    const m = available[guard % available.length];
    const ex = chooseFor(m, pool, state, { exclude, recent, rand, preferCompound: false });
    if (ex) add(ex, 100 + guard);
  }
  // Compound lifts first, then accessories, core and calves last.
  const rank = e => (LAST.has(e.muscle) ? 2 : e.compound ? 0 : 1);
  chosen.sort((a, b) => rank(a) - rank(b) || PRIORITY.indexOf(a.muscle) - PRIORITY.indexOf(b.muscle) || a.slotIdx - b.slotIdx);
  return { exercises: chosen.map(e => { const c = { ...e }; delete c.slotIdx; return c; }), missing, flags };
}

/**
 * One replacement exercise: same muscle, not already in the workout, not
 * like the others in it, and not something seen recently if possible.
 */
export function pickSwap({ workoutNames, replace, targets, gear, style = "any", injuries, seen = new Set(), rand = Math.random }) {
  const flags = injuryFlags(injuries);
  const pool = eligiblePool({ gear, style, flags });
  const lib = findExercise(replace.name);
  const muscle = lib?.muscle || muscleFromLabel(replace.primaryMuscle) || musclesFor(targets)[0];
  const others = workoutNames.filter(x => norm(x) !== norm(replace.name)).map(findExercise).filter(Boolean);
  const fam = new Set(others.map(e => e.family)), pat = new Set(others.map(e => e.pattern));
  const inWorkout = new Set(workoutNames.map(norm));
  const base = pool.filter(e => e.muscle === muscle && !inWorkout.has(norm(e.name)));
  const tiers = [
    e => !seen.has(e.name) && !fam.has(e.family) && e.family !== lib?.family,
    e => !seen.has(e.name) && !fam.has(e.family),
    e => !seen.has(e.name) && !pat.has(e.pattern),
    e => !fam.has(e.family),
    e => !pat.has(e.pattern),
  ];
  for (const ok of tiers) {
    const hit = pickFrom(base.filter(ok), { preferCompound: false, rand });
    if (hit) return hit;
  }
  return null;
}

// ── programming ──────────────────────────────────────────────────────────────
export function defaultReps(goal, compound) {
  const g = String(goal || "").toLowerCase();
  if (g.includes("strong")) return compound ? "5-6" : "8-10";
  if (g.includes("fat") || g.includes("lean") || g.includes("tone")) return "12-15";
  return compound ? "8-10" : "10-12";
}
export const defaultRest = compound => (compound ? 90 : 60);

/**
 * Turns the AI's answer into the final workout, keeping the app's exercise
 * choices. If the AI renamed or replaced an exercise, the app's exercise is
 * used and the AI's weight and notes for that slot are dropped.
 */
export function mergeWithAI(plan, aiWorkout, { sets, goal, trainingLog = {} } = {}) {
  const ai = Array.isArray(aiWorkout?.exercises) ? aiWorkout.exercises : [];
  const usedAi = new Set();
  let replaced = 0;
  const exercises = plan.map((p, i) => {
    let ai_i = ai.findIndex((x, j) => !usedAi.has(j) && sameExercise(x?.name, p.name));
    const matched = ai_i >= 0;
    if (!matched && ai[i] && !usedAi.has(i)) ai_i = i;
    if (ai_i >= 0) usedAi.add(ai_i);
    const a = ai_i >= 0 ? ai[ai_i] : null;
    if (!matched) replaced++;
    const last = trainingLog[p.name];
    return {
      name: p.name,
      primaryMuscle: MUSCLES[p.muscle],
      sets: Number(a?.sets) || sets || 3,
      reps: (a?.reps && String(a.reps)) || defaultReps(goal, p.compound),
      weight: matched && a?.weight ? String(a.weight) : last?.lastWeight ? `${last.lastWeight} (last time)` : "",
      restSeconds: Number(a?.restSeconds) || defaultRest(p.compound),
      notes: matched ? a?.notes || "" : "",
      isCoreLift: false,
    };
  });
  return { exercises, replaced };
}

export function exerciseFromLibrary(ex, { sets, goal, trainingLog = {} } = {}) {
  const last = trainingLog[ex.name];
  return {
    name: ex.name, primaryMuscle: MUSCLES[ex.muscle], sets: sets || 3,
    reps: defaultReps(goal, ex.compound), weight: last?.lastWeight ? `${last.lastWeight} (last time)` : "",
    restSeconds: defaultRest(ex.compound), notes: "", isCoreLift: false,
  };
}

export function estimateMinutes(exercises) {
  const secs = exercises.reduce((s, e) => s + (Number(e.sets) || 3) * (45 + (Number(e.restSeconds) || 60)), 0);
  return Math.max(15, Math.round(secs / 60 / 5) * 5);
}

// Plain-language summary of what the app enforced, for the result screen.
export function rulesSummary({ flags, style }) {
  const out = [];
  const st = EQUIPMENT_STYLES.find(s => s.id === style);
  if (st && st.id !== "any") out.push(`${st.icon} ${st.label} only`);
  // Don't list what another injury already implies (shoulder → overhead, knee/ankle → jumping).
  const implied = f => (f === "overhead" && flags.has("shoulder")) || (f === "jump" && (flags.has("knee") || flags.has("ankle")));
  const shown = [...flags].filter(f => !implied(f));
  if (shown.length) out.push(`🩹 Safe for ${shown.map(f => INJURY_FLAGS[f].label).join(", ")}`);
  return out;
}

// ── helpers ──────────────────────────────────────────────────────────────────
function norm(s) {
  return String(s || "").toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
const STOP = new Set(["the", "a", "with", "and", "on", "of"]);
const tokens = s => norm(s).split(" ").filter(t => t && !STOP.has(t)).map(t => t.replace(/(es|s)$/, ""));
export function sameExercise(a, b) {
  if (!a || !b) return false;
  if (norm(a) === norm(b)) return true;
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  if (!A.size || !B.size) return false;
  const common = [...A].filter(t => B.has(t)).length;
  return common / Math.max(A.size, B.size) >= 0.75;
}
function muscleFromLabel(label) {
  const l = String(label || "").toLowerCase();
  return Object.keys(MUSCLES).find(m => l.includes(m) || l.includes(m.replace(/s$/, ""))) || null;
}

// ── memory of what the coach has shown, per person (this phone only) ─────────
const SEEN_KEY = user => `wp_coach_seen_${user}`;
export function loadSeen(user, days = 7) {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY(user)) || "{}");
    const cutoff = Date.now() - days * 86400000;
    return new Set(Object.entries(raw).filter(([, ts]) => ts >= cutoff).map(([n]) => n));
  } catch { return new Set(); }
}
export function rememberSeen(user, names) {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY(user)) || "{}");
    const now = Date.now(), cutoff = now - 14 * 86400000;
    for (const n of names) raw[n] = now;
    for (const [n, ts] of Object.entries(raw)) if (ts < cutoff) delete raw[n];
    localStorage.setItem(SEEN_KEY(user), JSON.stringify(raw));
  } catch { /* storage unavailable */ }
}
// Exercises from workouts logged in the last `days` days.
export function recentLogged(history, user, days = 7) {
  const out = new Set(), muscles = new Set();
  for (let i = 1; i <= days; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const s = history?.[ds]?.[user]?.wolfmodeSession;
    for (const e of s?.exercises || []) {
      if (!e?.name) continue;
      out.add(e.name);
      const lib = findExercise(e.name);
      if (lib && i <= 2) muscles.add(lib.muscle);
    }
  }
  return { names: out, muscles };
}
