// ── MUSCLE ANATOMY DIAGRAM ───────────────────────────────────────────────────
// Front + back body silhouette with muscle groups as SVG paths.
// Primary muscle = bright orange. Secondary = dim highlight.

export const MUSCLE_MAP = {
  // Maps primaryMuscle string → {front:[ids], back:[ids], secondary:[ids]}
  chest:        {front:["chest"],       back:[],              secondary:["front-delt","triceps"]},
  pecs:         {front:["chest"],       back:[],              secondary:["front-delt","triceps"]},
  back:         {front:[],              back:["lats","traps"], secondary:["biceps","rear-delt"]},
  lats:         {front:[],              back:["lats"],         secondary:["biceps","rear-delt"]},
  traps:        {front:[],              back:["traps"],        secondary:["rear-delt"]},
  shoulders:    {front:["front-delt"],  back:["rear-delt"],    secondary:["traps","chest"]},
  delts:        {front:["front-delt"],  back:["rear-delt"],    secondary:["traps"]},
  biceps:       {front:["biceps"],      back:[],              secondary:["forearms"]},
  triceps:      {front:[],              back:["triceps"],      secondary:[]},
  arms:         {front:["biceps"],      back:["triceps"],      secondary:["forearms"]},
  forearms:     {front:["forearms"],    back:[],              secondary:[]},
  abs:          {front:["abs"],         back:[],              secondary:["obliques"]},
  core:         {front:["abs","obliques"],back:[],            secondary:[]},
  obliques:     {front:["obliques"],    back:[],              secondary:["abs"]},
  quads:        {front:["quads"],       back:[],              secondary:["glutes"]},
  hamstrings:   {front:[],             back:["hamstrings"],   secondary:["glutes","calves"]},
  glutes:       {front:[],             back:["glutes"],       secondary:["hamstrings"]},
  calves:       {front:[],             back:["calves"],       secondary:[]},
  legs:         {front:["quads"],      back:["hamstrings","glutes"], secondary:["calves"]},
  "full body":  {front:["chest","abs","quads","biceps"],back:["lats","glutes","hamstrings"],secondary:[]},
  fullbody:     {front:["chest","abs","quads","biceps"],back:["lats","glutes","hamstrings"],secondary:[]},
};

export function getMuscleMapping(primaryMuscle){
  if(!primaryMuscle)return {front:[],back:[],secondary:[]};
  // Normalize — AI returns many variations like "Quadriceps", "Glutes/Hamstrings", "Quads, Glutes"
  const raw=primaryMuscle.toLowerCase().trim();
  // Take first muscle if comma or slash separated
  const first=raw.split(/[,/]/)[0].trim();
  // Map common AI variations to our MUSCLE_MAP keys
  const normalize={
    "quadriceps":"quads","quad":"quads","quads":"quads",
    "hamstring":"hamstrings","hamstrings":"hamstrings",
    "glute":"glutes","glutes":"glutes","gluteus":"glutes",
    "calf":"calves","calves":"calves",
    "pec":"chest","pecs":"chest","pectoral":"chest","chest":"chest",
    "lat":"lats","lats":"lats","latissimus":"lats",
    "trap":"traps","traps":"traps","trapezius":"traps",
    "delt":"shoulders","delts":"shoulders","deltoid":"shoulders","shoulder":"shoulders","shoulders":"shoulders",
    "bicep":"biceps","biceps":"biceps",
    "tricep":"triceps","triceps":"triceps",
    "ab":"abs","abs":"abs","abdominal":"abs","core":"core",
    "oblique":"obliques","obliques":"obliques",
    "forearm":"forearms","forearms":"forearms",
    "rear delt":"rear-delt","rear delts":"rear-delt","posterior delt":"rear-delt",
    "front delt":"front-delt","anterior delt":"front-delt",
    "back":"lats","upper back":"traps","lower back":"lats",
    "arm":"arms","arms":"arms",
    "leg":"legs","legs":"legs",
    "full body":"fullbody","fullbody":"fullbody","total body":"fullbody",
  };
  const key=normalize[first]||normalize[raw]||first;
  return MUSCLE_MAP[key]||{front:[],back:[],secondary:[]};
}
