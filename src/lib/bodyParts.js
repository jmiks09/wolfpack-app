// Maps app muscles to parts of the body drawing (react-muscle-highlighter).

// App muscle → parts of the drawing.
export const MUSCLE_PARTS = {
  chest: ["chest"],
  back: ["upper-back", "trapezius", "lower-back"],
  shoulders: ["deltoids"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  quads: ["quadriceps", "adductors"],
  hamstrings: ["hamstring"],
  glutes: ["gluteal"],
  calves: ["calves", "tibialis"],
  core: ["abs", "obliques"],
  forearms: ["forearm"],
};
// Drawing part → app muscle.
export const PART_TO_MUSCLE = Object.fromEntries(
  Object.entries(MUSCLE_PARTS).flatMap(([m, parts]) => parts.map(p => [p, m]))
);
export const DECOR = ["head", "hair", "neck", "hands", "feet", "knees", "ankles"];

// Free-text muscle names (e.g. from older workouts: "Rear delts", "Lats") → app muscles.
const WORDS = [
  ["chest", ["chest", "pec"]], ["back", ["back", "lat", "trap", "rhomboid"]],
  ["shoulders", ["shoulder", "delt"]], ["forearms", ["forearm", "grip", "wrist"]], ["biceps", ["bicep", "brachi"]], ["triceps", ["tricep"]],
  ["quads", ["quad", "thigh", "leg"]], ["hamstrings", ["hamstring"]], ["glutes", ["glute", "hip", "butt"]],
  ["calves", ["calf", "calves", "tibialis"]], ["core", ["core", "abs", "abdom", "oblique"]],
];
export function musclesFromLabel(label) {
  const l = String(label || "").toLowerCase();
  if (!l) return [];
  if (l.includes("full")) return Object.keys(MUSCLE_PARTS);
  if (l.includes("leg")) return ["quads", "hamstrings", "calves"];
  return WORDS.filter(([, ws]) => ws.some(w => l.includes(w))).map(([m]) => m);
}
