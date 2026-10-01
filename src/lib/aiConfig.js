
// ── AI Trainer constants ────────────────────────────────────────────────────
export const AI_GOALS = [
  {id:"glutes",   label:"Grow Glutes",        icon:"🍑"},
  {id:"upper",    label:"Build Upper Body",   icon:"💪"},
  {id:"legs",     label:"Build Legs",         icon:"🦵"},
  {id:"back",     label:"Build Back",         icon:"🔙"},
  {id:"core",     label:"Core & Abs",         icon:"🎯"},
  {id:"fatloss",  label:"Lose Fat",           icon:"🔥"},
  {id:"strength", label:"Get Stronger",       icon:"⚡"},
  {id:"general",  label:"General Fitness",    icon:"🏋️"},
];

export const AI_EXPERIENCE = [
  {id:"beginner",    label:"Beginner",     desc:"New to lifting (0-6 months)"},
  {id:"intermediate",label:"Intermediate", desc:"Consistent for 6+ months"},
  {id:"advanced",    label:"Advanced",     desc:"2+ years, knows form"},
];

export const AI_INJURIES = [
  "Bad knees","Bad shoulder","Lower back issues","Bad wrists","Bad elbows",
  "No overhead pressing","No deadlifts","No jumping","Hernia","Recovering from surgery",
];

// Default equipment for the home gym (admin-editable per pack)
export const HOME_GYM_DEFAULT = [
  "Rogue 45 lb Olympic barbell",
  "CAP 6ft bar with Olympic sleeve adapters",
  "Plates: 2×45 lb, 2×25 lb, 4×10 lb (160 lbs total, max loaded barbell 205 lbs)",
  "Adjustable bench (flat/incline/decline)",
  "Dumbbells: pairs up to 25 lbs",
  "Squat rack",
  "Landmine attachment",
  "Plyo boxes: 12 inch and 24 inch",
];

export const AI_EQUIPMENT_PRESETS = [
  {id:"home",       icon:"🏠", label:"Garage Gym",    desc:"WOLFPACK home setup"},
  {id:"commercial", icon:"🏋️", label:"Commercial Gym",desc:"Full gym access"},
  {id:"travel",     icon:"✈️", label:"Travel/Hotel",  desc:"Limited dumbbells, basic"},
  {id:"bodyweight", icon:"🛋️", label:"Bodyweight",    desc:"No equipment at all"},
];

export const AI_PRESET_DESCRIPTIONS = {
  home:"", // filled from Firestore pack settings — falls back to HOME_GYM_DEFAULT
  commercial:"Full commercial gym: barbells up to 45lb Olympic, plates to 100s of lbs, full dumbbell rack to 100+ lbs, adjustable benches, squat racks, leg press, hack squat, lat pulldown, cable machine, Smith machine, leg curl/extension, calf raise, hyperextension bench, dip station, pull-up bar, kettlebells, resistance bands.",
  travel:"Hotel/travel gym: dumbbells typically up to 50 lbs, treadmill, sometimes a cable machine or adjustable bench. Assume no barbell and no squat rack.",
  bodyweight:"No equipment whatsoever. Bodyweight exercises only.",
};

export const MAX_DAILY_REGENS = 5;

// ── Muscle groups for WOLFMODE picker ───────────────────────────────────────
export const AI_MUSCLE_GROUPS = [
  {id:"chest",     label:"Chest",       icon:"🫁"},
  {id:"back",      label:"Back",        icon:"🔺"},
  {id:"legs",      label:"Legs",        icon:"🦵"},
  {id:"glutes",    label:"Glutes",      icon:"🍑"},
  {id:"shoulders", label:"Shoulders",   icon:"🏹"},
  {id:"arms",      label:"Arms",        icon:"💪"},
  {id:"core",      label:"Core & Abs",  icon:"🎯"},
  {id:"fullbody",  label:"Full Body",   icon:"⚡"},
];

// Secondary goals — shape the programming style, not the muscle focus
export const AI_SECONDARY_GOALS = [
  // Lower body
  {id:"bigger_glutes",   label:"Bigger glutes",          desc:"Prioritize glute hypertrophy. High-volume hip thrusts, RDLs, split squats."},
  {id:"leaner_glutes",   label:"Leaner hips & glutes",   desc:"Reduce lower-body hypertrophy. Less heavy glute work, more conditioning."},
  {id:"bigger_legs",     label:"Bigger legs",             desc:"Prioritize quad and hamstring development with heavy compound lifts."},
  {id:"leaner_legs",     label:"Leaner thighs",           desc:"Limit lower-body hypertrophy. Favor moderate resistance and cardio."},
  // Upper body — shoulders
  {id:"bigger_shoulders",label:"Bigger shoulders",        desc:"Increase shoulder volume. More overhead pressing and lateral work."},
  {id:"leaner_shoulders",label:"Smaller shoulders",       desc:"Minimal shoulder hypertrophy. Light maintenance work only."},
  // Upper body — arms
  {id:"bigger_arms",     label:"Bigger arms",             desc:"Increase bicep and tricep volume and emphasis."},
  {id:"toned_arms",      label:"Toned arms",              desc:"Moderate arm volume for definition without bulk."},
  // Upper body — back & chest
  {id:"bigger_back",     label:"Wider back",              desc:"Prioritize lat width and upper back development."},
  {id:"bigger_chest",    label:"Bigger chest",            desc:"Prioritize chest hypertrophy with progressive pressing."},
  {id:"leaner_chest",    label:"Leaner chest",            desc:"Moderate chest maintenance. Support overall fat loss."},
  // Overall
  {id:"athletic",        label:"Athletic physique",       desc:"Balanced strength, power, and conditioning. Functional fitness focus."},
  {id:"balanced",        label:"Balanced proportions",    desc:"Even development across all muscle groups. No overemphasis."},
];

// Effort ratings for post-workout check-in
export const EFFORT_RATINGS = [
  {id:"easy",    emoji:"😴", label:"Too Easy",  color:"#3498db", advice:"bump weights next time"},
  {id:"normal",  emoji:"💪", label:"Just Right",color:"#2ecc71", advice:"keep it up"},
  {id:"hard",    emoji:"🔥", label:"Tough",     color:"#e67e22", advice:"hold weights next session"},
  {id:"wrecked", emoji:"💀", label:"Wrecked",   color:"#e74c3c", advice:"reduce volume next time"},
];

// ── AI Coach (Nutrition + Supplements) constants ────────────────────────────
export const AI_BULK_CUT = [
  {id:"bulk",     label:"Bulk",     icon:"📈", desc:"Build muscle, eat in surplus"},
  {id:"cut",      label:"Cut",      icon:"📉", desc:"Lose fat, eat in deficit"},
  {id:"maintain", label:"Maintain", icon:"⚖️", desc:"Stay where I am"},
];

export const AI_ACTIVITY_LEVELS = [
  {id:"sedentary",label:"Sedentary",     desc:"Desk job, no exercise"},
  {id:"light",    label:"Lightly Active",desc:"Light exercise 1-3 days/wk"},
  {id:"moderate", label:"Moderate",      desc:"Exercise 3-5 days/wk"},
  {id:"very",     label:"Very Active",   desc:"Hard exercise 6-7 days/wk"},
];

export const AI_DIETS = [
  "Vegetarian","Vegan","Gluten-free","Lactose-free","Pescatarian","Keto/Low-carb","No restrictions",
];

export const AI_GENDERS = [
  {id:"male",   label:"Male"},
  {id:"female", label:"Female"},
  {id:"na",     label:"Prefer not to say"},
];
