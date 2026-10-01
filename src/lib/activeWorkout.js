import { centralDateStr } from "./dates";

// Save an active workout plan to localStorage
// targetDate: "today" | "tomorrow"
export function saveActiveWorkout(userName, workout, muscleGroup, targetDate="today"){
  try{
    const date=targetDate==="tomorrow"?centralDateStr(1):centralDateStr(0);
    const key=`wp_active_${userName}_${date}`;
    const data={workout,muscleGroup,date,savedAt:Date.now(),completed:false};
    localStorage.setItem(key,JSON.stringify(data));
    return true;
  }catch{return false;}
}

// Get active workout for a specific date
export function getActiveWorkout(userName, targetDate="today"){
  try{
    const date=targetDate==="tomorrow"?centralDateStr(1):centralDateStr(0);
    const key=`wp_active_${userName}_${date}`;
    const raw=localStorage.getItem(key);
    if(!raw)return null;
    const data=JSON.parse(raw);
    // Auto-clear if the date has passed
    if(data.date<centralDateStr(0)){
      localStorage.removeItem(key);
      return null;
    }
    return data;
  }catch{return null;}
}

// Mark active workout as completed
export function markActiveWorkoutComplete(userName, targetDate="today"){
  try{
    const date=targetDate==="tomorrow"?centralDateStr(1):centralDateStr(0);
    const key=`wp_active_${userName}_${date}`;
    const raw=localStorage.getItem(key);
    if(!raw)return;
    const data=JSON.parse(raw);
    data.completed=true;
    localStorage.setItem(key,JSON.stringify(data));
  }catch{}
}

// Dismiss (delete) active workout
export function dismissActiveWorkout(userName, targetDate="today"){
  try{
    const date=targetDate==="tomorrow"?centralDateStr(1):centralDateStr(0);
    const key=`wp_active_${userName}_${date}`;
    localStorage.removeItem(key);
  }catch{}
}
