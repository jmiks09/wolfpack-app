// ── EXERCISE LIBRARY ─────────────────────────────────────────────────────────
// The coach picks exercises from this list, so injuries, equipment and variety
// are enforced by the app, not left to the AI.
//
// Each exercise: [name, muscle, pattern, equipment, options]
//   muscle    — primary muscle (see MUSCLES)
//   pattern   — movement type; a workout never has two of the same pattern,
//               so you don't get two near-identical exercises
//   equipment — implements that can do it (any one is enough):
//               bw (bodyweight), db (dumbbell), bb (barbell), kb (kettlebell),
//               cable, machine, band
//   options   — needs: extra gear also required (bench, rack, pullupbar, dip,
//                      landmine, box)
//               avoid: injury flags it's unsafe for (see INJURY_FLAGS)
//               c: true = compound lift (goes first in a workout)

export const MUSCLES = {
  chest: "Chest", back: "Back", shoulders: "Shoulders", biceps: "Biceps", triceps: "Triceps",
  quads: "Quads", hamstrings: "Hamstrings", glutes: "Glutes", calves: "Calves", core: "Core",
};

const RAW = [
  // ── CHEST ──
  ["Barbell Bench Press", "chest", "press-flat", ["bb"], { needs: ["bench"], avoid: ["shoulder", "wrist"], c: true }],
  ["Incline Barbell Bench Press", "chest", "press-incline", ["bb"], { needs: ["bench"], avoid: ["shoulder", "wrist"], c: true }],
  ["Dumbbell Bench Press", "chest", "press-flat", ["db"], { needs: ["bench"], avoid: ["wrist"], c: true }],
  ["Incline Dumbbell Press", "chest", "press-incline", ["db"], { needs: ["bench"], avoid: ["wrist"], c: true }],
  ["Decline Dumbbell Press", "chest", "press-decline", ["db"], { needs: ["bench"], avoid: ["wrist"], c: true }],
  ["Dumbbell Floor Press", "chest", "press-flat", ["db", "kb"], { avoid: ["wrist"], c: true }],
  ["Dumbbell Squeeze Press", "chest", "press-squeeze", ["db"], { needs: ["bench"], avoid: ["wrist"] }],
  ["Dumbbell Fly", "chest", "fly", ["db"], { needs: ["bench"], avoid: ["shoulder", "elbow"] }],
  ["Incline Dumbbell Fly", "chest", "fly-incline", ["db"], { needs: ["bench"], avoid: ["shoulder", "elbow"] }],
  ["Push-Up", "chest", "pushup", ["bw"], { avoid: ["wrist"], c: true }],
  ["Incline Push-Up", "chest", "pushup-incline", ["bw"], { avoid: ["wrist"] }],
  ["Decline Push-Up", "chest", "pushup-decline", ["bw"], { avoid: ["wrist", "shoulder"] }],
  ["Archer Push-Up", "chest", "pushup-unilateral", ["bw"], { avoid: ["wrist", "shoulder", "elbow"] }],
  ["Chest Dip", "chest", "dip", ["bw"], { needs: ["dip"], avoid: ["shoulder", "elbow", "wrist"], c: true }],
  ["Cable Fly", "chest", "fly", ["cable"], { avoid: ["shoulder"] }],
  ["Low-to-High Cable Fly", "chest", "fly-incline", ["cable"], { avoid: ["shoulder"] }],
  ["Machine Chest Press", "chest", "press-flat", ["machine"], { c: true }],
  ["Smith Machine Incline Press", "chest", "press-incline", ["machine"], { avoid: ["shoulder"], c: true }],
  ["Pec Deck", "chest", "fly", ["machine"], { avoid: ["shoulder"] }],
  ["Band Chest Press", "chest", "press-flat", ["band"], {}],
  ["Band Chest Fly", "chest", "fly", ["band"], { avoid: ["shoulder"] }],
  ["Kettlebell Floor Press", "chest", "press-flat", ["kb"], { avoid: ["wrist"], c: true }],
  ["Landmine Chest Press", "chest", "landmine-chest-press", ["bb"], { needs: ["landmine"] }],

  // ── BACK ──
  ["Pull-Up", "back", "vertical-pull", ["bw"], { needs: ["pullupbar"], avoid: ["shoulder", "elbow"], c: true }],
  ["Chin-Up", "back", "vertical-pull", ["bw"], { needs: ["pullupbar"], avoid: ["shoulder", "elbow", "wrist"], c: true }],
  ["Lat Pulldown", "back", "vertical-pull", ["cable", "machine"], { c: true }],
  ["Close-Grip Lat Pulldown", "back", "vertical-pull-close", ["cable", "machine"], {}],
  ["Barbell Bent-Over Row", "back", "row-bent", ["bb"], { avoid: ["back", "hernia"], c: true }],
  ["Pendlay Row", "back", "row-bent", ["bb"], { avoid: ["back", "hernia"], c: true }],
  ["Landmine T-Bar Row", "back", "row-tbar", ["bb"], { needs: ["landmine"], avoid: ["back"], c: true }],
  ["One-Arm Dumbbell Row", "back", "row-unilateral", ["db", "kb"], { needs: ["bench"], c: true }],
  ["Chest-Supported Dumbbell Row", "back", "row-supported", ["db"], { needs: ["bench"], c: true }],
  ["Dumbbell Bent-Over Row", "back", "row-bent", ["db"], { avoid: ["back"], c: true }],
  ["Renegade Row", "back", "row-plank", ["db", "kb"], { avoid: ["wrist", "shoulder"] }],
  ["Seated Cable Row", "back", "row-seated", ["cable"], { c: true }],
  ["Machine Row", "back", "row-supported", ["machine"], { c: true }],
  ["Inverted Row", "back", "row-inverted", ["bw"], { needs: ["rack"], c: true }],
  ["Band Row", "back", "row-seated", ["band"], {}],
  ["Straight-Arm Cable Pulldown", "back", "pullover", ["cable"], {}],
  ["Dumbbell Pullover", "back", "pullover", ["db"], { needs: ["bench"], avoid: ["shoulder"] }],
  ["Band Straight-Arm Pulldown", "back", "pullover", ["band"], {}],
  ["Barbell Shrug", "back", "shrug", ["bb"], { avoid: ["neck"] }],
  ["Dumbbell Shrug", "back", "shrug", ["db", "kb"], { avoid: ["neck"] }],
  ["Rack Pull", "back", "hinge-rack", ["bb"], { needs: ["rack"], avoid: ["back", "deadlift", "hernia"], c: true }],
  ["Superman Hold", "back", "back-extension", ["bw"], { avoid: ["back"] }],
  ["Prone Y-T-W Raise", "back", "upper-back", ["bw", "db"], {}],
  ["Prone Snow Angel", "back", "upper-back-angel", ["bw"], {}],
  ["Kettlebell Gorilla Row", "back", "row-alternating", ["kb", "db"], { avoid: ["back"], c: true }],

  // ── SHOULDERS ──
  ["Barbell Overhead Press", "shoulders", "overhead-press", ["bb"], { avoid: ["overhead", "shoulder", "back"], c: true }],
  ["Seated Dumbbell Shoulder Press", "shoulders", "overhead-press", ["db"], { needs: ["bench"], avoid: ["overhead", "shoulder"], c: true }],
  ["Standing Dumbbell Shoulder Press", "shoulders", "overhead-press", ["db"], { avoid: ["overhead", "shoulder", "back"], c: true }],
  ["Arnold Press", "shoulders", "overhead-press-rotational", ["db"], { avoid: ["overhead", "shoulder"], c: true }],
  ["Kettlebell Overhead Press", "shoulders", "overhead-press", ["kb"], { avoid: ["overhead", "shoulder"], c: true }],
  ["Machine Shoulder Press", "shoulders", "overhead-press", ["machine"], { avoid: ["overhead", "shoulder"], c: true }],
  ["Pike Push-Up", "shoulders", "overhead-press-bw", ["bw"], { avoid: ["overhead", "shoulder", "wrist"], c: true }],
  ["Landmine Shoulder Press", "shoulders", "press-landmine", ["bb"], { needs: ["landmine"], c: true }],
  ["Half-Kneeling Single-Arm Press", "shoulders", "press-unilateral", ["db", "kb"], { avoid: ["overhead", "shoulder"] }],
  ["Dumbbell Lateral Raise", "shoulders", "lateral-raise", ["db"], {}],
  ["Cable Lateral Raise", "shoulders", "lateral-raise-cable", ["cable"], {}],
  ["Band Lateral Raise", "shoulders", "lateral-raise", ["band"], {}],
  ["Lean-Away Dumbbell Lateral Raise", "shoulders", "lateral-raise-lean", ["db"], {}],
  ["Dumbbell Front Raise", "shoulders", "front-raise", ["db"], { avoid: ["shoulder"] }],
  ["Plate Front Raise", "shoulders", "front-raise", ["bb"], { avoid: ["shoulder"] }],
  ["Rear Delt Dumbbell Fly", "shoulders", "rear-delt", ["db"], {}],
  ["Face Pull", "shoulders", "rear-delt-pull", ["cable"], {}],
  ["Band Face Pull", "shoulders", "rear-delt-pull", ["band"], {}],
  ["Reverse Pec Deck", "shoulders", "rear-delt", ["machine"], {}],
  ["Band Pull-Apart", "shoulders", "rear-delt-apart", ["band"], {}],
  ["Dumbbell Upright Row", "shoulders", "upright-row", ["db", "kb"], { avoid: ["shoulder"] }],
  ["Kettlebell Halo", "shoulders", "halo", ["kb", "db"], { avoid: ["shoulder"] }],
  ["Wall Walk", "shoulders", "handstand", ["bw"], { avoid: ["overhead", "shoulder", "wrist"] }],
  ["Prone Shoulder Taps", "shoulders", "plank-reach", ["bw"], { avoid: ["wrist"] }],
  ["Seated Bent-Over Rear Delt Raise", "shoulders", "rear-delt-seated", ["db"], { needs: ["bench"] }],
  ["Incline Dumbbell Y-Raise", "shoulders", "y-raise", ["db"], { needs: ["bench"] }],
  ["Cable Y-Raise", "shoulders", "y-raise", ["cable", "band"], {}],
  ["Dumbbell Scaption Raise", "shoulders", "scaption", ["db"], {}],
  ["Side-Lying Dumbbell External Rotation", "shoulders", "external-rotation", ["db"], {}],
  ["Band External Rotation", "shoulders", "external-rotation", ["band", "cable"], {}],
  ["Prone Dumbbell W-Raise", "shoulders", "w-raise", ["db", "bw"], {}],

  // ── BICEPS ──
  ["Barbell Curl", "biceps", "curl", ["bb"], { avoid: ["elbow", "wrist"] }],
  ["Dumbbell Curl", "biceps", "curl", ["db", "kb"], { avoid: ["elbow"] }],
  ["Hammer Curl", "biceps", "hammer-curl", ["db"], {}],
  ["Incline Dumbbell Curl", "biceps", "curl-stretch", ["db"], { needs: ["bench"], avoid: ["elbow", "shoulder"] }],
  ["Concentration Curl", "biceps", "curl-isolated", ["db"], { avoid: ["elbow"] }],
  ["Spider Curl", "biceps", "curl-isolated", ["db"], { needs: ["bench"], avoid: ["elbow"] }],
  ["Machine Preacher Curl", "biceps", "curl-isolated", ["machine"], { avoid: ["elbow"] }],
  ["Cable Curl", "biceps", "curl", ["cable"], { avoid: ["elbow"] }],
  ["Rope Hammer Curl", "biceps", "hammer-curl", ["cable"], {}],
  ["Bayesian Cable Curl", "biceps", "curl-stretch", ["cable"], { avoid: ["elbow", "shoulder"] }],
  ["Reverse Barbell Curl", "biceps", "reverse-curl", ["bb"], { avoid: ["wrist", "elbow"] }],
  ["Zottman Curl", "biceps", "reverse-curl", ["db"], { avoid: ["wrist", "elbow"] }],
  ["Band Curl", "biceps", "curl", ["band"], {}],
  ["Cross-Body Hammer Curl", "biceps", "hammer-curl-cross", ["db"], {}],
  ["Isometric Chin-Up Hold", "biceps", "chin-hold", ["bw"], { needs: ["pullupbar"], avoid: ["shoulder", "elbow"] }],
  ["Underhand Inverted Row", "biceps", "row-inverted-underhand", ["bw"], { needs: ["rack"], avoid: ["elbow"] }],

  // ── TRICEPS ──
  ["Close-Grip Bench Press", "triceps", "close-press", ["bb"], { needs: ["bench"], avoid: ["wrist", "shoulder", "elbow"], c: true }],
  ["Barbell Skull Crusher", "triceps", "skull-crusher", ["bb"], { needs: ["bench"], avoid: ["elbow"] }],
  ["Dumbbell Skull Crusher", "triceps", "skull-crusher", ["db"], { needs: ["bench"], avoid: ["elbow"] }],
  ["Tate Press", "triceps", "tate-press", ["db"], { needs: ["bench"], avoid: ["elbow"] }],
  ["Overhead Dumbbell Triceps Extension", "triceps", "overhead-extension", ["db", "kb"], { avoid: ["elbow", "overhead", "shoulder"] }],
  ["Overhead Cable Triceps Extension", "triceps", "overhead-extension", ["cable"], { avoid: ["elbow", "overhead", "shoulder"] }],
  ["Rope Pushdown", "triceps", "pushdown", ["cable"], {}],
  ["Straight-Bar Pushdown", "triceps", "pushdown", ["cable"], { avoid: ["wrist"] }],
  ["Band Pushdown", "triceps", "pushdown", ["band"], {}],
  ["Dumbbell Kickback", "triceps", "tri-kickback", ["db"], {}],
  ["Cable Kickback (Triceps)", "triceps", "tri-kickback", ["cable"], {}],
  ["Bench Dip", "triceps", "dip", ["bw"], { needs: ["bench"], avoid: ["shoulder", "wrist", "elbow"] }],
  ["Triceps Dip", "triceps", "dip", ["bw"], { needs: ["dip"], avoid: ["shoulder", "wrist", "elbow"], c: true }],
  ["Diamond Push-Up", "triceps", "close-pushup", ["bw"], { avoid: ["wrist", "elbow"] }],
  ["Close-Grip Dumbbell Press", "triceps", "close-press", ["db"], { needs: ["bench"], avoid: ["wrist"] }],
  ["Machine Dip", "triceps", "dip-machine", ["machine"], { avoid: ["shoulder"] }],
  ["Bodyweight Triceps Extension", "triceps", "bw-extension", ["bw"], { needs: ["rack"], avoid: ["elbow", "wrist"] }],

  // ── QUADS ──
  ["Barbell Back Squat", "quads", "squat", ["bb"], { needs: ["rack"], avoid: ["knee", "back", "hernia"], c: true }],
  ["Front Squat", "quads", "squat-front", ["bb"], { needs: ["rack"], avoid: ["knee", "wrist", "back"], c: true }],
  ["Goblet Squat", "quads", "squat-goblet", ["db", "kb"], { avoid: ["knee"], c: true }],
  ["Landmine Squat", "quads", "squat-landmine", ["bb"], { needs: ["landmine"], avoid: ["knee"], c: true }],
  ["Bodyweight Squat", "quads", "squat", ["bw"], { avoid: ["knee"] }],
  ["Jump Squat", "quads", "squat-jump", ["bw"], { avoid: ["knee", "jump", "ankle"] }],
  ["Bulgarian Split Squat", "quads", "split-squat", ["db", "kb", "bw"], { needs: ["bench"], avoid: ["knee", "ankle"], c: true }],
  ["Split Squat", "quads", "split-squat-floor", ["db", "kb", "bw"], { avoid: ["knee"] }],
  ["Reverse Lunge", "quads", "lunge", ["db", "kb", "bw"], { avoid: ["knee"], c: true }],
  ["Walking Lunge", "quads", "lunge-walking", ["db", "kb", "bw"], { avoid: ["knee", "ankle"] }],
  ["Step-Up", "quads", "step-up", ["db", "kb", "bw"], { needs: ["box"], avoid: ["knee"] }],
  ["Leg Press", "quads", "leg-press", ["machine"], { avoid: ["knee"], c: true }],
  ["Hack Squat", "quads", "squat-machine", ["machine"], { avoid: ["knee", "back"], c: true }],
  ["Smith Machine Squat", "quads", "squat-smith", ["machine"], { avoid: ["knee"], c: true }],
  ["Leg Extension", "quads", "leg-extension", ["machine"], { avoid: ["knee"] }],
  ["Wall Sit", "quads", "isometric-squat", ["bw"], { avoid: ["knee"] }],
  ["Cossack Squat", "quads", "lateral-squat", ["bw", "kb", "db"], { avoid: ["knee", "hip"] }],
  ["Heels-Elevated Goblet Squat", "quads", "squat-heels", ["db", "kb"], { avoid: ["knee"] }],
  ["Box Jump", "quads", "jump", ["bw"], { needs: ["box"], avoid: ["knee", "jump", "ankle"] }],

  // ── HAMSTRINGS ──
  ["Barbell Romanian Deadlift", "hamstrings", "hinge", ["bb"], { avoid: ["back", "deadlift", "hernia"], c: true }],
  ["Dumbbell Romanian Deadlift", "hamstrings", "hinge", ["db", "kb"], { avoid: ["back", "deadlift"], c: true }],
  ["Single-Leg Romanian Deadlift", "hamstrings", "hinge-single", ["db", "kb", "bw"], { avoid: ["back", "ankle"] }],
  ["Conventional Deadlift", "hamstrings", "deadlift", ["bb"], { avoid: ["back", "deadlift", "hernia"], c: true }],
  ["Good Morning", "hamstrings", "good-morning", ["bb"], { needs: ["rack"], avoid: ["back", "hernia"] }],
  ["Lying Leg Curl", "hamstrings", "leg-curl", ["machine"], {}],
  ["Seated Leg Curl", "hamstrings", "leg-curl-seated", ["machine"], {}],
  ["Dumbbell Lying Leg Curl", "hamstrings", "leg-curl", ["db"], { needs: ["bench"] }],
  ["Band Leg Curl", "hamstrings", "leg-curl", ["band"], {}],
  ["Slider Leg Curl", "hamstrings", "leg-curl-floor", ["bw"], {}],
  ["Nordic Curl", "hamstrings", "nordic", ["bw"], { avoid: ["knee"] }],
  ["Cable Pull-Through", "hamstrings", "hinge-cable", ["cable"], { avoid: ["back"] }],
  ["Kettlebell Deadlift", "hamstrings", "hinge-kb", ["kb", "db"], { avoid: ["back", "deadlift"] }],

  // ── GLUTES ──
  ["Barbell Hip Thrust", "glutes", "hip-thrust", ["bb"], { needs: ["bench"], c: true }],
  ["Dumbbell Hip Thrust", "glutes", "hip-thrust", ["db", "kb"], { needs: ["bench"], c: true }],
  ["Single-Leg Hip Thrust", "glutes", "hip-thrust-single", ["bw", "db"], { needs: ["bench"] }],
  ["Glute Bridge", "glutes", "hip-thrust", ["bw", "db", "bb", "band"], {}],
  ["Single-Leg Glute Bridge", "glutes", "hip-thrust-single", ["bw"], {}],
  ["Frog Pump", "glutes", "frog-pump", ["bw", "db"], { avoid: ["hip"] }],
  ["Cable Glute Kickback", "glutes", "kickback", ["cable"], { avoid: ["back"] }],
  ["Donkey Kick", "glutes", "kickback", ["bw", "band"], { avoid: ["wrist"] }],
  ["Banded Lateral Walk", "glutes", "abduction-walk", ["band"], {}],
  ["Hip Abduction Machine", "glutes", "abduction", ["machine"], {}],
  ["Clamshell", "glutes", "abduction", ["bw", "band"], {}],
  ["Side-Lying Leg Raise", "glutes", "abduction-lying", ["bw", "band"], {}],
  ["Fire Hydrant", "glutes", "abduction-quadruped", ["bw", "band"], { avoid: ["wrist"] }],
  ["Kettlebell Swing", "glutes", "swing", ["kb", "db"], { avoid: ["back", "hernia"], c: true }],
  ["Curtsy Lunge", "glutes", "lunge-curtsy", ["bw", "db", "kb"], { avoid: ["knee", "hip"] }],
  ["B-Stance Romanian Deadlift", "glutes", "hinge-bstance", ["db", "kb"], { avoid: ["back", "deadlift"] }],
  ["Sumo Squat", "glutes", "squat-sumo", ["db", "kb"], { avoid: ["knee", "hip"], c: true }],
  ["45-Degree Back Extension (Glute Focus)", "glutes", "back-extension-glute", ["machine"], { avoid: ["back"] }],
  ["Reverse Hyper (Bench)", "glutes", "reverse-hyper", ["bw"], { needs: ["bench"], avoid: ["back"] }],

  // ── CALVES ──
  ["Standing Dumbbell Calf Raise", "calves", "calf-raise", ["db", "kb"], { avoid: ["ankle"] }],
  ["Single-Leg Calf Raise", "calves", "calf-raise-single", ["bw", "db"], { avoid: ["ankle"] }],
  ["Seated Dumbbell Calf Raise", "calves", "calf-raise-seated", ["db"], { needs: ["bench"], avoid: ["ankle"] }],
  ["Machine Calf Raise", "calves", "calf-raise", ["machine"], { avoid: ["ankle"] }],
  ["Barbell Calf Raise", "calves", "calf-raise", ["bb"], { needs: ["rack"], avoid: ["ankle"] }],
  ["Pogo Hops", "calves", "pogo", ["bw"], { avoid: ["ankle", "jump", "knee"] }],

  // ── CORE ──
  ["Plank", "core", "anti-extension", ["bw"], { avoid: ["wrist"] }],
  ["Forearm Plank", "core", "anti-extension", ["bw"], {}],
  ["Dead Bug", "core", "dead-bug", ["bw", "db"], {}],
  ["Hollow Body Hold", "core", "hollow", ["bw"], { avoid: ["back", "hernia"] }],
  ["Barbell Rollout", "core", "rollout", ["bb"], { avoid: ["back", "shoulder", "hernia"] }],
  ["Crunch", "core", "flexion", ["bw"], { avoid: ["neck", "hernia"] }],
  ["Cable Crunch", "core", "flexion", ["cable"], { avoid: ["neck", "hernia", "back"] }],
  ["Bicycle Crunch", "core", "flexion-rotation", ["bw"], { avoid: ["neck", "hernia", "back"] }],
  ["V-Up", "core", "flexion-full", ["bw"], { avoid: ["back", "neck", "hernia"] }],
  ["Russian Twist", "core", "rotation", ["bw", "db", "kb"], { avoid: ["back"] }],
  ["Cable Woodchopper", "core", "rotation-chop", ["cable", "band"], { avoid: ["back"] }],
  ["Landmine Rotation", "core", "rotation-landmine", ["bb"], { needs: ["landmine"], avoid: ["back", "shoulder"] }],
  ["Pallof Press", "core", "anti-rotation", ["cable", "band"], {}],
  ["Bird Dog", "core", "bird-dog", ["bw"], { avoid: ["wrist"] }],
  ["Hanging Leg Raise", "core", "leg-raise-hanging", ["bw"], { needs: ["pullupbar"], avoid: ["shoulder", "hernia"] }],
  ["Lying Leg Raise", "core", "leg-raise", ["bw"], { avoid: ["back", "hernia"] }],
  ["Reverse Crunch", "core", "reverse-crunch", ["bw"], { avoid: ["hernia"] }],
  ["Side Plank", "core", "lateral", ["bw"], { avoid: ["shoulder"] }],
  ["Suitcase Carry", "core", "carry-single", ["db", "kb"], {}],
  ["Farmer's Carry", "core", "carry", ["db", "kb", "bb"], {}],
  ["Mountain Climber", "core", "mountain-climber", ["bw"], { avoid: ["wrist", "hip"] }],
  ["Plank Shoulder Tap", "core", "anti-rotation-plank", ["bw"], { avoid: ["wrist", "shoulder"] }],
  ["Dumbbell Side Bend", "core", "lateral-flexion", ["db", "kb"], { avoid: ["back"] }],
  ["Kneeling Ab Wheel (Band-Assisted)", "core", "rollout", ["band"], { avoid: ["back", "shoulder", "hernia"] }],
];

// Movement families: exercises in the same family feel alike (every squat, every
// hinge, every curl...). A workout uses one per family whenever it can.
const FAMILIES = [
  [/^press-(flat|squeeze|decline)$/, "press-flat"], [/^press-incline$/, "press-incline"],
  [/^fly/, "fly"], [/^pushup/, "pushup"], [/^dip/, "dip"],
  [/^vertical-pull/, "vertical-pull"], [/^row-inverted-underhand$/, "row"], [/^row/, "row"],
  [/^upper-back/, "upper-back"], [/^(back-extension|reverse-hyper)/, "back-extension"],
  [/^(overhead-press|press-unilateral|press-landmine|handstand)/, "overhead-press"],
  [/^lateral-raise/, "lateral-raise"], [/^rear-delt/, "rear-delt"], [/^(y-raise|scaption)$/, "y-raise"],
  [/^(curl|chin-hold)/, "curl"], [/^hammer-curl/, "hammer-curl"],
  [/^(close-press|close-pushup)$/, "close-press"], [/^(skull-crusher|tate-press|bw-extension)$/, "lying-extension"],
  [/^(squat-jump|jump|pogo)$/, "jump"], [/^(squat|isometric-squat)/, "squat"],
  [/^(split-squat|lunge|step-up)/, "single-leg"],
  [/^(hinge|deadlift|good-morning|swing)/, "hinge"], [/^(leg-curl|nordic)/, "leg-curl"],
  [/^(hip-thrust|frog-pump)/, "bridge"], [/^abduction/, "abduction"],
  [/^calf-raise/, "calf"],
  [/^anti-extension$/, "plank"], [/^(flexion|reverse-crunch)/, "crunch"], [/^rotation/, "rotation"],
  [/^anti-rotation/, "anti-rotation"], [/^leg-raise/, "leg-raise"], [/^(lateral|lateral-flexion)$/, "side-bend"],
  [/^carry/, "carry"],
];
export const familyOf = pattern => (FAMILIES.find(([re]) => re.test(pattern)) || [null, pattern])[1];

export const EXERCISES = RAW.map(([name, muscle, pattern, equip, o]) => ({
  name, muscle, pattern, family: familyOf(pattern), equip,
  needs: o.needs || [], avoid: o.avoid || [], compound: !!o.c,
}));

// ── INJURIES ─────────────────────────────────────────────────────────────────
// Maps whatever people type (profile chips or their own words) to injury flags.
export const INJURY_FLAGS = {
  knee:     { label: "knees",        words: ["knee", "acl", "mcl", "meniscus", "patell"] },
  back:     { label: "lower back",   words: ["back", "lumbar", "spine", "disc", "sciatica"] },
  shoulder: { label: "shoulder",     words: ["shoulder", "rotator", "labrum", "ac joint"] },
  wrist:    { label: "wrists",       words: ["wrist", "carpal"] },
  elbow:    { label: "elbows",       words: ["elbow", "tennis elbow", "golfer"] },
  hip:      { label: "hips",         words: ["hip"] },
  ankle:    { label: "ankles",       words: ["ankle", "achilles", "foot", "feet"] },
  neck:     { label: "neck",         words: ["neck", "cervical"] },
  overhead: { label: "overhead work", words: ["overhead", "no overhead"] },
  deadlift: { label: "deadlifts",    words: ["deadlift"] },
  jump:     { label: "jumping",      words: ["jump", "plyo", "impact"] },
  hernia:   { label: "hernia",       words: ["hernia", "surgery", "abdominal"] },
};
// A shoulder injury rules out overhead work too.
const IMPLIES = { shoulder: ["overhead"], knee: ["jump"], ankle: ["jump"] };

export function injuryFlags(injuries) {
  const list = (Array.isArray(injuries) ? injuries : String(injuries || "").split(","))
    .map(s => String(s).toLowerCase().trim()).filter(Boolean);
  const flags = new Set();
  for (const text of list) {
    if (/^(none|no injuries|n\/a)$/.test(text)) continue;
    for (const [flag, { words }] of Object.entries(INJURY_FLAGS)) {
      if (words.some(w => text.includes(w))) flags.add(flag);
    }
  }
  for (const f of [...flags]) for (const g of IMPLIES[f] || []) flags.add(g);
  return flags;
}

// ── EQUIPMENT ────────────────────────────────────────────────────────────────
const ALL_GEAR = ["bw", "db", "bb", "kb", "cable", "machine", "band", "bench", "rack", "pullupbar", "dip", "landmine", "box"];
const GEAR_WORDS = [
  ["bb", ["barbell", "olympic bar", "ez bar", "ez-bar", "6ft bar", "trap bar"]],
  ["db", ["dumbbell", "dumbell", "db "]],
  ["kb", ["kettlebell", "kettle bell"]],
  ["cable", ["cable", "pulley", "functional trainer"]],
  ["machine", ["machine", "leg press", "lat pulldown", "pec deck", "smith", "leg curl", "leg extension", "hack squat"]],
  ["band", ["band"]],
  ["bench", ["bench"]],
  ["rack", ["rack", "squat stand", "power cage", "cage"]],
  ["pullupbar", ["pull-up", "pullup", "pull up", "chin-up", "chinup", "chin up"]],
  ["dip", ["dip"]],
  ["landmine", ["landmine"]],
  ["box", ["box", "step", "platform"]],
];

// What gear a location has. presetId: home | commercial | travel | bodyweight | custom | saved_N
export function availableGear(presetId, equipmentText) {
  if (presetId === "commercial") return new Set(ALL_GEAR);
  if (presetId === "bodyweight") return new Set(["bw"]);
  if (presetId === "travel") return new Set(["bw", "db", "bench"]);
  const text = ` ${String(equipmentText || "").toLowerCase()} `;
  const gear = new Set(["bw"]);
  for (const [g, words] of GEAR_WORDS) if (words.some(w => text.includes(w))) gear.add(g);
  if (gear.has("machine")) gear.add("cable"); // a gym with machines nearly always has cables
  return gear;
}

// Equipment styles people can pick for one workout.
export const EQUIPMENT_STYLES = [
  { id: "any",      label: "Everything",        icon: "🧰", gear: null },
  { id: "bw",       label: "Bodyweight",        icon: "🤸", gear: ["bw"] },
  { id: "db",       label: "Dumbbells",         icon: "💪", gear: ["db"] },
  { id: "bb",       label: "Barbell",           icon: "🏋️‍♂️", gear: ["bb"] },
  { id: "kb",       label: "Kettlebell",        icon: "🔔", gear: ["kb"] },
  { id: "machines", label: "Machines & cables", icon: "⚙️", gear: ["machine", "cable"] },
  { id: "band",     label: "Bands",             icon: "🎗️", gear: ["band"] },
];
export const stylesFor = gear => EQUIPMENT_STYLES.filter(s => !s.gear || s.gear.some(g => gear.has(g)));

// ── TARGETS ──────────────────────────────────────────────────────────────────
// What people pick in the coach (several allowed), and what each covers.
export const TARGETS = [
  { id: "chest",     label: "Chest",     icon: "🫁", muscles: ["chest"] },
  { id: "back",      label: "Back",      icon: "🔺", muscles: ["back"] },
  { id: "shoulders", label: "Shoulders", icon: "🏹", muscles: ["shoulders"] },
  { id: "biceps",    label: "Biceps",    icon: "💪", muscles: ["biceps"] },
  { id: "triceps",   label: "Triceps",   icon: "🦾", muscles: ["triceps"] },
  { id: "legs",      label: "Legs",      icon: "🦵", muscles: ["quads", "hamstrings", "calves"] },
  { id: "glutes",    label: "Glutes",    icon: "🍑", muscles: ["glutes"] },
  { id: "core",      label: "Core",      icon: "🎯", muscles: ["core"] },
];
const ALL_TARGETS = TARGETS.map(t => t.id);
export const QUICK_PICKS = [
  { id: "upper",    label: "Upper body", targets: ["chest", "back", "shoulders", "biceps", "triceps"] },
  { id: "lower",    label: "Lower body", targets: ["legs", "glutes"] },
  { id: "push",     label: "Push",       targets: ["chest", "shoulders", "triceps"] },
  { id: "pull",     label: "Pull",       targets: ["back", "biceps"] },
  { id: "arms",     label: "Arms",       targets: ["biceps", "triceps"] },
  { id: "fullbody", label: "Full body",  targets: ALL_TARGETS },
];
const NAMED = {
  upper: "Upper Body", lower: "Lower Body", push: "Push", pull: "Pull", arms: "Arms", fullbody: "Full Body",
};

// The id saved with a workout: a quick-pick id when the selection matches one,
// a single target id, or several joined with "+" (e.g. "biceps+shoulders").
export function muscleKey(targets) {
  const sorted = [...new Set(targets)].sort();
  if (!sorted.length) return null;
  const qp = QUICK_PICKS.find(q => [...q.targets].sort().join("+") === sorted.join("+"));
  if (qp) return qp.id;
  return sorted.join("+");
}
// The reverse, including ids saved by older versions of the app.
export function targetsFromKey(key) {
  if (!key) return [];
  const qp = QUICK_PICKS.find(q => q.id === key);
  if (qp) return [...qp.targets];
  return String(key).split("+").filter(t => ALL_TARGETS.includes(t));
}
export function muscleKeyLabel(key) {
  if (!key) return null;
  if (NAMED[key]) return NAMED[key];
  const ts = targetsFromKey(key);
  if (!ts.length) return String(key).charAt(0).toUpperCase() + String(key).slice(1);
  const labels = ts.map(t => TARGETS.find(x => x.id === t).label);
  return labels.length <= 2 ? labels.join(" & ") : `${labels.slice(0, -1).join(", ")} & ${labels.at(-1)}`;
}
export function muscleKeyIcon(key) {
  if (key === "fullbody") return "⚡";
  if (key === "upper" || key === "push" || key === "pull" || key === "arms") return "💪";
  if (key === "lower") return "🦵";
  const ts = targetsFromKey(key);
  return ts.length === 1 ? TARGETS.find(x => x.id === ts[0]).icon : "💪";
}
