// ── HABIT CHALLENGES ─────────────────────────────────────────────────────────
// Pure scoring logic for multi-habit challenges like Winter Arc.
// Dates are local "YYYY-MM-DD" strings. Weeks run Monday–Sunday.
//
// Habit types
//   check    — tap to mark done; target = times per week          (Read 3×/week)
//   workout  — counted automatically from logged workouts;
//              filter any | strength | cardio; target = days/week  (Workout 7×, Strength 3×)
//   max      — number entered daily, must be ≤ target              (Screen time ≤ 60 min)
//   min      — number entered daily, must be ≥ target              (Water ≥ 8 glasses)
//   protein  — grams entered daily, must be ≥ perLb × goal weight  (0.7 g per lb)
// Daily types (max, min, protein) pass a week when the misses that week
// are no more than the challenge's graceDays.

export const HABIT_TYPES = {
  check:   { label: "Check off",          daily: false, icon: "✅" },
  workout: { label: "Workout (automatic)", daily: false, icon: "💪" },
  max:     { label: "Daily limit",         daily: true,  icon: "⏱️" },
  min:     { label: "Daily minimum",       daily: true,  icon: "🎯" },
  protein: { label: "Protein",             daily: true,  icon: "🥩" },
  total:   { label: "Running total",       daily: false, icon: "💰", personalOnly: true },
};
// total — personal only: amounts add up toward a goal by a deadline (savings, miles).

export const countsForPenalty = h => h.penalty !== false;
export const penaltyMode = ch => (ch.money?.mode === "flat" ? "flat" : "perHabit");
export const fmtAmount = (n, unit) => {
  const v = Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return unit === "$" ? `$${v}` : unit ? `${v} ${unit}` : v;
};

const STRENGTH_IDS = ["lift"];
const CARDIO_IDS = ["run", "bike", "hiit", "cardio"];

export function winterArcTemplate(startDate) {
  const year = Number(startDate.slice(0, 4));
  return {
    name: "Winter Arc",
    emoji: "❄️",
    start: startDate,
    end: `${year}-12-31`,
    penaltyStart: startDate,
    graceDays: 1,
    passesPerWeek: 1,
    money: { buyIn: 25, missFee: 5, payoutPct: 90 },
    habits: [
      { id: "read",     type: "check",   label: "Read",                    icon: "📖", target: 3 },
      { id: "workout",  type: "workout", label: "Workout",                 icon: "🔥", target: 7, filter: "any" },
      { id: "strength", type: "workout", label: "Strength training",       icon: "🏋️", target: 3, filter: "strength" },
      { id: "cardio",   type: "workout", label: "Cardio or 20-min activity", icon: "🏃", target: 4, filter: "cardio", minMinutes: 20 },
      { id: "screen",   type: "max",     label: "Screen time",             icon: "📵", target: 60, unit: "min" },
      { id: "protein",  type: "protein", label: "Protein",                 icon: "🥩", perLb: 0.7 },
    ],
  };
}

export function blankHabit(type) {
  const id = `${type}_${Math.random().toString(36).slice(2, 7)}`;
  if (type === "check") return { id, type, label: "", icon: "✅", target: 3 };
  if (type === "workout") return { id, type, label: "Workout", icon: "💪", target: 3, filter: "any", minMinutes: 20 };
  if (type === "max") return { id, type, label: "", icon: "⏱️", target: 60, unit: "min" };
  if (type === "min") return { id, type, label: "", icon: "🎯", target: 8, unit: "" };
  if (type === "total") return { id, type, label: "", icon: "💰", target: 1000, unit: "$" };
  return { id, type: "protein", label: "Protein", icon: "🥩", perLb: 0.7 };
}

// ── dates ──
const toDate = s => new Date(s + "T12:00:00");
const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return fmt(d); };
export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
export const mondayOf = s => { const d = toDate(s); const back = (d.getDay() + 6) % 7; return addDays(s, -back); };
export const dateRange = (a, b) => { const out = []; for (let d = a; d <= b; d = addDays(d, 1)) out.push(d); return out; };
export const minDate = (a, b) => (a < b ? a : b);
export const maxDate = (a, b) => (a > b ? a : b);

// Weeks of the challenge, clipped to its start and end.
export function challengeWeeks(ch) {
  const weeks = [];
  for (let mon = mondayOf(ch.start); mon <= ch.end; mon = addDays(mon, 7)) {
    const from = maxDate(mon, ch.start), to = minDate(addDays(mon, 6), ch.end);
    weeks.push({ monday: mon, from, to, days: daysBetween(from, to) + 1, index: weeks.length });
  }
  return weeks;
}

// ── workouts ──
function workoutMinutes(entry, w) {
  const d = entry.details?.[w.key] || entry.details?.[w.id];
  const m = Number(d?.duration);
  if (m) return m;
  return (entry.workouts || []).length === 1 ? Number(entry.duration) || 0 : 0;
}
export function workoutKinds(entry, minMinutes = 20) {
  if (!entry?.done) return { any: false, strength: false, cardio: false };
  const ws = entry.workouts || [];
  const strength = ws.some(w => STRENGTH_IDS.includes(w.id));
  const cardio = ws.some(w => !STRENGTH_IDS.includes(w.id) &&
    (CARDIO_IDS.includes(w.id) || workoutMinutes(entry, w) >= minMinutes));
  return { any: true, strength, cardio };
}

export const proteinTarget = (habit, goalWeight) =>
  goalWeight ? Math.round(habit.perLb * Number(goalWeight)) : null;

// Does a single day meet a daily habit? null = nothing entered.
export function dailyHit(habit, dayLog, goalWeight) {
  if (dayLog?.pass) return true;
  const v = dayLog?.[habit.id];
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (habit.type === "max") return n <= habit.target;
  if (habit.type === "min") return n >= habit.target;
  if (habit.type === "protein") { const t = proteinTarget(habit, goalWeight); return t != null && n >= t; }
  return null;
}

// Scores one person's habit for one week.
// asOf: today's date; days after it are not judged yet.
export function scoreHabitWeek(ch, habit, week, userLog, history, user, asOf) {
  const days = userLog?.days || {};
  if (habit.type === "total") return scoreTotal(ch, habit, userLog, asOf);
  const judged = dateRange(week.from, minDate(week.to, asOf));
  const finished = asOf > week.to;
  const passDays = judged.filter(d => days[d]?.pass).length;

  if (HABIT_TYPES[habit.type]?.daily) {
    let hits = 0, misses = 0;
    for (const d of judged) {
      const h = dailyHit(habit, days[d], userLog?.goalWeight);
      if (h) hits++;
      else if (h === false || d < asOf) misses++; // blank counts as a miss once the day is over
    }
    const grace = ch.graceDays ?? 1;
    const passed = misses <= grace;
    return { kind: "daily", hits, misses, grace, judgedDays: judged.length, weekDays: week.days,
      passed: finished ? passed : null, failing: misses > grace };
  }

  // Weekly count habits, prorated for partial weeks.
  const target = Math.ceil((habit.target * week.days) / 7);
  const hitDays = new Set();
  for (const d of judged) {
    if (habit.type === "check") { if (days[d]?.[habit.id]) hitDays.add(d); }
    else if (habit.type === "workout") {
      const k = workoutKinds(history?.[d]?.[user], habit.minMinutes ?? 20);
      if (k[habit.filter || "any"] || ((habit.filter || "any") === "any" && days[d]?.pass)) hitDays.add(d);
    }
  }
  const count = hitDays.size;
  // Days still available this week, counting today if it isn't done yet.
  const daysLeft = finished ? 0 : dateRange(maxDate(asOf, week.from), week.to).filter(d => !hitDays.has(d)).length;
  return { kind: "count", count, target, passDays,
    passed: finished ? count >= target : null,
    failing: !finished && count + daysLeft < target };
}

// Running total toward a goal, with an even pace from start to deadline.
export function scoreTotal(ch, goal, userLog, asOf) {
  const days = userLog?.days || {};
  const total = Object.entries(days).reduce((s, [d, v]) => (d <= asOf ? s + (Number(v?.[goal.id]) || 0) : s), 0);
  const start = goal.start || ch.start, end = goal.deadline || ch.end;
  const span = Math.max(1, daysBetween(start, end) + 1);
  const elapsed = Math.min(span, Math.max(0, daysBetween(start, asOf) + 1));
  const pace = Math.round((goal.target * elapsed) / span * 100) / 100;
  return { kind: "total", total, target: goal.target, pace, onPace: total >= pace,
    passed: total >= goal.target ? true : null, failing: false };
}

// Full picture for one person: every week, totals, fees.
export function scoreMember(ch, user, logs, history, asOf) {
  const userLog = logs?.byUser?.[user];
  const joined = ch.participants?.[user]?.joinedAt || ch.start;
  const left = ch.participants?.[user]?.leftAt || null; // left people stay on the ledger
  const weeks = challengeWeeks(ch).filter(w => w.from <= asOf);
  const rows = weeks.map(week => {
    const counted = (week.from >= joined || joined <= ch.start) && !(left && week.to >= left);
    const habits = Object.fromEntries(ch.habits.map(h => [h.id, scoreHabitWeek(ch, h, week, userLog, history, user, asOf)]));
    const finished = asOf > week.to;
    const missed = finished ? ch.habits.filter(h => habits[h.id].passed === false).length : 0;
    const missedPenalty = finished ? ch.habits.filter(h => countsForPenalty(h) && habits[h.id].passed === false).length : 0;
    const penalized = finished && counted && week.from >= ch.penaltyStart;
    const fee = !penalized ? 0 : penaltyMode(ch) === "flat"
      ? (missedPenalty > 0 ? Number(ch.money?.flatAmount) || 0 : 0)
      : missedPenalty * (Number(ch.money?.missFee) || 0);
    const passesUsed = dateRange(week.from, minDate(week.to, asOf)).filter(d => userLog?.days?.[d]?.pass).length;
    return { week, habits, finished, counted, missed, missedPenalty, penalized, fee, passesUsed };
  });
  const done = rows.filter(r => r.finished && r.counted);
  const habitWeeks = done.length * ch.habits.length;
  const passedWeeks = done.reduce((s, r) => s + ch.habits.filter(h => r.habits[h.id].passed).length, 0);
  const fees = rows.reduce((s, r) => s + r.fee, 0);
  const owed = (ch.money?.buyIn || 0) + fees;
  const paid = Object.values(ch.payments?.[user] || {}).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  return { user, left, rows, fees, owed, paid, balance: owed - paid,
    completion: habitWeeks ? Math.round((passedWeeks / habitWeeks) * 100) : null };
}

export function scoreChallenge(ch, logs, history, asOf) {
  const members = Object.keys(ch.participants || {});
  const scores = members.map(u => scoreMember(ch, u, logs, history, asOf));
  const pot = scores.reduce((s, m) => s + m.owed, 0);
  const threshold = ch.money?.payoutPct ?? 90;
  const onTrack = scores.filter(m => !m.left && (m.completion === null || m.completion >= threshold));
  return { scores, pot, threshold, onTrack: onTrack.map(m => m.user),
    payoutEach: onTrack.length ? Math.floor((pot / onTrack.length) * 100) / 100 : 0,
    finished: asOf > ch.end, inTrial: asOf < ch.penaltyStart };
}

// Which days can a person still edit? Today and the 2 days before;
// during the no-penalty trial, any day back to the start.
export function editableFrom(ch, asOf) {
  if (asOf < ch.penaltyStart) return ch.start;
  return maxDate(ch.start, addDays(asOf, -2));
}
