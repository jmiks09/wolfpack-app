// ── LOGGED WORKOUT ENTRY HELPERS ─────────────────────────────────────────────
// A day's entry can hold several workouts (walk + WOLFMODE…). The WOLFMODE one
// lives under details[lift_<ts>] and its summary line starts with "WOLFMODE".

export function wolfmodeMinutes(entry) {
  const ws = entry?.workouts || [];
  const w = [...ws].reverse().find(x => x.id === "lift" && String(x.key || "").startsWith("lift_"));
  return Number(entry?.details?.[w?.key]?.duration) || Number(entry?.wolfmodeSession?.estimatedMinutes) || null;
}

// Change how long the WOLFMODE session took, everywhere it shows.
export function withWolfmodeMinutes(entry, mins) {
  const m = Math.round(Number(mins));
  if (!m || m < 1 || !entry?.wolfmodeSession) return entry;
  const old = wolfmodeMinutes(entry) || 0;
  const ws = entry.workouts || [];
  const w = [...ws].reverse().find(x => x.id === "lift" && String(x.key || "").startsWith("lift_"));
  const details = { ...(entry.details || {}) };
  if (w?.key) details[w.key] = { ...(details[w.key] || {}), duration: String(m) };
  let summary = entry.summary;
  if (Array.isArray(summary)) {
    const i = summary.map(l => /^WOLFMODE/.test(l)).lastIndexOf(true);
    if (i >= 0) {
      summary = [...summary];
      summary[i] = /\d+ min/.test(summary[i]) ? summary[i].replace(/\d+ min/, `${m} min`) : `${summary[i]} · ${m} min`;
    }
  }
  return {
    ...entry,
    details,
    ...(Array.isArray(summary) ? { summary, workoutLabel: summary.join(" | ") } : {}),
    duration: Math.max(m, (Number(entry.duration) || 0) - old + m),
    wolfmodeSession: { ...entry.wolfmodeSession, estimatedMinutes: m },
  };
}

// ── MOVING A WORKOUT TO ANOTHER DAY ──────────────────────────────────────────
// Combine a moved day's workouts into the target day's entry (which may already
// have workouts). Steps stay with the day they were walked; keys that clash get
// a fresh one so neither workout's details are overwritten.
export function mergeMovedEntry(target, moved, stamp = Date.now()) {
  const tw = target?.done ? target.workouts || [] : [];
  const td = target?.done ? target.details || {} : {};
  const details = { ...td };
  const workouts = [...tw];
  (moved.workouts || []).forEach((w, i) => {
    const k = w.key || w.id;
    let nk = k;
    if (k in details) nk = `${w.id}_${stamp}_${i}`;
    details[nk] = moved.details?.[k] || {};
    workouts.push(nk === w.id && !w.key ? { ...w } : { ...w, key: nk });
  });
  const lines = e => (!e?.done ? [] : Array.isArray(e.summary) ? e.summary : e.workoutLabel ? [e.workoutLabel] : []);
  const summary = [...lines(target), ...lines(moved)];
  const out = {
    ...(target || {}),
    done: true,
    workouts,
    details,
    summary,
    workoutLabel: summary.join(" | "),
    workoutIcon: workouts.map(w => w.icon).join(""),
    duration: (Number(target?.done && target.duration) || 0) + (Number(moved.duration) || 0) || null,
    note: [target?.done ? target.note : "", moved.note].filter(Boolean).join(" · "),
    time: target?.done ? target.time : moved.time,
    sessionCount: (target?.done ? target.sessionCount || 1 : 0) + (moved.sessionCount || 1),
  };
  const ws = moved.wolfmodeSession || (target?.done ? target.wolfmodeSession : null);
  if (ws) out.wolfmodeSession = ws; else delete out.wolfmodeSession;
  if (target?.steps) out.steps = target.steps; else delete out.steps;
  return out;
}
