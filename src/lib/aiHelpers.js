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
