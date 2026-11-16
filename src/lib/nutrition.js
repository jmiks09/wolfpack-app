// ── NUTRITION MATH ───────────────────────────────────────────────────────────
// Calories and macros are calculated here (Mifflin-St Jeor), not by the AI, so
// the same stats always give the same numbers and a weight change always shows.
// The AI only writes the explanation, meal timing and supplement notes.

const ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 };
const ADJUST = { cut: -500, maintain: 0, bulk: 300 };
const round10 = n => Math.round(n / 10) * 10;

export function nutritionTargets(stats = {}) {
  const lbs = Number(stats.weight), inches = Number(stats.heightInches) || Number(stats.feet) * 12 + (Number(stats.inches) || 0);
  const age = Number(stats.age);
  if (!lbs || !inches || !age) return null;
  const kg = lbs * 0.4536, cm = inches * 2.54;
  // Mifflin-St Jeor: +5 for men, −161 for women; halfway when not given
  const sex = stats.gender === "male" ? 5 : stats.gender === "female" ? -161 : -78;
  const bmr = 10 * kg + 6.25 * cm - 5 * age + sex;
  const tdee = round10(bmr * (ACTIVITY[stats.activity] || 1.375));
  const floor = stats.gender === "male" ? 1500 : 1200;
  const calorieTarget = Math.max(floor, round10(tdee + (ADJUST[stats.bulkCut] ?? 0)));
  // Protein per lb of bodyweight (a bit higher on a cut to keep muscle), fat ~27%, carbs the rest
  const proteinGrams = Math.min(250, Math.round(lbs * (stats.bulkCut === "cut" ? 1.0 : 0.85)));
  const fatGrams = Math.round((calorieTarget * 0.27) / 9);
  const carbsGrams = Math.max(50, Math.round((calorieTarget - proteinGrams * 4 - fatGrams * 9) / 4));
  return { tdee, calorieTarget, macros: { proteinGrams, carbsGrams, fatGrams } };
}

// One line for the AI so its explanation quotes the same numbers.
export const targetsPrompt = t =>
  t ? ` (Use exactly these numbers: TDEE ${t.tdee} kcal, target ${t.calorieTarget} kcal/day, protein ${t.macros.proteinGrams}g, carbs ${t.macros.carbsGrams}g, fat ${t.macros.fatGrams}g.)` : "";
