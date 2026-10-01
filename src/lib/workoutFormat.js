// Per-type field definitions
export const LIFT_FOCUS = ["Legs","Arms","Chest","Back","Shoulders","Full Body","Core"];

export const WORKOUT_FIELDS = {
  lift:   [{key:"focus",label:"Focus",placeholder:"e.g. Legs",text:true,isSelect:true,options:LIFT_FOCUS},{key:"rounds",label:"Rounds",placeholder:"e.g. 3",text:true},{key:"sets",label:"Sets",placeholder:"e.g. 4-6",text:true},{key:"reps",label:"Reps",placeholder:"e.g. 10-12",text:true},{key:"weight",label:"Weight (lbs)",placeholder:"e.g. 135-185",text:true},{key:"duration",label:"Duration (min)",placeholder:"e.g. 60"}],
  run:    [{key:"distance",label:"Distance (mi)",placeholder:"e.g. 3.1"},{key:"duration",label:"Duration (min)",placeholder:"e.g. 30"}],
  bike:   [{key:"distance",label:"Distance (mi)",placeholder:"e.g. 10"},{key:"duration",label:"Duration (min)",placeholder:"e.g. 45"}],
  hiit:   [{key:"rounds",label:"Rounds",placeholder:"e.g. 5",text:true},{key:"duration",label:"Duration (min)",placeholder:"e.g. 20"}],
  cardio: [{key:"duration",label:"Duration (min)",placeholder:"e.g. 30"},{key:"distance",label:"Distance (mi)",placeholder:"e.g. 2"}],
  walk:   [{key:"distance",label:"Distance (mi)",placeholder:"e.g. 1.5"},{key:"duration",label:"Duration (min)",placeholder:"e.g. 25"}],
  other:  [{key:"rounds",label:"Rounds",placeholder:"e.g. 3",text:true},{key:"duration",label:"Duration (min)",placeholder:"e.g. 45"}],
};

export function formatWorkoutSummary(workouts, details){
  // Returns array of {label, detail} for stacked display
  return workouts.map(w=>{
    const d=details[w.id]||{};
    const parts=[];
    if(d.focus) parts.push(d.focus);
    if(d.distance) parts.push(`${d.distance} mi`);
    if(d.rounds) parts.push(`${d.rounds} rounds`);
    if(d.sets&&d.reps) parts.push(`${d.sets} sets × ${d.reps} reps`);
    else if(d.sets) parts.push(`${d.sets} sets`);
    else if(d.reps) parts.push(`${d.reps} reps`);
    if(d.weight) parts.push(`${d.weight} lbs`);
    if(d.duration) parts.push(`${d.duration} min`);
    return {label:w.label, detail:parts.join(" · ")};
  });
}
