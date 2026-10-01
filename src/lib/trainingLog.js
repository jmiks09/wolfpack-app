import { fsGet, fsSet } from "../firebase";
import { EFFORT_RATINGS } from "./aiConfig";
import { todayStr } from "./dates";

// ── TRAINING LOG HELPERS ────────────────────────────────────────────────────
// Key: wolfpack/training_log  →  {users: {userName: {exercises: {exerciseName: {lastWeight, lastReps, effortHistory: [{date,weight,reps,effort}]}}}}}

export async function saveTrainingLog(userName, exercises, effortRating){
  try{
    const existing=await fsGet("wolfpack/training_log")||{users:{}};
    const userLog=existing.users?.[userName]?.exercises||{};
    const today=todayStr();
    exercises.forEach(ex=>{
      if(!ex.name)return;
      const prev=userLog[ex.name]||{effortHistory:[]};
      const entry={date:today,weight:ex.weightUsed||null,reps:ex.reps||null,effort:effortRating};
      userLog[ex.name]={
        lastWeight:ex.weightUsed||prev.lastWeight||null,
        lastReps:ex.reps||prev.lastReps||null,
        lastEffort:effortRating,
        lastDate:today,
        effortHistory:[...(prev.effortHistory||[]).slice(-9),entry], // keep last 10
      };
    });
    await fsSet("wolfpack/training_log",{users:{...(existing.users||{}),[userName]:{exercises:userLog}}});
  }catch(e){console.error("Training log save error:",e);}
}

export async function getTrainingLog(userName){
  try{
    const data=await fsGet("wolfpack/training_log");
    return data?.users?.[userName]?.exercises||{};
  }catch{return {};}
}

// Build a prior performance string for the AI prompt
export function buildPriorPerformanceString(trainingLog, muscleGroup){
  if(!trainingLog||Object.keys(trainingLog).length===0) return "No prior weight data yet.";
  const entries=Object.entries(trainingLog)
    .filter(([,v])=>v.lastDate) // only exercises with history
    .slice(0,8) // cap at 8 to keep prompt short
    .map(([name,v])=>{
      const effort=EFFORT_RATINGS.find(r=>r.id===v.lastEffort);
      const effortNote=effort?` — rated ${effort.label} (${effort.advice})`:"";
      const weightNote=v.lastWeight?` @ ${v.lastWeight} lbs`:"";
      return `${name}${weightNote}${v.lastReps?` × ${v.lastReps}`:""}${effortNote}`;
    });
  return entries.length>0?entries.join("\n"):"No prior weight data yet.";
}
