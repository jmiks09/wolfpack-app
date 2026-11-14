// ── REPEAT A PAST WORKOUT ────────────────────────────────────────────────────
// Turns a logged session from history back into a coach workout, filled in with
// what was actually lifted last time, so it can be edited, swapped and done again.
import { defaultRest, findExercise } from "./coachPicker";
import { MUSCLES } from "./exerciseLibrary";
import { fmtSet } from "./setLog";

export const pastExercises = entry => entry?.wolfmodeSession?.exercises || entry?.details?.lift?.exercises || [];
export const canRepeat = entry => pastExercises(entry).some(e => !e.skipped || e.substitutedWith);

const withLbs = w => {
  const s = String(w || "").trim();
  if (!s) return "";
  if (/body\s*weight|^bw$/i.test(s)) return "bodyweight";
  return /^\d+(\.\d+)?$/.test(s) ? `${s} lbs` : s;
};
const shortDate = date => {
  const [y, m, d] = String(date).split("-").map(Number);
  return y ? new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "last time";
};

export function workoutFromHistory(entry, date) {
  const when = shortDate(date);
  const done = pastExercises(entry).filter(e => !e.skipped || e.substitutedWith);
  const exercises = done.map(e => {
    const name = e.skipped && e.substitutedWith ? e.substitutedWith : e.name;
    const lib = findExercise(name);
    const sets = Array.isArray(e.setLog) && e.setLog.length ? e.setLog : null;
    const weight = withLbs(e.weightUsed) || (e.skipped ? "" : withLbs(e.suggestedWeight || e.weight));
    const reps = String(e.actualReps || e.reps || "10");
    return {
      name: lib?.name || name,
      sets: sets ? sets.length : Number(e.sets) || 3,
      reps,
      weight,
      restSeconds: Number(e.restSeconds) || defaultRest(lib?.compound),
      primaryMuscle: lib ? MUSCLES[lib.muscle] : e.primaryMuscle || "",
      notes: sets
        ? `${when}: ${sets.map(fmtSet).join(", ")}. Match it or beat it.`
        : weight || e.actualReps ? `${when}: ${[weight && weight !== "bodyweight" ? weight : null, `${e.sets || ""}×${reps}`].filter(Boolean).join(" · ")}. Match it or beat it.` : "",
      isCoreLift: !!e.isCoreLift,
      // Pre-fill the set checklist with last time's exact sets
      ...(sets ? { log: sets.map(s => ({ weight: s.weight === "BW" ? "BW" : String(s.weight || ""), reps: String(s.reps || ""), done: false })) } : {}),
    };
  });
  const s = entry?.wolfmodeSession || {};
  const title = (s.title || entry?.details?.lift?.focus || "Workout").replace(/\s*\(again\)$/i, "");
  return {
    workout: {
      title: `${title} (again)`,
      reasoning: `Repeat of your ${when} workout, with last time's weights and reps filled in. Swap anything you like here, then change weights, reps or sets as you go.`,
      exercises,
      estimatedMinutes: Number(s.estimatedMinutes) || Number(entry?.duration) || 45,
      repeatOf: date,
    },
    muscleGroup: s.muscleGroup || "",
  };
}
