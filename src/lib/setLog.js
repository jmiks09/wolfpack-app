// ── SET LOG ──────────────────────────────────────────────────────────────────
// Set-by-set tracking during a WOLFMODE workout. Each exercise in the active
// workout gets `log`: [{ weight, reps, done }], pre-filled from the coach's plan.

// "65 lbs" → "65"; "bodyweight" → "BW"; vague hints ("lighter than 135") → "" so
// the person fills in their own number.
export function parseWeight(w) {
  const s = String(w || "").toLowerCase();
  if (!s) return "";
  if (s.includes("bodyweight") || s === "bw") return "BW";
  if (/lighter|heavier|pick|choose/.test(s)) return "";
  const m = s.match(/\d+(\.\d+)?/);
  return m ? m[0] : "";
}
// "12-15" → "12" (start at the bottom of the range).
export const parseReps = r => (String(r || "").match(/\d+/) || [""])[0];

export function initSets(ex) {
  const n = Math.max(1, Math.min(10, Number(ex.sets) || 3));
  return Array.from({ length: n }, () => ({ weight: parseWeight(ex.weight), reps: parseReps(ex.reps), done: false }));
}
export const setsOf = ex => (Array.isArray(ex.log) && ex.log.length ? ex.log : initSets(ex));

export const anySetDone = exercises => (exercises || []).some(e => (e.log || []).some(s => s.done));
export function setProgress(exercises) {
  let done = 0, total = 0;
  for (const e of exercises || []) { const s = setsOf(e); total += s.length; done += s.filter(x => x.done).length; }
  return { done, total };
}

// What was actually done for one exercise.
export function summarizeLog(ex) {
  const done = (ex.log || []).filter(s => s.done);
  if (!done.length) return { skipped: true, sets: 0 };
  const nums = done.map(s => parseFloat(s.weight)).filter(n => !isNaN(n));
  const top = nums.length ? Math.max(...nums) : null;
  // Best set = most reps at the heaviest weight
  const atTop = done.filter(s => top == null || parseFloat(s.weight) === top);
  const topSet = atTop.reduce((b, s) => ((parseInt(s.reps) || 0) > (parseInt(b.reps) || 0) ? s : b), atTop[0] || done[0]);
  return {
    skipped: false,
    sets: done.length,
    weightUsed: top != null ? `${top} lbs` : done.some(s => s.weight === "BW") ? "bodyweight" : null,
    actualReps: topSet.reps || null,
    setLog: done.map(s => ({ weight: s.weight, reps: s.reps })),
  };
}

// The after-workout log, in the shape the rating screen and training log use.
export function buildPrelogged(exercises) {
  return (exercises || []).map(e => {
    const s = summarizeLog(e);
    return {
      name: e.name,
      sets: s.skipped ? Number(e.sets) || 0 : s.sets,
      reps: s.actualReps || e.reps,
      actualReps: s.actualReps || null,
      weightUsed: s.weightUsed || null,
      suggestedWeight: e.weight || null,
      skipped: s.skipped,
      substitutedWith: null,
      isCoreLift: e.isCoreLift || false,
      primaryMuscle: e.primaryMuscle || "",
      setLog: s.setLog || null,
    };
  });
}

// "Bench Press: 3×12 @ 65 lbs + ..." for the workout summary line.
export function workoutSummary(exercises, useLogs) {
  return (exercises || []).map(e => {
    if (useLogs) {
      const s = summarizeLog(e);
      if (s.skipped) return null;
      return `${e.name}: ${s.sets}×${s.actualReps || e.reps}${s.weightUsed && s.weightUsed !== "bodyweight" ? ` @ ${s.weightUsed}` : ""}`;
    }
    return `${e.name}: ${e.sets}×${e.reps}${e.weight && e.weight !== "bodyweight" ? ` @ ${e.weight}` : ""}`;
  }).filter(Boolean).join(" + ");
}

export const fmtSet = s => `${s.weight === "BW" ? "BW" : s.weight ? `${s.weight}` : "—"}×${s.reps || "—"}`;
