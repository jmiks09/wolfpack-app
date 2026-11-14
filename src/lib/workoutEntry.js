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
