import { AI_PRESET_DESCRIPTIONS, HOME_GYM_DEFAULT } from "./aiConfig";
import { localDateStr } from "./dates";

// ── REGEN HELPERS ────────────────────────────────────────────────────────────
export function getRegenCount(userName){
  try{
    const today=new Date().toISOString().slice(0,10);
    const raw=localStorage.getItem(`wp_regen_${userName}_${today}`);
    return raw?parseInt(raw,10):0;
  }catch{return 0;}
}

export function bumpRegenCount(userName){
  try{
    const today=new Date().toISOString().slice(0,10);
    const key=`wp_regen_${userName}_${today}`;
    const next=(getRegenCount(userName))+1;
    localStorage.setItem(key,String(next));
    return next;
  }catch{return 0;}
}

// ── RESETTING THE COACH'S DAILY LIMIT ────────────────────────────────────────
// Two counters: the regen counter on each person's phone (5/day), and the
// server's count of generated workouts (wolfpack/ai_usage_<name>_<day>).
// An admin reset zeroes the server count and leaves a note in
// wolfpack/coach_resets that the person's phone picks up next time the coach opens.
export async function resetCoachLimit(fsSet, name){
  // The server dates its counter with a fixed UTC-5 offset; also cover UTC-6 (CST)
  const day=off=>new Date(Date.now()+off*3600e3).toISOString().slice(0,10);
  let serverOk=true;
  for(const d of new Set([day(-5),day(-6)])){
    try{await fsSet(`wolfpack/ai_usage_${name}_${d}`,{workouts:0});}catch(e){console.warn("server limit reset failed",e);serverOk=false;}
  }
  await fsSet("wolfpack/coach_resets",{users:{[name]:Date.now()}});
  clearRegenCount(name);
  return serverOk;
}
export function clearRegenCount(name){
  try{Object.keys(localStorage).filter(k=>k.startsWith(`wp_regen_${name}_`)).forEach(k=>localStorage.removeItem(k));}catch{/* ignore */}
}
// On this phone: apply an admin reset we haven't seen yet. Returns true if applied.
export function applyCoachReset(resets, name){
  const at=Number(resets?.users?.[name])||0;
  try{
    if(at>(Number(localStorage.getItem(`wp_regen_reset_${name}`))||0)){
      clearRegenCount(name);
      localStorage.setItem(`wp_regen_reset_${name}`,String(at));
      return true;
    }
  }catch{/* ignore */}
  return false;
}

// ── WORKOUT GENERATION HELPERS ───────────────────────────────────────────────
// Get the last WOLFMODE workout for a specific muscle group from history
export function getLastWorkoutForMuscle(history, userName, muscleGroupId){
  for(let i=1;i<=30;i++){
    const d=new Date();d.setDate(d.getDate()-i);
    const ds=localDateStr(d);
    const entry=history[ds]?.[userName];
    if(entry?.done&&entry?.wolfmodeSession){
      const sessionMg=entry.wolfmodeSession.muscleGroup;
      if(sessionMg===muscleGroupId||sessionMg===muscleGroupId?.toLowerCase()){
        return{
          date:ds,
          exercises:entry.wolfmodeSession.exercises||[],
          effortRating:entry.wolfmodeSession.effortRating||null,
          muscleGroup:sessionMg,
          daysAgo:i,
        };
      }
    }
  }
  return null;
}

// Build equipment string for AI prompt
export function buildEquipmentString(presetId, customEquipment, packHomeGym){
  if(presetId==="custom"&&customEquipment) return customEquipment;
  if(presetId==="home"){
    const items=Array.isArray(packHomeGym)&&packHomeGym.length>0?packHomeGym:HOME_GYM_DEFAULT;
    return `Garage gym equipment: ${items.join(", ")}.`;
  }
  if(presetId?.startsWith("saved_")) return customEquipment||"Custom equipment.";
  return AI_PRESET_DESCRIPTIONS[presetId]||AI_PRESET_DESCRIPTIONS.bodyweight;
}

// Build recent history string for AI context (last 3 days)
export function getRecentHistoryString(history, userName){
  const days=[];
  for(let i=1;i<=7;i++){
    const d=new Date();d.setDate(d.getDate()-i);
    const ds=localDateStr(d);
    const entry=history[ds]?.[userName];
    if(entry?.done){
      const label=entry.workoutLabel||entry.wolfmodeSession?.muscleGroup||"workout";
      days.push(`${ds}: ${label}`);
      if(days.length>=3)break;
    }
  }
  return days.length>0?days.join(" | "):"No recent history";
}
