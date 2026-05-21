import { useState, useEffect, useRef, useCallback } from "react";
import { fsGet, fsSet, fsDelete, fsListen, requestNotifPermission, onForegroundMessage, aiGenerateWorkout, aiGenerateFormCues, aiGenerateNutritionPlan } from "./firebase";

const INVITE_CODE = "WOLF2026";
const WORKOUT_TYPES = [
  {id:"lift",icon:"🏋️",label:"Lifting"},{id:"run",icon:"🏃",label:"Running"},
  {id:"bike",icon:"🚴",label:"Cycling"},{id:"hiit",icon:"⚡",label:"HIIT"},
  {id:"cardio",icon:"❤️‍🔥",label:"Mixed Cardio"},{id:"walk",icon:"🚶",label:"Walking"},
  {id:"other",icon:"💪",label:"Other"},
];
const QUOTES = [
  "Your only competition is who you were yesterday.",
  "The pain you feel today is the strength you feel tomorrow.",
  "Don't stop when you're tired. Stop when you're done.",
  "One workout at a time. One day at a time.",
  "Earn it.", "Make yourself proud.",
  "The wolf on the hill is never as hungry as the wolf climbing it.",
  "Train insane or remain the same.", "Sweat is just fat crying.",
  "Success starts with self-discipline.",
  "Wake up. Work out. Look hot. Kick ass.",
  "Push yourself because no one else is going to do it for you.",
  "Motivation gets you started. Habit keeps you going.",
  "You don't have to be extreme. Just consistent.",
  "Results happen over time, not overnight. Work hard, stay consistent.",
  "The clock is ticking. Are you becoming the person you want to be?",
  "Fall in love with the process and the results will come.",
  "It never gets easier. You just get better.",
  "Showing up is half the battle.",
  "Be stronger than your excuses.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "The difference between try and triumph is a little umph.",
  "Pain is weakness leaving the body.",
  "If it doesn't challenge you, it doesn't change you.",
  "You are one workout away from a good mood.",
  "Don't wish for it. Work for it.",
  "Suffer the pain of discipline or suffer the pain of regret.",
  "Champions train. Legends push through pain.",
  "Mental strength is what separates the good from the great.",
  "Doubt kills more dreams than failure ever will.",
  "The mind gives up before the body does.",
  "Strong mind. Strong body. Strong life.",
  "Embrace the grind. The grind builds character.",
  "Do something today your future self will thank you for.",
  "What hurts today makes you stronger tomorrow.",
  "Small steps every day lead to big changes over time.",
  "You don't need a new year. You just need a new day.",
  "Consistency is the bridge between goals and achievement.",
  "One more rep. One more set. One more day.",
  "Discipline is choosing between what you want now and what you want most.",
  "The only bad workout is the one that didn't happen.",
  "Progress, not perfection.",
  "Show up even when you don't feel like it. Especially then.",
  "You don't always have to feel like it. You just have to do it.",
  "Every day you train, you bank a deposit into your future.",
  "Grind when no one is watching.",
  "The last few reps are where champions are made.",
  "It's not about being the best. It's about being better than yesterday.",
  "Stop stopping. Start starting.",
  "Ninety percent of success is just showing up.",
  "Alone we are strong. Together we are unstoppable.",
  "Iron sharpens iron.",
  "Surround yourself with people who push you.",
  "A wolf doesn't lose sleep over the opinions of sheep.",
  "The pack is only as strong as its weakest link. Be the strongest link.",
  "Find your tribe. Lift each other up.",
  "When the pack runs together, no one gets left behind.",
  "Accountability is the glue that holds goals together.",
  "Hard work beats talent when talent doesn't work hard.",
  "Celebrate others' wins. Compete with yourself.",
  "Your body is your most priceless possession. Take care of it.",
  "Fitness is not a destination. It's a way of life.",
  "Take care of your body. It's the only place you have to live.",
  "Sore today. Strong tomorrow.",
  "Strive for progress, not perfection.",
  "No shortcuts. No excuses. No regrets.",
  "Every rep counts. Every meal matters. Every choice adds up.",
  "Lift heavy. Eat clean. Sleep well. Repeat.",
  "The gym is my therapy.",
  "Train like a beast. Look like a beauty.",
  "Strong is the new everything.",
  "Your only limit is you.",
  "Eat well. Train hard. Think positive.",
  "Fitness is not about being better than someone else. It's about being better than you used to be.",
  "No pain, no gain. Embrace it.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Hustle for that muscle.",
  "The harder you work, the luckier you get.",
  "Outwork yesterday.",
  "Champions are made from something deep inside — a desire, a dream, a vision.",
  "Work hard in silence. Let success make the noise.",
  "You didn't come this far to only come this far.",
  "Success is what comes after you stop making excuses.",
  "Keep going. Your future self is counting on you.",
  "Greatness is earned, never given.",
  "Be the hardest worker in the room.",
  "Show up. Suit up. Never give up.",
  "The grind never stops.",
  "You have to be odd to be number one.",
  "Just one more.",
  "Do the work.",
  "Stay the course.",
  "Get after it.",
  "No days off.",
  "Be relentless.",
  "Earn your rest.",
  "Built not born.",
  "Rise and grind.",
  "Stay hungry.",
  "Run the day or the day runs you.",
  "First in. Last out.",
  "Beast mode activated.",
  "Make it count.",
  "Attack the day.",
  "Your habits will determine your future.",
  "You are what you repeatedly do.",
  "The secret of getting ahead is getting started.",
  "Energy and persistence conquer all things.",
  "The body achieves what the mind believes.",
  "Good things come to those who sweat.",
  "Strength does not come from the body. It comes from the will.",
  "You have to expect things of yourself before you can do them.",
  "There are no shortcuts to any place worth going.",
  "The successful warrior is the average man with laser-like focus.",
];
const BADGES = [
  {id:"first_blood",icon:"🩸",label:"First Blood",desc:"Log your first workout"},
  {id:"week_warrior",icon:"⚔️",label:"Week Warrior",desc:"7-day streak"},
  {id:"consistent",icon:"🔥",label:"On Fire",desc:"3-week streak"},
  {id:"monthly",icon:"📅",label:"Iron Month",desc:"30-day streak"},
  {id:"centurion",icon:"💯",label:"Centurion",desc:"100 workouts logged"},
  {id:"social",icon:"🐺",label:"Pack Leader",desc:"Post 10 times in feed"},
  {id:"challenger",icon:"⚡",label:"Challenger",desc:"Complete a challenge"},
  {id:"gym_rat",icon:"🏋️",label:"Gym Rat",desc:"Book gym 20 times"},
  {id:"penalty_free",icon:"🛡️",label:"Clean Slate",desc:"Win a penalty challenge"},
];
const WOLF_AVATARS = ["🐺","🦊","🦁","🐻","🐯","🦝","🐸","🦅","🦈","🐲","🦄","🦋"];
// Half-hour slots 6 AM - 8 PM
const GYM_HOURS = Array.from({length:28},(_,i)=>{
  const totalMins=6*60+i*30;
  const h=Math.floor(totalMins/60);
  const m=totalMins%60;
  const label=m===0?`${h===12?12:h%12}:00 ${h<12?"AM":"PM"}`:`${h===12?12:h%12}:30 ${h<12?"AM":"PM"}`;
  return {label,h,m};
});
const GYM_DURATIONS=["30 min","1 hr","1.5 hrs","2 hrs"];
const GYM_DURATION_MINS=[30,60,90,120];
const GYM_CLOSE_HOUR = 20;
const isGymOpen = () => { const h=new Date().getHours(); return h>=6&&h<GYM_CLOSE_HOUR; };
// Check if a slot overlaps with a booked range
const slotOverlaps=(slotH,slotM,booking)=>{
  const slotStart=slotH*60+slotM;
  const slotEnd=slotStart+30;
  const bookStart=booking.startH*60+booking.startM;
  const bookEnd=bookStart+booking.durationMins;
  return slotStart<bookEnd&&slotEnd>bookStart;
};
const REACTIONS = ["💪","🔥","👑","🐺","⚡","🙌"];
const MILESTONES = [7,14,30,60,100]; // streak days that trigger auto-post
const SESSION_MILESTONES = [50,100,200,500]; // session counts that trigger auto-post

// ── AI Trainer constants ────────────────────────────────────────────────────
const AI_GOALS = [
  {id:"glutes",   label:"Grow Glutes",        icon:"🍑"},
  {id:"upper",    label:"Build Upper Body",   icon:"💪"},
  {id:"legs",     label:"Build Legs",         icon:"🦵"},
  {id:"back",     label:"Build Back",         icon:"🔙"},
  {id:"core",     label:"Core & Abs",         icon:"🎯"},
  {id:"fatloss",  label:"Lose Fat",           icon:"🔥"},
  {id:"strength", label:"Get Stronger",       icon:"⚡"},
  {id:"general",  label:"General Fitness",    icon:"🏋️"},
];
const AI_EXPERIENCE = [
  {id:"beginner",    label:"Beginner",     desc:"New to lifting (0-6 months)"},
  {id:"intermediate",label:"Intermediate", desc:"Consistent for 6+ months"},
  {id:"advanced",    label:"Advanced",     desc:"2+ years, knows form"},
];
const AI_INJURIES = [
  "Bad knees","Bad shoulder","Lower back issues","Bad wrists","Bad elbows",
  "No overhead pressing","No deadlifts","No jumping","Hernia","Recovering from surgery",
];
// Default equipment for the home gym (admin-editable per pack)
const HOME_GYM_DEFAULT = [
  "Rogue 45 lb Olympic barbell",
  "CAP 6ft bar with Olympic sleeve adapters",
  "Plates: 2×45 lb, 2×25 lb, 4×10 lb (160 lbs total, max loaded barbell 205 lbs)",
  "Adjustable bench (flat/incline/decline)",
  "Dumbbells: pairs up to 25 lbs",
  "Squat rack",
  "Landmine attachment",
  "Plyo boxes: 12 inch and 24 inch",
];
const AI_EQUIPMENT_PRESETS = [
  {id:"home",       icon:"🏠", label:"Garage Gym",    desc:"WOLFPACK home setup"},
  {id:"commercial", icon:"🏋️", label:"Commercial Gym",desc:"Full gym access"},
  {id:"travel",     icon:"✈️", label:"Travel/Hotel",  desc:"Limited dumbbells, basic"},
  {id:"bodyweight", icon:"🛋️", label:"Bodyweight",    desc:"No equipment at all"},
];
const AI_PRESET_DESCRIPTIONS = {
  home:"", // filled from Firestore pack settings — falls back to HOME_GYM_DEFAULT
  commercial:"Full commercial gym: barbells up to 45lb Olympic, plates to 100s of lbs, full dumbbell rack to 100+ lbs, adjustable benches, squat racks, leg press, hack squat, lat pulldown, cable machine, Smith machine, leg curl/extension, calf raise, hyperextension bench, dip station, pull-up bar, kettlebells, resistance bands.",
  travel:"Hotel/travel gym: dumbbells typically up to 50 lbs, treadmill, sometimes a cable machine or adjustable bench. Assume no barbell and no squat rack.",
  bodyweight:"No equipment whatsoever. Bodyweight exercises only.",
};
const MAX_DAILY_REGENS = 5;

// ── Muscle groups for WOLFMODE picker ───────────────────────────────────────
const AI_MUSCLE_GROUPS = [
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
const AI_SECONDARY_GOALS = [
  {id:"none",      label:"None",                icon:"—",  desc:"Just my primary goal"},
  {id:"fatloss",   label:"Also losing fat",     icon:"🔥", desc:"More circuits, shorter rest, cardio finishers"},
  {id:"strength",  label:"Also getting stronger",icon:"⚡", desc:"Heavier compounds, longer rest, lower reps"},
  {id:"athletic",  label:"Balanced & athletic", icon:"🏃", desc:"Mix of strength, power, and conditioning"},
  {id:"endurance", label:"Build endurance",     icon:"💨", desc:"Higher reps, less rest, muscular stamina"},
];

// Effort ratings for post-workout check-in
const EFFORT_RATINGS = [
  {id:"easy",    emoji:"😴", label:"Too Easy",  color:"#3498db", advice:"bump weights next time"},
  {id:"normal",  emoji:"💪", label:"Just Right",color:"#2ecc71", advice:"keep it up"},
  {id:"hard",    emoji:"🔥", label:"Tough",     color:"#e67e22", advice:"hold weights next session"},
  {id:"wrecked", emoji:"💀", label:"Wrecked",   color:"#e74c3c", advice:"reduce volume next time"},
];

// ── AI Coach (Nutrition + Supplements) constants ────────────────────────────
const AI_BULK_CUT = [
  {id:"bulk",     label:"Bulk",     icon:"📈", desc:"Build muscle, eat in surplus"},
  {id:"cut",      label:"Cut",      icon:"📉", desc:"Lose fat, eat in deficit"},
  {id:"maintain", label:"Maintain", icon:"⚖️", desc:"Stay where I am"},
];
const AI_ACTIVITY_LEVELS = [
  {id:"sedentary",label:"Sedentary",     desc:"Desk job, no exercise"},
  {id:"light",    label:"Lightly Active",desc:"Light exercise 1-3 days/wk"},
  {id:"moderate", label:"Moderate",      desc:"Exercise 3-5 days/wk"},
  {id:"very",     label:"Very Active",   desc:"Hard exercise 6-7 days/wk"},
];
const AI_DIETS = [
  "Vegetarian","Vegan","Gluten-free","Lactose-free","Pescatarian","Keto/Low-carb","No restrictions",
];
const AI_GENDERS = [
  {id:"male",   label:"Male"},
  {id:"female", label:"Female"},
  {id:"na",     label:"Prefer not to say"},
];

const NAV=[{id:"pack",icon:"🐺",label:"PACK"},{id:"feed",icon:"💬",label:"FEED"},{id:"gym",icon:"🏋️",label:"GYM"},{id:"challenges",icon:"⚔️",label:"CHALLENGES"},{id:"stats",icon:"📊",label:"STATS"}];

const todayStr=()=>{
  const d=new Date();
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};
// Use local date string for any Date object (avoids UTC timezone shift)
const localDateStr=d=>{const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,"0");const day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`;};
const isWeekend=d=>{const x=new Date(d+"T00:00:00");return x.getDay()===0||x.getDay()===6;};
const DAY_NAMES=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const getRestDays=profile=>profile?.restDays||[0,6]; // default Sat/Sun
const isRestDay=(d,profile)=>{const x=new Date(d+"T00:00:00");return getRestDays(profile).includes(x.getDay());};
const next7Days=()=>Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return localDateStr(d);});
const fmtDate=d=>new Date(d+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
const fmtTime=ts=>new Date(ts).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
const getWeekStart=d=>{const x=new Date(d+"T00:00:00");x.setDate(x.getDate()-x.getDay());return localDateStr(x);};
const getDateRange=(s,e)=>{const dates=[];const sd=new Date(s+"T00:00:00"),ed=new Date(e+"T00:00:00");for(let d=new Date(sd);d<=ed;d.setDate(d.getDate()+1))dates.push(localDateStr(d));return dates;};
const getWeekdays=(s,e)=>getDateRange(s,e).filter(d=>!isWeekend(d));
// Get workout days for a member based on their personal rest days
const getWorkoutDays=(s,e,profile)=>getDateRange(s,e).filter(d=>!isRestDay(d,profile));
function getStreak(h,n,profile){
  let s=0;const b=new Date();const today=localDateStr(b);
  for(let i=0;i<365;i++){
    const d=new Date(b);d.setDate(b.getDate()-i);
    const k=localDateStr(d);
    // Always skip rest days
    if(isRestDay(k,profile))continue;
    // Skip today if not yet logged — don't penalize for current day
    if(k===today&&!h[k]?.[n]?.done)continue;
    // Count logged days
    if(h[k]?.[n]?.done){s++;}
    // Any past workout day that's missing breaks the streak
    else break;
  }
  return s;
}
function getTotalWorkouts(h,n){
  // Count total sessions — each workout type logged counts as 1 session
  return Object.values(h).reduce((sum,d)=>{
    if(!d?.[n]?.done)return sum;
    const sessions=d[n]?.workouts?.length||1; // multi-type = multiple sessions
    return sum+sessions;
  },0);
}
function getQuote(){
  // Rotate by day of year so it changes daily and uses the full quote list
  const now=new Date();
  const start=new Date(now.getFullYear(),0,0);
  const diff=now-start;
  const oneDay=1000*60*60*24;
  const dayOfYear=Math.floor(diff/oneDay);
  return QUOTES[dayOfYear%QUOTES.length];
}
function calcPenalties(c,h,profiles){
  if(!c.penaltyAmt||c.penaltyAmt<=0||!c.startDate||!c.endDate)return{};
  const parts=Object.keys(c.participants||{});
  const cap=todayStr()<c.endDate?todayStr():c.endDate;
  const maxRestPerWeek=c.maxRestDays??2; // default 2 rest days allowed per week
  const r={};
  parts.forEach(m=>{
    // If forfeited, use forfeited amount
    const pData=c.participants[m];
    if(pData?.forfeited){r[m]={totalOwed:c.forfeitCap||0,byWeek:{},forfeited:true};return;}
    const profile=profiles?.[m];
    // Get all calendar days in range (not filtered by rest days)
    const penaltyStart=pData?.acceptedAt||c.startDate;
    const allDays=getDateRange(penaltyStart,cap);
    const byWeek={};
    // Group days by week and calc missed per week
    allDays.forEach(d=>{
      const wk=getWeekStart(d);
      if(!byWeek[wk])byWeek[wk]={days:[],worked:0,rested:0};
      byWeek[wk].days.push(d);
      if(h[d]?.[m]?.done) byWeek[wk].worked++;
      else if(isRestDay(d,profile)) byWeek[wk].rested++;
    });
    // For each week: penalize days missed beyond allowed rest days
    let totalOwed=0;
    const byWeekAmt={};
    Object.entries(byWeek).forEach(([wk,wdata])=>{
      const totalDays=wdata.days.length;
      const workedDays=wdata.worked;
      const scheduledRestDays=wdata.days.filter(d=>isRestDay(d,profile)).length;
      // Days not worked and not on their schedule = missed workout days
      const missedWorkoutDays=wdata.days.filter(d=>!h[d]?.[m]?.done&&!isRestDay(d,profile)).length;
      // Extra rest = rest days taken beyond the max allowed
      const extraRest=Math.max(0,scheduledRestDays-maxRestPerWeek);
      const penalizedDays=missedWorkoutDays+extraRest;
      if(penalizedDays>0){const amt=penalizedDays*c.penaltyAmt;totalOwed+=amt;byWeekAmt[wk]=amt;}
    });
    // Cap at forfeit amount if set
    if(c.forfeitCap&&totalOwed>=c.forfeitCap) totalOwed=c.forfeitCap;
    r[m]={totalOwed,byWeek:byWeekAmt,forfeited:false};
  });
  return r;
}
function computeBadges(n,h,feed,ch,profile){const e=[];const t=getTotalWorkouts(h,n),s=getStreak(h,n,profile),p=feed.filter(x=>x.author===n).length;const cc=ch.filter(c=>c.participants?.[n]?.done||(c.goalType==="dateRange"&&c.startDate&&c.endDate&&getWorkoutDays(c.startDate,c.endDate,profile).filter(d=>h[d]?.[n]?.done).length>=c.goal)).length;if(t>=1)e.push("first_blood");if(s>=7)e.push("week_warrior");if(s>=21)e.push("consistent");if(s>=30)e.push("monthly");if(t>=100)e.push("centurion");if(p>=10)e.push("social");if(cc>=1)e.push("challenger");return e;}

function launchConfetti(){const cv=document.getElementById("confetti-canvas");if(!cv)return;const ctx=cv.getContext("2d");cv.width=window.innerWidth;cv.height=window.innerHeight;const ps=Array.from({length:80},()=>({x:Math.random()*cv.width,y:-10,r:Math.random()*6+4,c:["#7c5cbf","#ff6b35","#f1c40f","#2ecc71","#e74c3c"][Math.floor(Math.random()*5)],vx:(Math.random()-.5)*4,vy:Math.random()*4+2,life:1}));let fr;const draw=()=>{ctx.clearRect(0,0,cv.width,cv.height);let alive=false;ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life-=.008;if(p.y<cv.height&&p.life>0)alive=true;ctx.globalAlpha=p.life;ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,p.r,p.r);});ctx.globalAlpha=1;if(alive)fr=requestAnimationFrame(draw);else ctx.clearRect(0,0,cv.width,cv.height);};draw();setTimeout(()=>{cancelAnimationFrame(fr);ctx.clearRect(0,0,cv.width,cv.height);},4000);}
function Toast({msg}){return msg?<div className="toast">{msg}</div>:null;}
function AvatarDisplay({profile,size=40}){if(profile?.avatarImg)return<img src={profile.avatarImg} alt="av" style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>;return<div className="avatar" style={{width:size,height:size,background:"var(--bg2)",fontSize:size*.55,flexShrink:0}}>{profile?.avatar||"🐺"}</div>;}
function readFileAsDataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});}
function compressImage(dataUrl,maxPx=200){return new Promise(res=>{const img=new Image();img.onload=()=>{let w=img.width,h=img.height;if(w>maxPx||h>maxPx){if(w>h){h=Math.round(h*(maxPx/w));w=maxPx;}else{w=Math.round(w*(maxPx/h));h=maxPx;}}const cv=document.createElement("canvas");cv.width=w;cv.height=h;cv.getContext("2d").drawImage(img,0,0,w,h);res(cv.toDataURL("image/jpeg",.75));};img.onerror=()=>res(dataUrl);img.src=dataUrl;});}

// ── AI TRAINER HELPERS ──────────────────────────────────────────────────────
// Summarize last 7 days of workouts for the AI's context
function getRecentHistoryString(history, userName){
  const days=[];
  for(let i=0;i<7;i++){
    const d=new Date();d.setDate(d.getDate()-i);
    const ds=localDateStr(d);
    const entry=history[ds]?.[userName];
    if(entry?.done){
      const labels=entry.workouts?.map(w=>w.label).join("+")||entry.workoutLabel||"workout";
      const details=entry.summary?.length?` (${entry.summary.map(s=>s.detail).filter(Boolean).join("; ")})`:"";
      days.push(`Day -${i}: ${labels}${details}`);
    }
  }
  return days.length?days.join(" | "):"No workouts in the last 7 days.";
}

// Build the equipment string the AI sees from a selected preset
function buildEquipmentString(presetId, customEquipment, packHomeGym){
  if(presetId==="custom"&&customEquipment){
    return customEquipment;
  }
  if(presetId==="home"){
    // packHomeGym comes from Firestore — array of strings
    const items=Array.isArray(packHomeGym)&&packHomeGym.length>0
      ? packHomeGym
      : HOME_GYM_DEFAULT;
    return `Garage gym equipment: ${items.join(", ")}.`;
  }
  // Check saved presets (saved_0, saved_1, etc.)
  if(presetId.startsWith("saved_")){
    return customEquipment||"Custom equipment.";
  }
  return AI_PRESET_DESCRIPTIONS[presetId]||AI_PRESET_DESCRIPTIONS.bodyweight;
}

// ── EXERCISE SVG ILLUSTRATIONS ───────────────────────────────────────────────
// Generates animated SVG diagrams based on the primary muscle group.
// Zero external dependencies — always works, never cuts music.

function getExerciseSVG(exerciseName, primaryMuscle){
  const name=(exerciseName||"").toLowerCase();
  const muscle=(primaryMuscle||"").toLowerCase();

  // Determine movement pattern from exercise name + muscle
  let pattern="push";
  if(name.includes("squat")||name.includes("lunge")||name.includes("leg press")||name.includes("step")) pattern="squat";
  else if(name.includes("deadlift")||name.includes("rdl")||name.includes("hip hinge")||name.includes("good morning")) pattern="hinge";
  else if(name.includes("row")||name.includes("pull")||name.includes("chin")||name.includes("lat")) pattern="pull";
  else if(name.includes("hip thrust")||name.includes("glute bridge")||name.includes("bridge")) pattern="thrust";
  else if(name.includes("curl")||name.includes("bicep")) pattern="curl";
  else if(name.includes("tricep")||name.includes("extension")||name.includes("pushdown")) pattern="tricep";
  else if(name.includes("press")&&(name.includes("bench")||name.includes("chest")||name.includes("incline")||name.includes("decline"))) pattern="bench";
  else if(name.includes("press")&&(name.includes("shoulder")||name.includes("overhead")||name.includes("ohp")||name.includes("military"))) pattern="overhead";
  else if(name.includes("plank")||name.includes("hollow")||name.includes("dead bug")) pattern="plank";
  else if(name.includes("crunch")||name.includes("situp")||name.includes("sit-up")||name.includes("ab")) pattern="crunch";
  else if(name.includes("lateral")||name.includes("raise")||name.includes("fly")||name.includes("flye")) pattern="raise";
  else if(muscle.includes("glute")||muscle.includes("hip")) pattern="thrust";
  else if(muscle.includes("back")||muscle.includes("lat")) pattern="pull";
  else if(muscle.includes("leg")||muscle.includes("quad")||muscle.includes("hamstring")) pattern="squat";
  else if(muscle.includes("chest")) pattern="bench";
  else if(muscle.includes("shoulder")||muscle.includes("delt")) pattern="overhead";
  else if(muscle.includes("bicep")) pattern="curl";
  else if(muscle.includes("tricep")) pattern="tricep";
  else if(muscle.includes("core")||muscle.includes("abs")) pattern="crunch";

  const svgs={
    squat:`<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <style>
        .body{stroke:#c084fc;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .accent{stroke:#ff6b35;stroke-width:2;stroke-linecap:round;fill:none;}
        .dot{fill:#c084fc;}
        @keyframes squat{0%,100%{transform:translateY(0)}50%{transform:translateY(14px)}}
        .mover{animation:squat 1.8s ease-in-out infinite;}
      </style>
      <g class="mover" transform-origin="60 50">
        <!-- head --><circle cx="60" cy="22" r="7" class="dot" fill-opacity="0.8"/>
        <!-- torso --><line x1="60" y1="29" x2="60" y2="55" class="body"/>
        <!-- arms --><line x1="60" y1="35" x2="42" y2="48" class="body"/><line x1="60" y1="35" x2="78" y2="48" class="body"/>
        <!-- bar --><line x1="30" y1="37" x2="90" y2="37" class="accent"/>
        <!-- left leg --><line x1="60" y1="55" x2="48" y2="75" class="body"/><line x1="48" y1="75" x2="44" y2="90" class="body"/>
        <!-- right leg --><line x1="60" y1="55" x2="72" y2="75" class="body"/><line x1="72" y1="75" x2="76" y2="90" class="body"/>
      </g>
      <!-- floor --><line x1="20" y1="94" x2="100" y2="94" stroke="#444" stroke-width="1.5"/>
      <!-- arrows --><text x="60" y="10" text-anchor="middle" fill="#ff6b35" font-size="9" opacity="0.7">↕ drive through heels</text>
    </svg>`,

    hinge:`<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <style>
        .body{stroke:#c084fc;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .accent{stroke:#ff6b35;stroke-width:2;stroke-linecap:round;fill:none;}
        .dot{fill:#c084fc;}
        @keyframes hinge{0%,100%{transform:rotate(0deg)}50%{transform:rotate(38deg)}}
        .mover{animation:hinge 2s ease-in-out infinite;transform-origin:60px 72px;}
      </style>
      <g class="mover">
        <circle cx="60" cy="28" r="7" class="dot" fill-opacity="0.8"/>
        <line x1="60" y1="35" x2="60" y2="62" class="body"/>
        <line x1="60" y1="40" x2="44" y2="52" class="body"/>
        <line x1="60" y1="40" x2="76" y2="52" class="body"/>
        <line x1="44" y1="52" x2="40" y2="68" class="accent"/>
        <line x1="76" y1="52" x2="80" y2="68" class="accent"/>
      </g>
      <line x1="48" y1="72" x2="72" y2="72" class="body"/>
      <line x1="48" y1="72" x2="46" y2="88" class="body"/>
      <line x1="72" y1="72" x2="74" y2="88" class="body"/>
      <line x1="20" y1="92" x2="100" y2="92" stroke="#444" stroke-width="1.5"/>
      <text x="60" y="10" text-anchor="middle" fill="#ff6b35" font-size="9" opacity="0.7">↕ hinge at hips</text>
    </svg>`,

    thrust:`<svg viewBox="0 0 130 100" xmlns="http://www.w3.org/2000/svg">
      <style>
        .body{stroke:#c084fc;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .accent{stroke:#ff6b35;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .dot{fill:#c084fc;}
        @keyframes thrust{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
        .hips{animation:thrust 1.8s ease-in-out infinite;transform-origin:65px 60px;}
      </style>
      <!-- bench --><rect x="10" y="62" width="40" height="10" rx="3" fill="#333" stroke="#555" stroke-width="1"/>
      <!-- upper body on bench --><line x1="12" y1="58" x2="48" y2="58" class="body"/>
      <circle cx="10" cy="54" r="6" class="dot" fill-opacity="0.8"/>
      <!-- arms --><line x1="30" y1="58" x2="30" y2="48" class="body"/><line x1="42" y1="58" x2="42" y2="48" class="body"/>
      <!-- bar --><line x1="22" y1="48" x2="50" y2="48" class="accent"/>
      <g class="hips">
        <!-- hips+legs --><line x1="48" y1="58" x2="65" y2="58" class="body"/>
        <line x1="65" y1="58" x2="75" y2="76" class="body"/><line x1="75" y1="76" x2="80" y2="90" class="body"/>
        <line x1="65" y1="58" x2="85" y2="66" class="body"/><line x1="85" y1="66" x2="90" y2="82" class="body"/>
      </g>
      <line x1="20" y1="93" x2="110" y2="93" stroke="#444" stroke-width="1.5"/>
      <text x="65" y="10" text-anchor="middle" fill="#ff6b35" font-size="9" opacity="0.7">↑ drive hips up, squeeze</text>
    </svg>`,

    pull:`<svg viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg">
      <style>
        .body{stroke:#c084fc;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .accent{stroke:#ff6b35;stroke-width:2;stroke-linecap:round;fill:none;}
        .dot{fill:#c084fc;}
        @keyframes pull{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        .mover{animation:pull 1.8s ease-in-out infinite;}
      </style>
      <!-- bar --><line x1="20" y1="18" x2="100" y2="18" class="accent" stroke-width="3"/>
      <g class="mover" transform-origin="60 18">
        <circle cx="60" cy="42" r="7" class="dot" fill-opacity="0.8"/>
        <line x1="60" y1="49" x2="60" y2="72" class="body"/>
        <line x1="60" y1="55" x2="44" y2="44" class="body"/><line x1="44" y1="44" x2="36" y2="26" class="body"/>
        <line x1="60" y1="55" x2="76" y2="44" class="body"/><line x1="76" y1="44" x2="84" y2="26" class="body"/>
        <line x1="60" y1="72" x2="50" y2="88" class="body"/><line x1="60" y1="72" x2="70" y2="88" class="body"/>
      </g>
      <text x="60" y="104" text-anchor="middle" fill="#ff6b35" font-size="9" opacity="0.7">↑ pull elbows to hips</text>
    </svg>`,

    push:`<svg viewBox="0 0 130 100" xmlns="http://www.w3.org/2000/svg">
      <style>
        .body{stroke:#c084fc;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .accent{stroke:#ff6b35;stroke-width:2;stroke-linecap:round;fill:none;}
        .dot{fill:#c084fc;}
        @keyframes push{0%,100%{transform:translateY(0)}50%{transform:translateY(10px)}}
        .mover{animation:push 1.8s ease-in-out infinite;}
      </style>
      <g class="mover" transform-origin="65 55">
        <circle cx="65" cy="22" r="7" class="dot" fill-opacity="0.8"/>
        <line x1="65" y1="29" x2="65" y2="56" class="body"/>
        <line x1="65" y1="36" x2="44" y2="48" class="body"/><line x1="44" y1="48" x2="38" y2="38" class="body"/>
        <line x1="65" y1="36" x2="86" y2="48" class="body"/><line x1="86" y1="48" x2="92" y2="38" class="body"/>
        <line x1="38" y1="38" x2="92" y2="38" class="accent"/>
        <line x1="65" y1="56" x2="55" y2="76" class="body"/><line x1="55" y1="76" x2="52" y2="92" class="body"/>
        <line x1="65" y1="56" x2="75" y2="76" class="body"/><line x1="75" y1="76" x2="78" y2="92" class="body"/>
      </g>
      <line x1="20" y1="95" x2="110" y2="95" stroke="#444" stroke-width="1.5"/>
      <text x="65" y="10" text-anchor="middle" fill="#ff6b35" font-size="9" opacity="0.7">↕ controlled press</text>
    </svg>`,

    bench:`<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <style>
        .body{stroke:#c084fc;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .accent{stroke:#ff6b35;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .dot{fill:#c084fc;}
        @keyframes bench{0%,100%{transform:translateY(0)}50%{transform:translateY(12px)}}
        .arms{animation:bench 1.8s ease-in-out infinite;}
      </style>
      <rect x="15" y="54" width="90" height="10" rx="3" fill="#333" stroke="#555" stroke-width="1"/>
      <circle cx="20" cy="48" r="7" class="dot" fill-opacity="0.8"/>
      <line x1="25" y1="50" x2="100" y2="50" class="body"/>
      <line x1="100" y1="50" x2="110" y2="64" class="body"/><line x1="110" y1="64" x2="116" y2="78" class="body"/>
      <g class="arms" transform-origin="70 38">
        <line x1="45" y1="50" x2="40" y2="36" class="body"/><line x1="75" y1="50" x2="80" y2="36" class="body"/>
        <line x1="28" y1="36" x2="92" y2="36" class="accent" stroke-width="3"/>
      </g>
      <line x1="10" y1="92" x2="130" y2="92" stroke="#444" stroke-width="1.5"/>
      <text x="70" y="10" text-anchor="middle" fill="#ff6b35" font-size="9" opacity="0.7">↕ lower to chest, press up</text>
    </svg>`,

    overhead:`<svg viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg">
      <style>
        .body{stroke:#c084fc;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .accent{stroke:#ff6b35;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .dot{fill:#c084fc;}
        @keyframes ohp{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        .arms{animation:ohp 1.8s ease-in-out infinite;}
      </style>
      <circle cx="60" cy="20" r="7" class="dot" fill-opacity="0.8"/>
      <line x1="60" y1="27" x2="60" y2="58" class="body"/>
      <line x1="60" y1="62" x2="48" y2="80" class="body"/><line x1="48" y1="80" x2="45" y2="95" class="body"/>
      <line x1="60" y1="62" x2="72" y2="80" class="body"/><line x1="72" y1="80" x2="75" y2="95" class="body"/>
      <g class="arms" transform-origin="60 40">
        <line x1="60" y1="40" x2="36" y2="52" class="body"/><line x1="36" y1="52" x2="30" y2="38" class="body"/>
        <line x1="60" y1="40" x2="84" y2="52" class="body"/><line x1="84" y1="52" x2="90" y2="38" class="body"/>
        <line x1="22" y1="38" x2="98" y2="38" class="accent" stroke-width="3"/>
      </g>
      <line x1="20" y1="98" x2="100" y2="98" stroke="#444" stroke-width="1.5"/>
      <text x="60" y="108" text-anchor="middle" fill="#ff6b35" font-size="9" opacity="0.7">↑ press overhead, lock out</text>
    </svg>`,

    curl:`<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <style>
        .body{stroke:#c084fc;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .accent{stroke:#ff6b35;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .dot{fill:#c084fc;}
        @keyframes curl{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-70deg)}}
        .forearm{animation:curl 1.8s ease-in-out infinite;transform-origin:72px 55px;}
      </style>
      <circle cx="60" cy="18" r="7" class="dot" fill-opacity="0.8"/>
      <line x1="60" y1="25" x2="60" y2="55" class="body"/>
      <line x1="60" y1="55" x2="48" y2="75" class="body"/><line x1="48" y1="75" x2="45" y2="90" class="body"/>
      <line x1="60" y1="55" x2="72" y2="75" class="body"/><line x1="72" y1="75" x2="75" y2="90" class="body"/>
      <line x1="60" y1="36" x2="48" y2="48" class="body"/>
      <g class="forearm">
        <line x1="72" y1="55" x2="85" y2="48" class="body"/>
        <line x1="85" y1="48" x2="90" y2="36" class="accent" stroke-width="3"/>
      </g>
      <line x1="20" y1="93" x2="100" y2="93" stroke="#444" stroke-width="1.5"/>
      <text x="60" y="8" text-anchor="middle" fill="#ff6b35" font-size="9" opacity="0.7">↑ curl, squeeze bicep</text>
    </svg>`,

    tricep:`<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <style>
        .body{stroke:#c084fc;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .accent{stroke:#ff6b35;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .dot{fill:#c084fc;}
        @keyframes tricep{0%,100%{transform:rotate(0deg)}50%{transform:rotate(55deg)}}
        .forearm{animation:tricep 1.8s ease-in-out infinite;transform-origin:75px 42px;}
      </style>
      <circle cx="60" cy="18" r="7" class="dot" fill-opacity="0.8"/>
      <line x1="60" y1="25" x2="60" y2="55" class="body"/>
      <line x1="60" y1="55" x2="48" y2="75" class="body"/><line x1="48" y1="75" x2="45" y2="90" class="body"/>
      <line x1="60" y1="55" x2="72" y2="75" class="body"/><line x1="72" y1="75" x2="75" y2="90" class="body"/>
      <line x1="60" y1="36" x2="48" y2="46" class="body"/>
      <line x1="60" y1="36" x2="75" y2="42" class="body"/>
      <g class="forearm">
        <line x1="75" y1="42" x2="78" y2="60" class="accent" stroke-width="3"/>
      </g>
      <line x1="20" y1="93" x2="100" y2="93" stroke="#444" stroke-width="1.5"/>
      <text x="60" y="8" text-anchor="middle" fill="#ff6b35" font-size="9" opacity="0.7">↓ extend, lock out tricep</text>
    </svg>`,

    plank:`<svg viewBox="0 0 140 80" xmlns="http://www.w3.org/2000/svg">
      <style>
        .body{stroke:#c084fc;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .accent{stroke:#ff6b35;stroke-width:2;stroke-linecap:round;fill:none;}
        .dot{fill:#c084fc;}
        @keyframes plank{0%,100%{opacity:1}50%{opacity:0.5}}
        .core{animation:plank 2s ease-in-out infinite;}
      </style>
      <circle cx="24" cy="32" r="7" class="dot" fill-opacity="0.8"/>
      <line x1="30" y1="35" x2="100" y2="44" class="body"/>
      <line x1="36" y1="36" x2="30" y2="50" class="body"/><line x1="30" y1="50" x2="26" y2="62" class="body"/>
      <line x1="100" y1="44" x2="104" y2="58" class="body"/><line x1="104" y1="58" x2="106" y2="68" class="body"/>
      <line x1="96" y1="44" x2="100" y2="58" class="body"/><line x1="100" y1="58" x2="102" y2="68" class="body"/>
      <g class="core"><line x1="50" y1="38" x2="80" y2="42" class="accent" stroke-width="3"/></g>
      <line x1="10" y1="70" x2="130" y2="70" stroke="#444" stroke-width="1.5"/>
      <text x="70" y="12" text-anchor="middle" fill="#ff6b35" font-size="9" opacity="0.7">hold tight — brace your core</text>
    </svg>`,

    crunch:`<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <style>
        .body{stroke:#c084fc;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .accent{stroke:#ff6b35;stroke-width:2;stroke-linecap:round;fill:none;}
        .dot{fill:#c084fc;}
        @keyframes crunch{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-25deg)}}
        .upper{animation:crunch 1.8s ease-in-out infinite;transform-origin:60px 62px;}
      </style>
      <line x1="20" y1="88" x2="100" y2="88" stroke="#444" stroke-width="1.5"/>
      <line x1="45" y1="88" x2="55" y2="70" class="body"/><line x1="75" y1="88" x2="65" y2="70" class="body"/>
      <line x1="55" y1="70" x2="60" y2="62" class="body"/><line x1="65" y1="70" x2="60" y2="62" class="body"/>
      <g class="upper">
        <line x1="60" y1="62" x2="60" y2="42" class="body"/>
        <line x1="60" y1="50" x2="44" y2="58" class="body"/><line x1="60" y1="50" x2="76" y2="58" class="body"/>
        <circle cx="60" cy="34" r="7" class="dot" fill-opacity="0.8"/>
        <line x1="44" y1="58" x2="48" y2="44" class="accent"/><line x1="76" y1="58" x2="72" y2="44" class="accent"/>
      </g>
      <text x="60" y="10" text-anchor="middle" fill="#ff6b35" font-size="9" opacity="0.7">↑ curl shoulders up, exhale</text>
    </svg>`,

    raise:`<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <style>
        .body{stroke:#c084fc;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .accent{stroke:#ff6b35;stroke-width:2.5;stroke-linecap:round;fill:none;}
        .dot{fill:#c084fc;}
        @keyframes raise{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-45deg)}}
        .larm{animation:raise 1.8s ease-in-out infinite;transform-origin:46px 42px;}
        @keyframes raise2{0%,100%{transform:rotate(0deg)}50%{transform:rotate(45deg)}}
        .rarm{animation:raise2 1.8s ease-in-out infinite;transform-origin:76px 42px;}
      </style>
      <circle cx="61" cy="18" r="7" class="dot" fill-opacity="0.8"/>
      <line x1="61" y1="25" x2="61" y2="58" class="body"/>
      <line x1="61" y1="58" x2="50" y2="78" class="body"/><line x1="50" y1="78" x2="47" y2="92" class="body"/>
      <line x1="61" y1="58" x2="72" y2="78" class="body"/><line x1="72" y1="78" x2="75" y2="92" class="body"/>
      <g class="larm"><line x1="61" y1="42" x2="30" y2="52" class="accent" stroke-width="3"/></g>
      <g class="rarm"><line x1="61" y1="42" x2="92" y2="52" class="accent" stroke-width="3"/></g>
      <line x1="10" y1="95" x2="130" y2="95" stroke="#444" stroke-width="1.5"/>
      <text x="61" y="8" text-anchor="middle" fill="#ff6b35" font-size="9" opacity="0.7">↑ raise to shoulder height</text>
    </svg>`,
  };

  return svgs[pattern]||svgs.push;
}

// Count today's regenerations from localStorage (per user)
function getRegenCount(userName){
  try{
    const k=`wp_regen_${userName}_${todayStr()}`;
    return Number(localStorage.getItem(k)||0);
  }catch{return 0;}
}
function bumpRegenCount(userName){
  try{
    const k=`wp_regen_${userName}_${todayStr()}`;
    const n=getRegenCount(userName)+1;
    localStorage.setItem(k,String(n));
    return n;
  }catch{return 0;}
}

// ── ACTIVE WORKOUT HELPERS (localStorage, Central time) ─────────────────────
// Central time date string (CDT = UTC-5)
function centralDateStr(offsetDays=0){
  const now=new Date();
  const central=new Date(now.getTime()+(-5*60*60*1000));
  if(offsetDays){central.setDate(central.getDate()+offsetDays);}
  return central.toISOString().slice(0,10);
}

// Save an active workout plan to localStorage
// targetDate: "today" | "tomorrow"
function saveActiveWorkout(userName, workout, muscleGroup, targetDate="today"){
  try{
    const date=targetDate==="tomorrow"?centralDateStr(1):centralDateStr(0);
    const key=`wp_active_${userName}_${date}`;
    const data={workout,muscleGroup,date,savedAt:Date.now(),completed:false};
    localStorage.setItem(key,JSON.stringify(data));
    return true;
  }catch{return false;}
}

// Get active workout for a specific date
function getActiveWorkout(userName, targetDate="today"){
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
function markActiveWorkoutComplete(userName, targetDate="today"){
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
function dismissActiveWorkout(userName, targetDate="today"){
  try{
    const date=targetDate==="tomorrow"?centralDateStr(1):centralDateStr(0);
    const key=`wp_active_${userName}_${date}`;
    localStorage.removeItem(key);
  }catch{}
}

// ── TRAINING LOG HELPERS ────────────────────────────────────────────────────
// Key: wolfpack/training_log  →  {users: {userName: {exercises: {exerciseName: {lastWeight, lastReps, effortHistory: [{date,weight,reps,effort}]}}}}}

async function saveTrainingLog(userName, exercises, effortRating){
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

async function getTrainingLog(userName){
  try{
    const data=await fsGet("wolfpack/training_log");
    return data?.users?.[userName]?.exercises||{};
  }catch{return {};}
}

// Build a prior performance string for the AI prompt
function buildPriorPerformanceString(trainingLog, muscleGroup){
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

// ── ONBOARDING ────────────────────────────────────────────────────────────────
function Onboarding({onJoin}){
  const [step,setStep]=useState("invite");
  const [invite,setInvite]=useState("");
  const [name,setName]=useState("");
  const [avatar,setAvatar]=useState("🐺");
  const [avatarImg,setAvatarImg]=useState(null);
  const [pin,setPin]=useState("");
  const [pin2,setPin2]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const fileRef=useRef();

  const next=s=>{setError("");setStep(s);};
  const handleInvite=()=>{if(invite.trim().toUpperCase()!==INVITE_CODE)return setError("Wrong invite code.");next("name");};
  const handleName=()=>{if(!name.trim())return setError("Enter your name");next("avatar");};
  const handlePhoto=async e=>{const f=e.target.files?.[0];if(!f)return;const raw=await readFileAsDataURL(f);const comp=await compressImage(raw);setAvatarImg(comp);};
  const handlePin=async()=>{
    if(pin.length!==4)return setError("PIN must be exactly 4 digits");
    if(pin!==pin2)return setError("PINs don't match");
    setError("");setLoading(true);
    try{await onJoin(name.trim(),avatarImg?null:avatar,pin,avatarImg||null);}
    catch(e){setError("Connection error. Try again.");setLoading(false);}
  };

  const wrap={width:"100%",display:"flex",flexDirection:"column",gap:12,marginTop:8};
  const lbl={fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:3,color:"var(--muted)"};

  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100dvh",padding:"36px 24px 100px",gap:16,overflowY:"auto",WebkitOverflowScrolling:"touch",background:"var(--bg)"}}>
      <div style={{fontSize:64}}>🐺</div>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:38,letterSpacing:6,background:"linear-gradient(135deg,#fff,#9b7de0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>WOLFPACK</div>
      <div style={{color:"var(--muted)",fontSize:14,marginTop:-8}}>fitness accountability</div>

      {step==="invite"&&<div style={wrap}>
        <div style={lbl}>ENTER INVITE CODE</div>
        <input className="input" placeholder="Invite code..." value={invite} onChange={e=>setInvite(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleInvite()} style={{textTransform:"uppercase",letterSpacing:4,textAlign:"center",fontSize:20}} autoFocus/>
        {error&&<div style={{color:"var(--red)",fontSize:13}}>{error}</div>}
        <button className="btn-primary" onClick={handleInvite}>CONTINUE →</button>
      </div>}

      {step==="name"&&<div style={wrap}>
        <div style={lbl}>YOUR NAME</div>
        <input className="input" placeholder="Enter your name..." value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleName()} maxLength={20} autoFocus/>
        {error&&<div style={{color:"var(--red)",fontSize:13}}>{error}</div>}
        <button className="btn-primary" onClick={handleName}>CONTINUE →</button>
      </div>}

      {step==="avatar"&&<div style={wrap}>
        <div style={lbl}>PICK YOUR LOOK</div>
        {/* photo box */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:16,background:"var(--bg3)",borderRadius:14,border:"1px solid var(--border)"}}>
          {avatarImg
            ?<img src={avatarImg} alt="av" style={{width:80,height:80,borderRadius:"50%",objectFit:"cover",border:"3px solid var(--accent)"}}/>
            :<div style={{width:80,height:80,borderRadius:"50%",background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,border:"2px dashed var(--border)"}}>📷</div>
          }
          <button className="btn-ghost" onClick={()=>fileRef.current.click()} style={{fontSize:13}}>{avatarImg?"Change Photo":"Upload Photo"}</button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>
          {avatarImg&&<button className="btn-ghost" onClick={()=>setAvatarImg(null)} style={{fontSize:12,color:"var(--muted)"}}>Remove photo</button>}
        </div>
        {/* emoji grid — always shown */}
        <div style={{textAlign:"center",fontSize:12,color:"var(--muted)"}}>— or pick an emoji —</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {WOLF_AVATARS.map(a=>(
            <button key={a} onClick={()=>{setAvatar(a);setAvatarImg(null);}} style={{padding:10,fontSize:26,borderRadius:12,cursor:"pointer",background:!avatarImg&&avatar===a?"rgba(124,92,191,0.25)":"var(--bg3)",border:!avatarImg&&avatar===a?"2px solid var(--accent)":"2px solid var(--border)",transition:"all .15s"}}>{a}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={()=>next("pin")}>CONTINUE →</button>
      </div>}

      {step==="pin"&&<div style={wrap}>
        <div style={lbl}>SET YOUR 4-DIGIT PIN</div>
        <input className="input" type="password" inputMode="numeric" placeholder="4-digit PIN" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))} maxLength={4} autoFocus style={{letterSpacing:10,textAlign:"center",fontSize:24}}/>
        <input className="input" type="password" inputMode="numeric" placeholder="Confirm PIN" value={pin2} onChange={e=>setPin2(e.target.value.replace(/\D/g,"").slice(0,4))} maxLength={4} onKeyDown={e=>e.key==="Enter"&&handlePin()} style={{letterSpacing:10,textAlign:"center",fontSize:24}}/>
        {error&&<div style={{color:"var(--red)",fontSize:13}}>{error}</div>}
        <button className="btn-primary" onClick={handlePin} disabled={loading}>{loading?"JOINING...":"JOIN THE PACK 🐺"}</button>
      </div>}
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({members,profiles,onLogin,adminName}){
  const [sel,setSel]=useState(null);
  const [pin,setPin]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const go=async()=>{
    if(!sel)return;setLoading(true);
    const stored=await fsGet(`wolfpack/pin_${sel}`);
    if(!stored?.pin){onLogin(sel);return;}
    if(stored.pin===pin){onLogin(sel);}
    else{setErr("Wrong PIN. Try again.");setLoading(false);}
  };
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100dvh",padding:"32px 24px",gap:16,background:"var(--bg)"}}>
      <div style={{fontSize:56}}>🐺</div>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:34,letterSpacing:5,background:"linear-gradient(135deg,#fff,#9b7de0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>WOLFPACK</div>
      {!sel?(
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:3,color:"var(--muted)",marginBottom:4}}>WHO ARE YOU?</div>
          {members.map(m=>(
            <button key={m} onClick={()=>setSel(m)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,cursor:"pointer",width:"100%"}}>
              <AvatarDisplay profile={profiles[m]} size={40}/>
              <div style={{flex:1,textAlign:"left"}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>{m}</div>
                {m===adminName&&<div style={{fontSize:11,color:"var(--accent2)"}}>Pack Admin</div>}
              </div>
            </button>
          ))}
          <div style={{marginTop:8,color:"var(--muted)",fontSize:13,textAlign:"center"}}>New here? <span style={{color:"var(--accent2)",cursor:"pointer"}} onClick={()=>onLogin(null,"join")}>Join the Pack</span></div>
        </div>
      ):(
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12,marginTop:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"var(--bg3)",borderRadius:12}}>
            <AvatarDisplay profile={profiles[sel]} size={40}/>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:2}}>{sel}</div>
          </div>
          <input className="input" type="password" inputMode="numeric" placeholder="Enter PIN..." value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))} autoFocus maxLength={4} onKeyDown={e=>e.key==="Enter"&&go()} style={{letterSpacing:10,textAlign:"center",fontSize:24}}/>
          {err&&<div style={{color:"var(--red)",fontSize:13}}>{err}</div>}
          <button className="btn-primary" onClick={go} disabled={loading}>{loading?"...":"LET ME IN 🐺"}</button>
          <button className="btn-ghost" style={{width:"100%"}} onClick={()=>{setSel(null);setPin("");setErr("");}}>← Back</button>
        </div>
      )}
    </div>
  );
}

// ── ADMIN PANEL ───────────────────────────────────────────────────────────────
// Reset PIN = clears their PIN from Firestore. They can log in freely until they set a new one.
function AdminPanel({members,profiles,currentUser,adminName,onResetPin,onDeleteAccount,onAdminBackfill,onClose,garageEquipment,onSaveGarageEquipment}){
  const [confirmDel,setConfirmDel]=useState(null);
  const [busy,setBusy]=useState(null);
  const [resetDone,setResetDone]=useState([]);
  const [backfillMember,setBackfillMember]=useState(null);
  const [backfillDate,setBackfillDate]=useState("");
  const [backfillWorkouts,setBackfillWorkouts]=useState([]);
  const [backfillSaving,setBackfillSaving]=useState(false);
  const [backfillDone,setBackfillDone]=useState(false);
  // Garage equipment editor state
  const [equipList,setEquipList]=useState(Array.isArray(garageEquipment)?garageEquipment:[...HOME_GYM_DEFAULT]);
  const [newItem,setNewItem]=useState("");
  const [equipSaved,setEquipSaved]=useState(false);

  const backfillDates=Array.from({length:7},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(i+1));
    return d.toISOString().split("T")[0];
  });
  const toggleBW=w=>setBackfillWorkouts(s=>s.find(x=>x.id===w.id)?s.filter(x=>x.id!==w.id):[...s,w]);
  const saveBackfill=async()=>{
    if(!backfillMember||!backfillDate||backfillWorkouts.length===0)return;
    setBackfillSaving(true);
    await onAdminBackfill(backfillMember,backfillDate,backfillWorkouts);
    setBackfillSaving(false);setBackfillDone(true);
    setBackfillDate("");setBackfillWorkouts([]);
    setTimeout(()=>setBackfillDone(false),2500);
  };

  if(currentUser!==adminName)return null;

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"90dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,marginBottom:4}}>ADMIN PANEL</div>
        <div style={{fontSize:12,color:"var(--muted)",marginBottom:16,lineHeight:1.6}}>
          <b>Reset PIN</b> — clears their PIN so they can log straight in.<br/>
          <b>Delete</b> — permanently removes them from the pack.<br/>
          <b>Backfill</b> — log past workouts on behalf of a member.
        </div>

        {/* Member management */}
        {members.filter(m=>m!==currentUser).map(m=>(
          <div key={m} style={{marginBottom:10,background:"var(--bg3)",borderRadius:12,border:"1px solid var(--border)",overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px"}}>
              <AvatarDisplay profile={profiles[m]} size={36}/>
              <div style={{flex:1,fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:1}}>{m}</div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>setBackfillMember(backfillMember===m?null:m)} style={{padding:"5px 8px",background:"rgba(46,204,113,0.15)",border:"1px solid rgba(46,204,113,0.3)",borderRadius:8,cursor:"pointer",color:"var(--green)",fontSize:10,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                  FILL
                </button>
                <button onClick={()=>doReset(m)} disabled={!!busy} style={{padding:"5px 8px",background:"rgba(124,92,191,0.15)",border:"1px solid rgba(124,92,191,0.3)",borderRadius:8,cursor:"pointer",color:"var(--accent2)",fontSize:10,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                  {busy===`r${m}`?"...":resetDone.includes(m)?"✓":"PIN"}
                </button>
                <button onClick={()=>setConfirmDel(confirmDel===m?null:m)} disabled={!!busy} style={{padding:"5px 8px",background:"rgba(231,76,60,0.15)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:8,cursor:"pointer",color:"var(--red)",fontSize:10,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                  DEL
                </button>
              </div>
            </div>

            {/* Backfill panel */}
            {backfillMember===m&&(
              <div style={{padding:"12px 14px",background:"rgba(46,204,113,0.05)",borderTop:"1px solid rgba(46,204,113,0.15)"}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--green)",marginBottom:10}}>LOG WORKOUT FOR {m.toUpperCase()}</div>
                {/* Date picker */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                  {backfillDates.map(d=>(
                    <button key={d} onClick={()=>setBackfillDate(d)} style={{
                      padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:11,
                      fontFamily:"'Bebas Neue',cursive",letterSpacing:1,
                      background:backfillDate===d?"rgba(46,204,113,0.2)":"var(--bg2)",
                      border:backfillDate===d?"1px solid var(--green)":"1px solid var(--border)",
                      color:backfillDate===d?"var(--green)":"var(--muted)"
                    }}>
                      {new Date(d+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
                    </button>
                  ))}
                </div>
                {/* Workout type picker */}
                {backfillDate&&(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:10}}>
                    {WORKOUT_TYPES.map(w=>{
                      const sel=!!backfillWorkouts.find(x=>x.id===w.id);
                      return(
                        <button key={w.id} onClick={()=>toggleBW(w)} style={{
                          padding:"8px 4px",borderRadius:10,cursor:"pointer",textAlign:"center",
                          background:sel?"rgba(46,204,113,0.2)":"var(--bg2)",
                          border:sel?"1px solid var(--green)":"1px solid var(--border)",
                          fontSize:13
                        }}>
                          <div>{w.icon}</div>
                          <div style={{fontSize:10,color:sel?"var(--green)":"var(--muted)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1,marginTop:2}}>{w.label}</div>
                          {sel&&<div style={{fontSize:9,color:"var(--green)"}}>✓</div>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {backfillDone&&<div style={{padding:"8px 10px",background:"rgba(46,204,113,0.1)",border:"1px solid rgba(46,204,113,0.3)",borderRadius:8,fontSize:12,color:"var(--green)",marginBottom:8,textAlign:"center"}}>✓ Logged for {m}!</div>}
                <button onClick={saveBackfill} disabled={!backfillDate||backfillWorkouts.length===0||backfillSaving}
                  style={{width:"100%",padding:"10px",background:"var(--green)",border:"none",borderRadius:10,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1,opacity:(!backfillDate||backfillWorkouts.length===0)?0.4:1}}>
                  {backfillSaving?"SAVING...":"LOG FOR "+m.toUpperCase()}
                </button>
                {/* Delete existing workouts for this member */}
                <div style={{marginTop:10,borderTop:"1px solid var(--border)",paddingTop:10}}>
                  <div style={{fontSize:10,color:"var(--muted)",letterSpacing:1,fontFamily:"'Bebas Neue',cursive",marginBottom:6}}>DELETE A LOGGED DAY</div>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {backfillDates.filter(d=>history[d]?.[m]?.done).map(d=>(
                      <div key={d} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:"var(--bg2)",borderRadius:8,border:"1px solid var(--border)"}}>
                        <div>
                          <div style={{fontSize:12,color:"var(--text)"}}>{fmtDate(d)}</div>
                          <div style={{fontSize:10,color:"var(--muted)"}}>{Array.isArray(history[d][m].summary)?history[d][m].summary.join(", "):history[d][m].workoutLabel||"Workout"}</div>
                        </div>
                        <button onClick={async()=>{
                          const newDay={...(history[d]||{})};delete newDay[m];
                          const newHistory={...history,[d]:newDay};
                          await fsSet("wolfpack/workouts",{byDate:newHistory});
                          setHistory(newHistory);setSharedData(newHistory);
                          showToast(`Deleted workout for ${m} on ${fmtDate(d)}`);
                        }} style={{padding:"4px 10px",background:"rgba(231,76,60,0.15)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:6,cursor:"pointer",color:"var(--red)",fontSize:11,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                          DELETE
                        </button>
                      </div>
                    ))}
                    {backfillDates.filter(d=>history[d]?.[m]?.done).length===0&&<div style={{fontSize:11,color:"var(--muted)"}}>No logged workouts in the last 7 days.</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Delete confirm */}
            {confirmDel===m&&(
              <div style={{padding:"12px 14px",background:"rgba(231,76,60,0.07)",borderTop:"1px solid rgba(231,76,60,0.15)"}}>
                <div style={{fontSize:13,marginBottom:10}}>Remove <b>{m}</b> from the pack permanently?</div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>doDelete(m)} disabled={!!busy} style={{flex:1,padding:10,background:"var(--red)",border:"none",borderRadius:8,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1}}>{busy===`d${m}`?"...":"YES, REMOVE"}</button>
                  <button onClick={()=>setConfirmDel(null)} style={{flex:1,padding:10,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,cursor:"pointer",color:"var(--muted)",fontSize:13}}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {/* ── GARAGE GYM EQUIPMENT ── */}
        <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid var(--border)"}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,color:"var(--accent2)",marginBottom:4}}>🏠 GARAGE GYM EQUIPMENT</div>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:10,lineHeight:1.5}}>
            This list is what WOLFMODE uses when members pick "Garage Gym". Add or remove items as your setup changes.
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
            {equipList.map((item,i)=>(
              <div key={i} style={{
                display:"flex",alignItems:"center",gap:8,
                padding:"8px 10px",background:"var(--bg3)",
                border:"1px solid var(--border)",borderRadius:10,
              }}>
                <span style={{fontSize:13,color:"rgba(255,255,255,0.85)",flex:1}}>{item}</span>
                <button onClick={()=>setEquipList(l=>l.filter((_,j)=>j!==i))} style={{
                  background:"none",border:"none",cursor:"pointer",
                  color:"var(--muted)",fontSize:16,padding:"0 4px",lineHeight:1,
                }}>×</button>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <input className="input" placeholder="Add equipment (e.g. Cable machine)"
              value={newItem} onChange={e=>setNewItem(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&newItem.trim()){setEquipList(l=>[...l,newItem.trim()]);setNewItem("");setEquipSaved(false);}}}
              style={{flex:1,padding:"8px 12px",fontSize:13}}/>
            <button className="btn-ghost" onClick={()=>{if(newItem.trim()){setEquipList(l=>[...l,newItem.trim()]);setNewItem("");setEquipSaved(false);}}}
              style={{padding:"8px 14px",fontSize:12,flexShrink:0}}>+ Add</button>
          </div>
          <button className="btn-primary" onClick={async()=>{
            await onSaveGarageEquipment(equipList);
            setEquipSaved(true);
            setTimeout(()=>setEquipSaved(false),2000);
          }} style={{width:"100%",marginBottom:8}}>
            {equipSaved?"✓ SAVED":"SAVE EQUIPMENT LIST"}
          </button>
        </div>

        <button className="btn-ghost" style={{width:"100%",marginTop:8}} onClick={onClose}>Close</button>
      </div>
    </div>
  );

  function doReset(m){setBusy(`r${m}`);onResetPin(m).then(()=>{setBusy(null);setResetDone(d=>[...d,m]);});}
  function doDelete(m){setBusy(`d${m}`);onDeleteAccount(m).then(()=>{setBusy(null);setConfirmDel(null);});}
}

function NotifBanner({currentUser}){
  const [vis,setVis]=useState(false);
  const [asking,setAsking]=useState(false);
  useEffect(()=>{if("Notification" in window&&Notification.permission==="default")setVis(true);},[]);
  const enable=async()=>{setAsking(true);const t=await requestNotifPermission();if(t&&currentUser)await fsSet(`wolfpack/fcm_${currentUser}`,{token:t,ts:Date.now()});setVis(false);setAsking(false);};
  if(!vis)return null;
  return(
    <div style={{margin:"8px 16px 0",padding:"12px 14px",background:"rgba(124,92,191,0.1)",border:"1px solid rgba(124,92,191,0.3)",borderRadius:14,display:"flex",alignItems:"center",gap:10}}>
      <div style={{fontSize:22}}>🔔</div>
      <div style={{flex:1}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2}}>ENABLE NOTIFICATIONS</div><div style={{fontSize:11,color:"var(--muted)"}}>Get alerts when the pack logs workouts</div></div>
      <button onClick={enable} disabled={asking} style={{padding:"6px 12px",background:"linear-gradient(135deg,var(--accent),var(--orange))",border:"none",borderRadius:8,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1}}>{asking?"...":"ALLOW"}</button>
      <button onClick={()=>setVis(false)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:20,lineHeight:1}}>×</button>
    </div>
  );
}

// ── REACTION PILL ────────────────────────────────────────────────────────────
function ReactionPill({member, reactions, currentUser, onReact}){
  const [open,setOpen]=useState(false);
  const memberReactions=reactions?.[member]||{};
  // Get all reactions that have at least 1
  const activeReactions=REACTIONS.filter(r=>(memberReactions[r]||[]).length>0);
  const myReaction=REACTIONS.find(r=>(memberReactions[r]||[]).includes(currentUser));

  return(
    <div style={{position:"relative"}}>
      <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
        {/* Active reactions with counts */}
        {activeReactions.map(r=>{
          const count=(memberReactions[r]||[]).length;
          const iReacted=(memberReactions[r]||[]).includes(currentUser);
          return(
            <button key={r} onClick={e=>{e.stopPropagation();onReact(member,r);}} style={{
              padding:"2px 8px",borderRadius:20,fontSize:12,cursor:"pointer",
              background:iReacted?"rgba(124,92,191,0.2)":"rgba(255,255,255,0.05)",
              border:iReacted?"1px solid rgba(124,92,191,0.35)":"1px solid rgba(255,255,255,0.08)",
              display:"flex",alignItems:"center",gap:3,
            }}>
              {r} <span style={{fontSize:10,color:"var(--muted)"}}>{count}</span>
            </button>
          );
        })}
        {/* React + button */}
        <button onClick={e=>{e.stopPropagation();setOpen(o=>!o);}} style={{
          padding:"2px 10px",borderRadius:20,fontSize:11,cursor:"pointer",
          background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
          color:"var(--muted)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1,
        }}>
          {myReaction?"REACTED":"REACT +"}
        </button>
      </div>
      {/* Emoji picker */}
      {open&&(
        <div onClick={e=>e.stopPropagation()} style={{
          position:"absolute",bottom:"calc(100% + 6px)",right:0,
          background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,
          padding:"10px 12px",display:"flex",gap:8,zIndex:50,
          boxShadow:"0 8px 24px rgba(0,0,0,0.4)",
        }}>
          {REACTIONS.map(r=>(
            <button key={r} onClick={()=>{onReact(member,r);setOpen(false);}} style={{
              fontSize:22,cursor:"pointer",background:"none",border:"none",
              padding:"4px",borderRadius:8,
              transform:(memberReactions[r]||[]).includes(currentUser)?"scale(1.3)":"scale(1)",
              transition:"transform 0.1s",
            }}>{r}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PACK GOALS BOARD ─────────────────────────────────────────────────────────
function PackGoals({currentUser,packGoals,profiles,members,onAddGoal,onCheer,onDeleteGoal}){
  const [open,setOpen]=useState(false);
  const [text,setText]=useState("");
  const sub=()=>{if(!text.trim())return;onAddGoal(text.trim());setText("");setOpen(false);};
  const myGoal=packGoals.find(g=>g.author===currentUser);
  // Combine pack goals + personal goals from profiles
  const profileGoals=members.filter(m=>profiles[m]?.personalGoal&&profiles[m]?.shareGoal&&!packGoals.find(g=>g.author===m)).map(m=>({
    id:`profile_${m}`,author:m,text:profiles[m].personalGoal,cheers:[],fromProfile:true
  }));
  const allGoals=[...packGoals,...profileGoals];
  return(
    <div style={{margin:"8px 16px 0"}}>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:3,color:"var(--muted)",marginBottom:8}}>PACK GOALS</div>
      {allGoals.length===0&&!open&&(
        <div style={{textAlign:"center",padding:"16px",background:"var(--bg3)",borderRadius:14,border:"1px dashed var(--border)",marginBottom:8}}>
          <div style={{fontSize:12,color:"var(--muted)"}}>No goals posted yet. Set one for the pack to see!</div>
        </div>
      )}
      {allGoals.map(g=>(
        <div key={g.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"var(--bg3)",borderRadius:12,border:"1px solid var(--border)",marginBottom:8}}>
          <div style={{fontSize:22}}>🎯</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:2}}>{g.text}</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>{g.author}{g.date&&<span style={{marginLeft:6,opacity:0.6}}>· {fmtDate(g.date)}</span>}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={()=>onCheer(g.id,currentUser)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,opacity:(g.cheers||[]).includes(currentUser)?1:0.4}}>🔥</button>
            <span style={{fontSize:12,color:"var(--muted)"}}>{(g.cheers||[]).length||""}</span>
            {g.author===currentUser&&<button onClick={()=>onDeleteGoal(g.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:16,marginLeft:2}}>×</button>}
          </div>
        </div>
      ))}
      {!myGoal&&!open&&(
        <button onClick={()=>setOpen(true)} style={{width:"100%",padding:"10px",background:"rgba(124,92,191,0.1)",border:"1px dashed rgba(124,92,191,0.4)",borderRadius:12,cursor:"pointer",color:"var(--accent2)",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2}}>+ SET YOUR GOAL</button>
      )}
      {open&&(
        <div style={{display:"flex",gap:8,marginTop:4}}>
          <input className="input" placeholder="My goal is..." value={text} onChange={e=>setText(e.target.value)} maxLength={80} autoFocus style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&sub()}/>
          <button onClick={sub} disabled={!text.trim()} style={{padding:"10px 14px",background:"var(--accent)",border:"none",borderRadius:10,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13}}>POST</button>
          <button onClick={()=>{setOpen(false);setText("");}} style={{padding:"10px 12px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",color:"var(--muted)",fontSize:13}}>✕</button>
        </div>
      )}
    </div>
  );
}

function PackTab({currentUser,members,profiles,history,sharedData,onLogWorkout,onOpenAITrainer,onOpenNutrition,onEditWorkout,adminName,onOpenAdmin,packGoals,onAddGoal,onCheer,onDeleteGoal,onOpenProfile,reactions,onReact,weeklyRecap,onDismissRecap}){
  const key=todayStr(),td=sharedData[key]||{},my=td[currentUser],str=getStreak(history,currentUser,profiles[currentUser]),tot=getTotalWorkouts(history,currentUser),we=isRestDay(key,profiles[currentUser]);
  const sorted=[...members].sort((a,b)=>{const sa=getStreak(history,a),sb=getStreak(history,b);if(sb!==sa)return sb-sa;return b===currentUser?1:a===currentUser?-1:0;});

  return(
    <div>
      {/* Quote */}
      <div style={{padding:"14px 16px 8px"}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:3,color:"var(--muted)",marginBottom:5}}>TODAY'S HOWL</div>
        <div style={{fontSize:14,color:"rgba(255,255,255,0.7)",fontStyle:"italic",lineHeight:1.5}}>"{getQuote()}"</div>
      </div>


      {/* Log workout / rest day */}
      <div style={{padding:"10px 16px 4px"}}>
        {we?(
          <div style={{padding:"12px 16px",background:"var(--bg3)",borderRadius:14,textAlign:"center"}}><div style={{fontSize:24,marginBottom:4}}>😴</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--muted)"}}>REST DAY — YOU EARNED IT</div></div>
        ):!my?.done?(
          <button className="btn-primary" onClick={onLogWorkout}>🐺 LOG TODAY'S WORKOUT</button>
        ):(
          <div style={{background:"rgba(124,92,191,0.1)",border:"1px solid rgba(124,92,191,0.3)",borderRadius:16,padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--accent2)",marginBottom:4}}>✓ LOGGED · {my.time}</div>
                {Array.isArray(my.summary)
                  ?my.summary.map((line,i)=><div key={i} style={{fontSize:13,color:"var(--green)",lineHeight:1.6}}>{line}</div>)
                  :<div style={{fontSize:13,color:"var(--green)"}}>{my.workoutLabel}</div>
                }
                {my.note&&<div style={{fontSize:11,color:"var(--muted)",marginTop:4,fontStyle:"italic"}}>"{my.note}"</div>}
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <button className="btn-ghost" onClick={onLogWorkout} style={{flex:1,fontSize:12}}>+ Log Another</button>
              <button onClick={onEditWorkout} style={{padding:"8px 14px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",color:"var(--muted)",fontSize:12}}>✏️ Edit</button>
            </div>
          </div>
        )}
      </div>

      {/* ── WOLFMODE BUTTON ── */}
      <div style={{padding:"6px 16px 0"}}>
        <style>{`
          @keyframes wolfPulse {
            0%   { box-shadow: 0 0 0 0 rgba(255,107,53,0.5), 0 0 12px rgba(124,92,191,0.4); }
            50%  { box-shadow: 0 0 0 8px rgba(255,107,53,0), 0 0 24px rgba(255,107,53,0.3); }
            100% { box-shadow: 0 0 0 0 rgba(255,107,53,0), 0 0 12px rgba(124,92,191,0.4); }
          }
        `}</style>
        <button onClick={onOpenAITrainer} style={{
          width:"100%",
          padding:"14px 16px",
          background:"linear-gradient(135deg, rgba(255,107,53,0.18), rgba(124,92,191,0.2))",
          border:"1px solid rgba(255,107,53,0.5)",
          borderRadius:16,
          cursor:"pointer",
          display:"flex",alignItems:"center",gap:12,
          animation:"wolfPulse 2.5s ease-in-out infinite",
        }}>
          <div style={{
            width:42,height:42,borderRadius:12,
            background:"linear-gradient(135deg, rgba(255,107,53,0.3), rgba(124,92,191,0.3))",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:22,flexShrink:0,
          }}>🔥</div>
          <div style={{textAlign:"left",flex:1}}>
            <div style={{
              fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3,
              background:"linear-gradient(90deg, #ff6b35, #c084fc)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              lineHeight:1.1,
            }}>WOLFMODE</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:1}}>Train Smarter · AI-Powered Workouts</div>
          </div>
          <div style={{fontSize:18,color:"rgba(255,107,53,0.7)"}}>›</div>
        </button>

        {/* Nutrition shortcut — only shows if user has enabled the coach */}
        {profiles[currentUser]?.aiTrainer?.coach?.enabled&&profiles[currentUser]?.aiTrainer?.coach?.stats&&(
          <button onClick={onOpenNutrition} style={{
            width:"100%",marginTop:8,
            padding:"10px 14px",
            background:"rgba(46,204,113,0.06)",
            border:"1px solid rgba(46,204,113,0.25)",
            borderRadius:12,
            cursor:"pointer",
            display:"flex",alignItems:"center",gap:10,
          }}>
            <span style={{fontSize:18}}>🥩</span>
            <div style={{textAlign:"left",flex:1}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,color:"var(--green)"}}>NUTRITION & SUPPS</div>
              <div style={{fontSize:10,color:"var(--muted)"}}>
                {profiles[currentUser]?.aiTrainer?.coach?.lastPlan
                  ? `Last plan: ${new Date(profiles[currentUser].aiTrainer.coach.lastPlan.generatedAt).toLocaleDateString()}`
                  : "Tap to generate your plan"}
              </div>
            </div>
            <div style={{fontSize:14,color:"var(--green)"}}>›</div>
          </button>
        )}
      </div>

      {/* ── SINGLE COLUMN MEMBER CARDS ── */}
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:3,color:"var(--muted)",padding:"6px 16px 8px"}}>THE PACK</div>
      <div style={{display:"flex",flexDirection:"column",gap:10,padding:"0 16px 16px"}}>
        {sorted.map((m,i)=>{
          const done=!!td[m]?.done,isMe=m===currentUser;
          const ms=getStreak(history,m,profiles[m]);
          const wt=td[m]?.workoutIcon||"";
          const restToday=isRestDay(key,profiles[m]);
          return(
            <div key={m} onClick={isMe?onOpenProfile:undefined} style={{
              position:"relative",borderRadius:18,overflow:"hidden",
              cursor:isMe?"pointer":"default",
              background:done
                ?"linear-gradient(135deg,rgba(46,204,113,0.12),rgba(46,204,113,0.04))"
                :restToday?"rgba(255,255,255,0.03)"
                :isMe?"rgba(124,92,191,0.1)":"var(--card)",
              border:done?"1px solid rgba(46,204,113,0.3)":isMe?"1px solid rgba(124,92,191,0.35)":"1px solid var(--border)",
              padding:"12px 14px",
              paddingBottom:!isMe?"44px":"12px",
              display:"flex",alignItems:"center",gap:12,
              minHeight:80,
            }}>
              {/* left accent bar with vertical status */}
              <div style={{position:"absolute",left:0,top:0,bottom:0,width:26,background:done?"rgba(46,204,113,0.12)":restToday?"rgba(124,92,191,0.1)":"rgba(255,255,255,0.02)",borderRadius:"18px 0 0 18px",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:done?"linear-gradient(180deg,#2ecc71,#27ae60)":isMe?"linear-gradient(180deg,var(--accent),var(--orange))":restToday?"linear-gradient(180deg,var(--accent),#5a3fa0)":"transparent",borderRadius:"18px 0 0 18px"}}/>
                <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:9,letterSpacing:2,color:done?"var(--green)":restToday?"var(--accent2)":"var(--muted)",writingMode:"vertical-rl",textOrientation:"mixed",transform:"rotate(180deg)",marginLeft:3}}>
                  {done?"DONE":restToday?"REST":"PENDING"}
                </span>
              </div>
              {/* rank */}
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,color:"var(--muted)",width:20,textAlign:"center",flexShrink:0}}>{i+1}</div>
              {/* avatar */}
              <AvatarDisplay profile={profiles[m]} size={44}/>
              {/* info */}
              <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                  <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:1,color:isMe?"var(--accent2)":"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>{m}</span>
                  {isMe&&<span style={{fontSize:10,color:"var(--accent2)",background:"rgba(124,92,191,0.2)",padding:"1px 5px",borderRadius:4,flexShrink:0}}>YOU</span>}
                </div>
                <div style={{fontSize:11,color:"var(--muted)"}}>🔥 {ms} days · {getTotalWorkouts(history,m)} sessions</div>
                {done&&(
                  <div style={{marginTop:3}}>
                    {Array.isArray(td[m]?.summary)
                      ?td[m].summary.map((line,i)=><div key={i} style={{fontSize:11,color:"var(--green)",lineHeight:1.5,wordBreak:"break-word"}}>{line}</div>)
                      :<div style={{fontSize:11,color:"var(--green)",wordBreak:"break-word"}}>{td[m]?.workoutLabel||""}</div>
                    }
                  </div>
                )}
              </div>


              {isMe&&<div style={{position:"absolute",top:10,right:12,fontSize:11,color:"var(--muted)"}}>👤</div>}
            </div>
          );
        })}
      </div>

      {/* Weekly recap dismissible card */}
      {weeklyRecap&&!weeklyRecap.dismissed&&(
        <div style={{margin:"0 16px 12px",padding:"14px 16px",background:"rgba(124,92,191,0.1)",border:"1px solid rgba(124,92,191,0.3)",borderRadius:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,color:"var(--accent2)"}}>📊 LAST WEEK RECAP</div>
            <button onClick={onDismissRecap} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:18,lineHeight:1}}>×</button>
          </div>
          {weeklyRecap.stats?.map((s,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <AvatarDisplay profile={profiles[s.name]} size={24}/>
                <span style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:100}}>{s.name}</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:12,color:"var(--muted)"}}>{s.days} days</span>
                <span style={{fontSize:12,color:s.days>=5?"var(--green)":s.days>=3?"var(--orange)":"var(--red)",fontWeight:700}}>
                  {s.days>=5?"🔥 Crushed it":s.days>=3?"💪 Solid":s.days>0?"📈 Keep going":"😴 Rest week"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pack Goals — includes personal goals from profiles */}
      <PackGoals currentUser={currentUser} packGoals={packGoals} profiles={profiles} members={members} onAddGoal={onAddGoal} onCheer={onCheer} onDeleteGoal={onDeleteGoal}/>
      <div style={{height:16}}/>
    </div>
  );
}

function FeedPost({post:p, currentUser, profiles, onLike, onDelete, onComment, onDeleteComment}){
  const [showComments,setShowComments]=useState(false);
  const [commentText,setCommentText]=useState("");
  const [showLikes,setShowLikes]=useState(false);
  const liked=(p.likes||[]).includes(currentUser);
  const isMe=p.author===currentUser;
  const comments=p.comments||[];

  const submitComment=()=>{
    if(!commentText.trim())return;
    onComment(p.id,commentText.trim());
    setCommentText("");
  };

  return(
    <div className="card">
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <AvatarDisplay profile={profiles[p.author]} size={36}/>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1}}>{p.author}</div>
          <div style={{fontSize:11,color:"var(--muted)"}}>{fmtTime(p.ts)}</div>
        </div>
        {isMe&&<button onClick={()=>onDelete(p.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:20,lineHeight:1}}>×</button>}
      </div>

      {/* Post text */}
      {p.text&&<div style={{fontSize:15,lineHeight:1.5,marginBottom:p.photo?8:12}}>{p.text}</div>}
      {p.photo&&<img src={p.photo} alt="post" style={{width:"100%",borderRadius:10,marginBottom:12,maxHeight:300,objectFit:"cover"}}/>}

      {/* Actions row */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:4}}>
        <button onClick={()=>onLike(p.id)} style={{background:"none",border:"none",cursor:"pointer",color:liked?"var(--orange)":"var(--muted)",display:"flex",alignItems:"center",gap:4,fontSize:13}}>
          {liked?"🔥":"🤍"} {(p.likes||[]).length||0} {(p.likes||[]).length===1?"like":"likes"}
        </button>
        {(p.likes||[]).length>0&&(
          <button onClick={()=>setShowLikes(s=>!s)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:12,textDecoration:"underline"}}>
            {showLikes?"hide":"who liked?"}
          </button>
        )}
        <button onClick={()=>setShowComments(s=>!s)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",display:"flex",alignItems:"center",gap:4,fontSize:13,marginLeft:"auto"}}>
          💬 {comments.length>0?comments.length:"Reply"}
        </button>
      </div>
      {showLikes&&(p.likes||[]).length>0&&(
        <div style={{marginBottom:8,padding:"8px 10px",background:"var(--bg3)",borderRadius:10,display:"flex",flexWrap:"wrap",gap:6}}>
          {(p.likes||[]).map(name=>(
            <div key={name} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 8px",background:"var(--bg2)",borderRadius:20,fontSize:12}}>
              <AvatarDisplay profile={profiles[name]} size={16}/>
              <span>{name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Comments */}
      {(showComments||comments.length>0)&&(
        <div style={{borderTop:"1px solid var(--border)",paddingTop:10}}>
          {/* Existing comments */}
          {comments.map((c,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
              <AvatarDisplay profile={profiles[c.author]} size={26}/>
              <div style={{flex:1,background:"var(--bg3)",borderRadius:10,padding:"7px 10px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                  <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,color:"var(--accent2)"}}>{c.author}</span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:10,color:"var(--muted)"}}>{fmtTime(c.ts)}</span>
                    {c.author===currentUser&&(
                      <button onClick={()=>onDeleteComment(p.id,i)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:14,lineHeight:1,padding:0}}>×</button>
                    )}
                  </div>
                </div>
                <div style={{fontSize:13,color:"var(--text)",lineHeight:1.4}}>{c.text}</div>
              </div>
            </div>
          ))}

          {/* Comment input */}
          {showComments&&(
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <AvatarDisplay profile={profiles[currentUser]} size={26}/>
              <div style={{flex:1,display:"flex",gap:6}}>
                <input className="input" placeholder="Write a comment..." value={commentText}
                  onChange={e=>setCommentText(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&submitComment()}
                  style={{flex:1,padding:"8px 12px",fontSize:13}}/>
                <button onClick={submitComment} disabled={!commentText.trim()} style={{
                  padding:"8px 12px",background:"var(--accent)",border:"none",borderRadius:10,
                  cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,flexShrink:0
                }}>POST</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FeedTab({currentUser,profiles,feed,onPost,onLike,onDelete,onComment,onDeleteComment}){
  const [open,setOpen]=useState(false);
  const [text,setText]=useState("");
  const [photo,setPhoto]=useState(null);
  const photoRef=useRef();
  const sub=()=>{if(!text.trim()&&!photo)return;onPost(text.trim(),photo);setText("");setPhoto(null);setOpen(false);};
  return(
    <div>
      <div style={{padding:"12px 16px 8px"}}>
        <button className="btn-primary" onClick={()=>setOpen(true)}>💬 POST TO THE PACK</button>
      </div>
      {feed.length===0&&(
        <div style={{textAlign:"center",padding:"40px 20px",color:"var(--muted)"}}>
          <div style={{fontSize:40,marginBottom:12}}>🐺</div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>THE FEED IS EMPTY</div>
        </div>
      )}
      {feed.map(p=>(
        <FeedPost key={p.id} post={p} currentUser={currentUser} profiles={profiles}
          onLike={onLike} onDelete={onDelete} onComment={onComment} onDeleteComment={onDeleteComment}/>
      ))}
      {open&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setOpen(false)}>
          <div className="modal">
            <div className="modal-handle"/>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:14}}>POST TO THE PACK</div>
            <textarea className="input" rows={3} placeholder="What's on your mind, wolf?..."
              value={text} onChange={e=>setText(e.target.value)} style={{resize:"none",marginBottom:10}} autoFocus/>
            {/* Photo preview */}
            {photo&&(
              <div style={{position:"relative",marginBottom:10}}>
                <img src={photo} alt="post" style={{width:"100%",borderRadius:10,maxHeight:200,objectFit:"cover"}}/>
                <button onClick={()=>setPhoto(null)} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:"50%",width:24,height:24,cursor:"pointer",color:"#fff",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>
            )}
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <button onClick={()=>photoRef.current.click()} style={{padding:"8px 14px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",color:"var(--muted)",fontSize:13}}>📷 Photo</button>
              <input ref={photoRef} type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const raw=await readFileAsDataURL(f);const comp=await compressImage(raw,600);setPhoto(comp);}}/>
            </div>
            <button className="btn-primary" onClick={sub} disabled={!text.trim()&&!photo}>POST 🐺</button>
          </div>
        </div>
      )}
    </div>
  );
}

function GymTab({currentUser,gymSlots,onBook,onCancel}){
  const [sel,setSel]=useState(todayStr());
  const [bookingOpen,setBookingOpen]=useState(false);
  const [selStartIdx,setSelStartIdx]=useState(null);
  const [selDuration,setSelDuration]=useState(1);
  const [conflictErr,setConflictErr]=useState(false);
  const showConflict=()=>{setConflictErr(true);setTimeout(()=>setConflictErr(false),3000);}; // index into GYM_DURATIONS
  const dates=next7Days();
  const daySlots=gymSlots.filter(s=>s.date===sel);
  const mySlots=gymSlots.filter(s=>s.bookedBy===currentUser&&s.date>=todayStr());

  // Check if a half-hour slot is occupied by any booking
  const getSlotBooking=(slot)=>daySlots.find(s=>slotOverlaps(slot.h,slot.m,s));
  const isSlotMine=(slot)=>{const b=getSlotBooking(slot);return b&&b.bookedBy===currentUser;};

  const handleBook=()=>{
    if(selStartIdx===null)return;
    const slot=GYM_HOURS[selStartIdx];
    const durMins=GYM_DURATION_MINS[selDuration];
    // Check no conflicts in the chosen range
    const slotsNeeded=GYM_HOURS.filter((_,i)=>{
      const s=GYM_HOURS[i];
      const sStart=s.h*60+s.m;
      const bStart=slot.h*60+slot.m;
      return sStart>=bStart&&sStart<bStart+durMins;
    });
    const conflict=slotsNeeded.some(s=>getSlotBooking(s)&&!isSlotMine(s));
    if(conflict){showConflict();return;}
    onBook(sel,slot,durMins,slot.label+" – "+formatEndTime(slot.h,slot.m,durMins));
    setBookingOpen(false);setSelStartIdx(null);
  };

  const formatEndTime=(h,m,durMins)=>{
    const total=h*60+m+durMins;
    const eh=Math.floor(total/60),em=total%60;
    return em===0?`${eh===12?12:eh%12}:00 ${eh<12?"AM":"PM"}`:`${eh===12?12:eh%12}:30 ${eh<12?"AM":"PM"}`;
  };

  return(
    <div>
      {/* Date picker */}
      <div style={{display:"flex",gap:8,padding:"12px 16px",overflowX:"auto"}}>
        {dates.map(d=>{const act=d===sel,dd=new Date(d+"T00:00:00"),we=isWeekend(d);return<button key={d} onClick={()=>setSel(d)} style={{flexShrink:0,minWidth:56,padding:"8px 10px",borderRadius:12,cursor:"pointer",textAlign:"center",background:act?"linear-gradient(135deg,var(--accent),var(--orange))":"var(--bg3)",border:"none",color:we&&!act?"var(--muted)":"#fff",opacity:we?.6:1}}><div style={{fontSize:10,opacity:.8}}>{dd.toLocaleDateString("en-US",{weekday:"short"})}</div><div style={{fontSize:17,fontWeight:700}}>{dd.getDate()}</div>{we&&<div style={{fontSize:9,opacity:.7}}>REST</div>}</button>;})}
      </div>

      {/* My reservations */}
      {mySlots.length>0&&(
        <>
          <div className="section-label">MY RESERVATIONS</div>
          {mySlots.map(s=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,margin:"0 16px 8px",padding:"12px 14px",background:"rgba(124,92,191,0.1)",borderRadius:12,border:"1px solid rgba(124,92,191,0.25)"}}>
              <span style={{fontSize:20}}>🏋️</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1}}>{s.displayTime||s.time}</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>{fmtDate(s.date)}</div>
              </div>
              <button onClick={()=>onCancel(s.id)} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,padding:"5px 10px",cursor:"pointer",color:"var(--muted)",fontSize:12}}>Cancel</button>
            </div>
          ))}
        </>
      )}

      <div className="section-label">{fmtDate(sel)}{isWeekend(sel)?" — REST DAY":" — 6:00 AM – 8:00 PM"}</div>

      {isWeekend(sel)||(!isGymOpen()&&sel===todayStr())?(
        <div style={{textAlign:"center",padding:"30px 20px",color:"var(--muted)"}}>
          <div style={{fontSize:40,marginBottom:8}}>{isWeekend(sel)?"😴":"🔒"}</div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:2}}>{isWeekend(sel)?"GYM CLOSED ON WEEKENDS":"GARAGE GYM CLOSED"}</div>
          <div style={{fontSize:12,color:"var(--muted)",marginTop:6}}>Hours: 6:00 AM – 8:00 PM</div>
        </div>
      ):(
        <>
          {/* Book button */}
          {!bookingOpen&&(
            <div style={{padding:"0 16px 12px"}}>
              <button className="btn-primary" onClick={()=>setBookingOpen(true)}>🏋️ RESERVE GYM TIME</button>
            </div>
          )}

          {/* Booking picker */}
          {bookingOpen&&(
            <div style={{margin:"0 16px 12px",padding:"14px",background:"var(--card)",borderRadius:14,border:"1px solid var(--border)"}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:2,marginBottom:10}}>PICK START TIME</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:12,maxHeight:180,overflowY:"auto"}}>
                {GYM_HOURS.map((slot,i)=>{
                  const booking=getSlotBooking(slot);
                  const taken=!!booking&&booking.bookedBy!==currentUser;
                  const mine=isSlotMine(slot);
                  const sel2=selStartIdx===i;
                  return(
                    <button key={i} onClick={()=>!taken&&setSelStartIdx(i)} style={{
                      padding:"6px 4px",borderRadius:8,cursor:taken?"default":"pointer",textAlign:"center",
                      background:sel2?"rgba(124,92,191,0.3)":taken?"rgba(231,76,60,0.1)":mine?"rgba(124,92,191,0.1)":"var(--bg3)",
                      border:sel2?"1px solid var(--accent)":taken?"1px solid rgba(231,76,60,0.3)":mine?"1px solid rgba(124,92,191,0.3)":"1px solid var(--border)",
                      opacity:taken?0.7:1,
                    }}>
                      <div style={{fontSize:11,color:sel2?"var(--accent2)":taken?"var(--red)":mine?"var(--accent2)":"var(--text)"}}>{slot.label}</div>
                      {taken&&<div style={{fontSize:9,color:"var(--red)",fontWeight:700}}>BOOKED</div>}
                      {mine&&<div style={{fontSize:9,color:"var(--accent2)"}}>YOURS</div>}
                    </button>
                  );
                })}
              </div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,marginBottom:8}}>DURATION</div>
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                {GYM_DURATIONS.map((d,i)=>(
                  <button key={i} onClick={()=>setSelDuration(i)} style={{flex:1,padding:"8px 4px",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Bebas Neue',cursive",letterSpacing:1,background:selDuration===i?"rgba(124,92,191,0.2)":"var(--bg3)",border:selDuration===i?"1px solid var(--accent)":"1px solid var(--border)",color:selDuration===i?"var(--accent2)":"var(--muted)"}}>{d}</button>
                ))}
              </div>
              {selStartIdx!==null&&(
                <div style={{fontSize:12,color:"var(--accent2)",marginBottom:10,padding:"8px 10px",background:"rgba(124,92,191,0.1)",borderRadius:8}}>
                  📅 {GYM_HOURS[selStartIdx].label} – {formatEndTime(GYM_HOURS[selStartIdx].h,GYM_HOURS[selStartIdx].m,GYM_DURATION_MINS[selDuration])} ({GYM_DURATIONS[selDuration]})
                </div>
              )}
              {conflictErr&&<div style={{padding:"8px 12px",background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:8,fontSize:12,color:"var(--red)",marginBottom:8}}>⚠️ That time overlaps with an existing booking. Pick a different time.</div>}
              <div style={{display:"flex",gap:8}}>
                <button className="btn-primary" onClick={handleBook} disabled={selStartIdx===null} style={{flex:1}}>CONFIRM BOOKING</button>
                <button className="btn-ghost" onClick={()=>{setBookingOpen(false);setSelStartIdx(null);setConflictErr(false);}} style={{flex:1}}>Cancel</button>
              </div>
            </div>
          )}

          {/* Timeline view */}
          <div style={{padding:"0 16px 16px"}}>
            {GYM_HOURS.map((slot,i)=>{
              const booking=getSlotBooking(slot);
              const taken=!!booking;
              const mine=taken&&booking.bookedBy===currentUser;
              // Only show on-the-hour slots to keep it clean, or booked slots
              if(!taken&&slot.m!==0)return null;
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,padding:"10px 12px",background:mine?"rgba(124,92,191,0.1)":taken?"rgba(231,76,60,0.08)":"var(--card)",borderRadius:10,border:mine?"1px solid rgba(124,92,191,0.3)":taken?"1px solid rgba(231,76,60,0.25)":"1px solid var(--border)"}}>
                  <div style={{width:60,fontFamily:"'Bebas Neue',cursive",fontSize:12,color:mine?"var(--accent2)":taken?"var(--red)":"var(--muted)"}}>{slot.label}</div>
                  <div style={{flex:1,fontSize:12,color:mine?"var(--accent2)":taken?"var(--text)":"var(--muted)"}}>
                    {taken?`${booking.bookedBy} · ${booking.displayTime||booking.time}`:"Open"}
                  </div>
                  {taken&&<div style={{padding:"3px 10px",borderRadius:20,background:mine?"rgba(124,92,191,0.2)":"rgba(231,76,60,0.15)",border:mine?"1px solid rgba(124,92,191,0.4)":"1px solid rgba(231,76,60,0.3)",fontSize:11,color:mine?"var(--accent2)":"var(--red)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>{mine?"YOURS":"BOOKED"}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function EditChallengeModal({challenge,members,onSave,onClose}){
  const isDR = challenge.goalType==="dateRange";
  const [title,setTitle]=useState(challenge.title||"");
  const [goal,setGoal]=useState(challenge.goal||30);
  const [unit,setUnit]=useState(challenge.unit||"reps");
  const [startDate,setStartDate]=useState(challenge.startDate||"");
  const [endDate,setEndDate]=useState(challenge.endDate||"");
  const [penalty,setPenalty]=useState(challenge.penalty||"");
  const [penaltyAmt,setPenaltyAmt]=useState(challenge.penaltyAmt||"");
  const [forfeitCap,setForfeitCap]=useState(challenge.forfeitCap||"");
  const [paymentRecipient,setPaymentRecipient]=useState(challenge.paymentRecipient||"creator");
  const [parts,setParts]=useState(Object.keys(challenge.participants||{}));
  const toggle=m=>setParts(p=>p.includes(m)?p.filter(x=>x!==m):[...p,m]);

  const save=()=>{
    if(!title.trim()) return;
    const np={...challenge.participants};
    parts.forEach(m=>{
      if(!np[m]){
        // New member — set as pending invite, NOT auto-accepted
        np[m]={progress:0,done:false,status:"pending"};
      }
    });
    Object.keys(np).forEach(m=>{if(!parts.includes(m))delete np[m];});
    const newGoal=isDR&&startDate&&endDate?getWeekdays(startDate,endDate).length:Number(goal);
    onSave({...challenge,title:title.trim(),goal:newGoal,unit:isDR?"days":unit,startDate:isDR?startDate:challenge.startDate,endDate:isDR?endDate:challenge.endDate,penalty:penalty.trim(),penaltyAmt:penaltyAmt?Number(penaltyAmt):0,forfeitCap:forfeitCap?Number(forfeitCap):0,participants:np});
    onClose();
  };

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:14}}>EDIT CHALLENGE</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Challenge name</div>
            <input className="input" value={title} onChange={e=>setTitle(e.target.value)} maxLength={50}/>
          </div>
          {isDR?(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Start date</div><input className="input" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></div>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>End date</div><input className="input" type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></div>
              {startDate&&endDate&&<div style={{gridColumn:"1/-1",fontSize:12,color:"var(--accent2)",background:"rgba(124,92,191,0.1)",padding:"8px 12px",borderRadius:8}}>📅 {getWeekdays(startDate,endDate).length} weekdays</div>}
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Goal amount</div><input className="input" type="number" value={goal} onChange={e=>setGoal(e.target.value)} min={1}/></div>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Unit</div><select className="input" value={unit} onChange={e=>setUnit(e.target.value)} style={{appearance:"none"}}>{["reps","miles","minutes","lbs","kg","sessions","calories"].map(u=><option key={u}>{u}</option>)}</select></div>
            </div>
          )}
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Penalty</div><input className="input" placeholder='e.g. "Buys lunch"' value={penalty} onChange={e=>setPenalty(e.target.value)} maxLength={80}/></div>
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>$ per missed workout <span style={{fontSize:11}}>(optional)</span></div><input className="input" type="number" placeholder="optional — e.g. 5" value={penaltyAmt} onChange={e=>setPenaltyAmt(e.target.value)} min={0}/></div>
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Forfeit cap $ (optional)</div><input className="input" type="number" placeholder="e.g. 50" value={forfeitCap} onChange={e=>setForfeitCap(e.target.value)} min={0}/></div>
          <div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>Payments go to</div>
            <div style={{display:"flex",gap:8}}>
              {[{v:"creator",l:"Creator"},{v:"admin",l:"Admin"}].map(({v,l})=>(
                <button key={v} onClick={()=>setPaymentRecipient(v)} style={{flex:1,padding:"8px",borderRadius:10,cursor:"pointer",fontSize:12,background:paymentRecipient===v?"rgba(124,92,191,0.2)":"var(--bg3)",border:paymentRecipient===v?"1px solid var(--accent)":"1px solid var(--border)",color:paymentRecipient===v?"var(--accent2)":"var(--muted)"}}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>Participants</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {members.map(m=>(
                <button key={m} onClick={()=>toggle(m)} style={{padding:"6px 12px",borderRadius:20,cursor:"pointer",fontSize:13,background:parts.includes(m)?"rgba(124,92,191,0.2)":"var(--bg3)",border:parts.includes(m)?"1px solid var(--accent)":"1px solid var(--border)",color:parts.includes(m)?"var(--accent2)":"var(--muted)"}}>
                  {parts.includes(m)?"✓ ":""}{m}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary" onClick={save} disabled={!title.trim()}>SAVE CHANGES</button>
          <button className="btn-ghost" style={{width:"100%"}} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function PenaltyTracker({challenge:c,history,profiles,currentUser,adminName,onMarkPaid,onLogPayment}){
  if(!c.startDate||!c.endDate)return null;
  const acceptedParts=Object.keys(c.participants||{}).filter(m=>c.participants[m]?.status!=="pending");
  if(acceptedParts.length===0)return null;
  const hasPenalty=c.penaltyAmt>0;
  if(!hasPenalty)return null;

  const penalties=calcPenalties(c,history,profiles);
  const payments=c.payments||{}; // {memberName: [{amount, method, date, ts}]}
  const isAdmin=currentUser===adminName||currentUser===c.createdBy;

  // Total earned (all missed workouts regardless of payments) = prize pot
  const grandTotal=acceptedParts.reduce((sum,m)=>{
    const p=penalties[m]||{};
    return sum+(p.forfeited?c.forfeitCap||0:p.totalOwed||0);
  },0);

  // How much each person has paid
  const paidAmount=m=>(payments[m]||[]).reduce((s,p)=>s+p.amount,0);
  const isFullyPaid=m=>paidAmount(m)>=(penalties[m]?.totalOwed||0)&&(penalties[m]?.totalOwed||0)>0;

  const [expandedMember,setExpandedMember]=useState(null);
  const [partialAmt,setPartialAmt]=useState("");

  const [zelleConfirm,setZelleConfirm]=useState(false);
  const [zelleAmt,setZelleAmt]=useState(0);

  const [zelleCopied,setZelleCopied]=useState(false);
  const handleZelle=(amt)=>{
    // Just open Zelle website + show confirmation — no auto-copy
    window.open("https://www.zellepay.com","_blank");
    setZelleAmt(amt);
    setZelleConfirm(true);
    setZelleCopied(false);
  };
  const copyZelleContact=()=>{
    const recipientName=c.paymentRecipient==="admin"?adminName:c.createdBy;
    const zelleContact=profiles[recipientName]?.zelleContact||"";
    if(zelleContact){
      navigator.clipboard?.writeText(zelleContact).then(()=>{
        setZelleCopied(true);
      }).catch(()=>{setZelleCopied(true);}); // still show copied even if clipboard API fails
    }
  };

  const confirmZellePayment=()=>{
    onLogPayment(c.id,currentUser,zelleAmt,"Zelle");
    setZelleConfirm(false);setZelleAmt(0);setPartialAmt("");
  };



  return(
    <div style={{marginTop:12,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}}>

      {/* ── EVERYONE VIEW: summary table ── */}
      <div style={{padding:"8px 12px",background:"rgba(255,255,255,0.03)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span>💸</span>
          <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,color:"var(--muted)"}}>PENALTY TRACKER — ${c.penaltyAmt}/MISS</span>
        </div>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1,color:"var(--gold)"}}>🏆 POT: ${grandTotal}</div>
      </div>

      {/* Column headers */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 70px 60px",padding:"5px 12px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <span style={{fontSize:10,color:"var(--muted)"}}>Member</span>
        <span style={{fontSize:10,color:"var(--muted)",textAlign:"center"}}>This week</span>
        <span style={{fontSize:10,color:"var(--red)",textAlign:"right",fontWeight:700}}>Total</span>
      </div>


      {acceptedParts.map(m=>{
        const p=penalties[m]||{totalOwed:0,byWeek:{}};
        const forfeited=c.participants[m]?.forfeited||false;
        // Only count days that are fully over — yesterday and before
    const yesterday=(()=>{const d=new Date();d.setDate(d.getDate()-1);return localDateStr(d);})();
    const cap=yesterday<c.endDate?yesterday:c.endDate;
        const currentWk=getWeekStart(todayStr());
        const wkAmt=p.byWeek?.[currentWk]||0;
        const totalAmt=forfeited?c.forfeitCap||0:p.totalOwed||0;
        const paid=paidAmount(m);
        const fullPaid=isFullyPaid(m);
        const isMe=m===currentUser;
        const myPayments=payments[m]||[];

        return(
          <div key={m}>
            {/* Summary row — visible to everyone */}
            <div onClick={()=>isMe||isAdmin?setExpandedMember(expandedMember===m?null:m):null}
              style={{display:"grid",gridTemplateColumns:"1fr 70px 60px",padding:"9px 12px",borderBottom:"1px solid rgba(255,255,255,0.04)",alignItems:"center",cursor:isMe||isAdmin?"pointer":"default",background:expandedMember===m?"rgba(255,255,255,0.03)":"transparent"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <AvatarDisplay profile={profiles[m]} size={22}/>
                <span style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:100}}>{m}</span>
                {forfeited&&<span style={{fontSize:10}}>🏳️</span>}
                {fullPaid&&<span style={{fontSize:10,color:"var(--green)",fontWeight:700}}>✓</span>}
                {isMe&&<span style={{fontSize:9,color:"var(--accent2)",background:"rgba(124,92,191,0.2)",padding:"1px 4px",borderRadius:3}}>you</span>}
              </div>
              <div style={{textAlign:"center"}}>
                {wkAmt>0?<span style={{fontSize:12,color:"var(--red)",fontWeight:700}}>${wkAmt}</span>:<span style={{fontSize:12,color:"var(--green)"}}>✓</span>}
              </div>
              <div style={{textAlign:"right"}}>
                {totalAmt>0?(
                  <span style={{fontSize:12,fontWeight:700,color:fullPaid?"var(--green)":"var(--red)"}}>
                    {fullPaid?"✓ Paid":`$${totalAmt}`}
                  </span>
                ):<span style={{fontSize:12,color:"var(--green)"}}>$0</span>}
              </div>
            </div>

            {/* Expanded detail — only for the member themselves or admin */}
            {expandedMember===m&&(isMe||isAdmin)&&totalAmt>0&&(
              <div style={{padding:"12px 14px",background:"rgba(0,0,0,0.15)",borderBottom:"1px solid var(--border)"}}>

                {/* Progress */}
                {paid>0&&<div style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:11,color:"var(--muted)"}}>${paid} paid of ${totalAmt}</span>
                    <span style={{fontSize:11,color:"var(--muted)"}}>{Math.round((paid/totalAmt)*100)}%</span>
                  </div>
                  <div style={{height:5,background:"var(--bg2)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:`${Math.min(100,Math.round((paid/totalAmt)*100))}%`,height:"100%",background:"var(--green)",borderRadius:3}}/>
                  </div>
                </div>}

                {/* Payment history */}
                {myPayments.length>0&&(
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:10,color:"var(--muted)",fontWeight:600,letterSpacing:1,marginBottom:6}}>PAYMENT HISTORY</div>
                    {myPayments.map((pay,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                        <div style={{width:24,height:24,borderRadius:"50%",background:pay.method==="Zelle"?"#1d4ed8":"#555",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:9,color:"#fff",fontWeight:700}}>{pay.method==="Zelle"?"Z":"$"}</span>
                        </div>
                        <div style={{flex:1}}>
                          <span style={{fontSize:12,color:"var(--text)"}}>${pay.amount} via {pay.method}</span>
                          <span style={{fontSize:10,color:"var(--muted)",marginLeft:6}}>{pay.date}</span>
                        </div>
                        <span style={{fontSize:11,color:"var(--green)"}}>✓</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pay buttons — only for the member themselves */}
                {isMe&&!fullPaid&&(
                  <div>
                    {/* Zelle confirmation overlay */}
                    {zelleConfirm&&(
                      <div style={{padding:"12px",background:"rgba(37,99,235,0.1)",border:"1px solid rgba(37,99,235,0.3)",borderRadius:10,marginBottom:10}}>
                        <div style={{fontSize:13,marginBottom:8,fontWeight:600,color:"#60a5fa"}}>Send ${zelleAmt} via Zelle then confirm below</div>
                        {(()=>{
                          const rn=c.paymentRecipient==="admin"?adminName:c.createdBy;
                          const rc=profiles[rn]?.zelleContact;
                          return rc?(
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 10px",background:"rgba(0,0,0,0.2)",borderRadius:8}}>
                              <div style={{flex:1}}>
                                <div style={{fontSize:10,color:"var(--muted)",marginBottom:2}}>Send to:</div>
                                <div style={{fontSize:13,color:"var(--text)",fontWeight:600}}>{rc}</div>
                              </div>
                              <button onClick={copyZelleContact} style={{
                                padding:"6px 12px",borderRadius:8,cursor:"pointer",flexShrink:0,
                                background:zelleCopied?"rgba(46,204,113,0.2)":"rgba(255,255,255,0.08)",
                                border:zelleCopied?"1px solid var(--green)":"1px solid var(--border)",
                                color:zelleCopied?"var(--green)":"var(--muted)",
                                fontSize:12,fontFamily:"'Bebas Neue',cursive",letterSpacing:1,
                              }}>
                                {zelleCopied?"✓ COPIED TO CLIPBOARD":"COPY"}
                              </button>
                            </div>
                          ):<div style={{fontSize:12,color:"var(--orange)",marginBottom:8}}>⚠️ No Zelle contact set yet.</div>;
                        })()}
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={confirmZellePayment} style={{flex:1,padding:"9px",background:"#1d4ed8",border:"none",borderRadius:8,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1}}>YES, I PAID</button>
                          <button onClick={()=>setZelleConfirm(false)} style={{flex:1,padding:"9px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,cursor:"pointer",color:"var(--muted)",fontSize:13}}>NOT YET</button>
                        </div>
                      </div>
                    )}
                    {!zelleConfirm&&<>
                    <div style={{fontSize:11,color:"var(--muted)",marginBottom:8}}>
                      Pay remaining <strong style={{color:"var(--red)"}}>${totalAmt-paid}</strong>:
                    </div>
                    <div style={{display:"flex",gap:8,marginBottom:8}}>
                      <button onClick={()=>handleZelle(totalAmt-paid)} style={{flex:1,padding:"9px 8px",borderRadius:8,border:"1px solid #2563eb",background:"rgba(37,99,235,0.1)",color:"#60a5fa",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                        PAY ${totalAmt-paid} VIA ZELLE
                      </button>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <input type="number" placeholder="Partial amount..." value={partialAmt} onChange={e=>setPartialAmt(e.target.value)} min={1} max={totalAmt-paid} style={{flex:1,padding:"7px 10px",borderRadius:6,border:"1px solid var(--border)",background:"var(--bg2)",color:"var(--text)",fontSize:12}}/>
                      <button onClick={()=>handleZelle(Number(partialAmt))} disabled={!partialAmt} style={{padding:"7px 10px",borderRadius:6,border:"1px solid #2563eb",background:"rgba(37,99,235,0.1)",color:"#60a5fa",fontSize:11,cursor:"pointer"}}>Zelle</button>
                    </div>
                    </>}
                  </div>
                )}

                {/* Admin mark as paid */}
                {isAdmin&&!isMe&&!fullPaid&&(
                  <div>
                    <div style={{fontSize:11,color:"var(--muted)",marginBottom:8}}>Admin — mark payment received:</div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>onMarkPaid(c.id,m,totalAmt-paid,"Cash")} style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid var(--green)",background:"rgba(46,204,113,0.1)",color:"var(--green)",fontSize:12,cursor:"pointer",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                        MARK ${totalAmt-paid} PAID
                      </button>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginTop:6}}>
                      <input type="number" placeholder="Partial amount..." value={partialAmt} onChange={e=>setPartialAmt(e.target.value)} min={1} style={{flex:1,padding:"7px 10px",borderRadius:6,border:"1px solid var(--border)",background:"var(--bg2)",color:"var(--text)",fontSize:12}}/>
                      <button onClick={()=>{onMarkPaid(c.id,m,Number(partialAmt),"Cash");setPartialAmt("");}} disabled={!partialAmt} style={{padding:"7px 10px",borderRadius:6,border:"1px solid var(--green)",background:"rgba(46,204,113,0.1)",color:"var(--green)",fontSize:11,cursor:"pointer"}}>Mark Paid</button>
                    </div>
                  </div>
                )}

                {fullPaid&&<div style={{textAlign:"center",color:"var(--green)",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2}}>✓ FULLY PAID UP</div>}
              </div>
            )}
          </div>
        );
      })}

      {/* Grand total row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 70px 60px",padding:"10px 12px",background:"rgba(241,196,15,0.05)",borderTop:"1px solid rgba(241,196,15,0.15)"}}>
        <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,color:"var(--gold)"}}>🏆 PRIZE POT</span>
        <div/>
        <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,color:"var(--gold)",textAlign:"right",fontWeight:700}}>${grandTotal}</span>
      </div>
    </div>
  );
}


function ChallengeCard({challenge:c,currentUser,adminName,members,profiles,onLog,onDelete,onEdit,onForfeit,onMarkPaid,onLogPayment,history,completed}){
  const [logOpen,setLogOpen]=useState(false);
  const [editOpen,setEditOpen]=useState(false);
  const [forfeitConfirm,setForfeitConfirm]=useState(false);
  const [amt,setAmt]=useState("");
  const parts=Object.keys(c.participants||{});
  const amI=parts.includes(currentUser);
  const isDR=c.goalType==="dateRange";
  const canEdit=c.createdBy===currentUser&&!completed;
  const myData=c.participants?.[currentUser]||{};
  const myForfeited=myData.forfeited||false;
  const myManual=myData.progress||0;
  const myAcceptedAt=c.participants?.[currentUser]?.acceptedAt||c.startDate;
  const myAuto=isDR&&c.startDate&&c.endDate?getWorkoutDays(myAcceptedAt,todayStr()<c.endDate?todayStr():c.endDate,profiles?.[currentUser]).filter(d=>history[d]?.[currentUser]?.done).length:null;
  const myProg=myAuto!==null?myAuto:myManual;
  const myGoal=isDR&&c.startDate&&c.endDate?getWorkoutDays(myAcceptedAt,c.endDate,profiles?.[currentUser]).length:c.goal;
  const myPct=Math.min(100,Math.round((myProg/Math.max(myGoal,1))*100));

  // Penalty calc for auto-forfeit prompt
  const penalties=calcPenalties(c,history,profiles);
  const myOwed=penalties[currentUser]?.totalOwed||0;
  const atForfeitCap=c.forfeitCap&&myOwed>=c.forfeitCap;

  const rows=parts.filter(m=>c.participants[m]?.status!=="pending").map(m=>{
    const mAcceptedAt=c.participants[m]?.acceptedAt||c.startDate;
    const mGoal=isDR&&c.startDate&&c.endDate?getWorkoutDays(mAcceptedAt,c.endDate,profiles?.[m]).length:c.goal;
    const prog=isDR&&c.startDate&&c.endDate?getWorkoutDays(mAcceptedAt,todayStr()<c.endDate?todayStr():c.endDate,profiles?.[m]).filter(d=>history[d]?.[m]?.done).length:(c.participants[m]?.progress||0);
    const forfeited=c.participants[m]?.forfeited||false;
    return{name:m,prog,goal:mGoal,pct:Math.min(100,Math.round((prog/Math.max(mGoal,1))*100)),forfeited};
  }).sort((a,b)=>b.pct-a.pct);

  const doLog=()=>{const n=Number(amt);if(!n||n<=0)return;const np=myManual+n;onLog(c.id,currentUser,np,np>=c.goal);setAmt("");setLogOpen(false);};
  const doForfeit=()=>{onForfeit(c.id,currentUser);setForfeitConfirm(false);};
  const losers=completed?rows.filter(r=>r.pct<100&&!r.forfeited):[];
  const forfeited=rows.filter(r=>r.forfeited);

  return(
    <div className="challenge-card">
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>{c.title}</div>
          <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>
            {isDR?`📅 ${fmtDate(c.startDate)} → ${fmtDate(c.endDate)}`:`Goal: ${c.goal} ${c.unit}`}
            {isDR&&c.maxRestDays!=null&&<span style={{color:"var(--muted)"}}> · max {c.maxRestDays} rest days/week</span>}
            {c.penalty&&<span style={{color:"var(--orange)"}}> · {c.penalty}{c.penaltyAmt>0?` ($${c.penaltyAmt}/miss)`:""}</span>}
          {/* Show pending invites count */}
          {Object.values(c.participants||{}).some(p=>p.status==="pending")&&(
            <div style={{marginTop:4,fontSize:11,color:"var(--muted)"}}>
              ⏳ {Object.values(c.participants).filter(p=>p.status==="pending").length} invite(s) pending
            </div>
          )}
            {c.forfeitCap>0&&<span style={{color:"var(--red)"}}> · forfeit cap ${c.forfeitCap}</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:6,paddingLeft:8,flexShrink:0}}>
          {canEdit&&<button onClick={()=>setEditOpen(true)} style={{padding:"5px 9px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,cursor:"pointer",color:"var(--muted)",fontSize:13}}>✏️</button>}
          {c.createdBy===currentUser&&<button onClick={()=>onDelete(c.id)} style={{padding:"5px 9px",background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:20,lineHeight:1}}>×</button>}
        </div>
      </div>

      {/* My progress */}
      {amI&&!myForfeited&&(
        <div style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:13,color:"var(--accent2)"}}>You: {myProg}/{myGoal} {c.unit}</span>
            <span style={{fontSize:13,color:myPct>=100?"var(--green)":"var(--muted)"}}>{myPct}%</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{width:`${myPct}%`}}/></div>
        </div>
      )}
      {amI&&myForfeited&&(
        <div style={{marginBottom:10,padding:"10px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid var(--border)",borderRadius:10,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18}}>🏳️</span>
          <div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--muted)"}}>YOU FORFEITED</div>
            <div style={{fontSize:12,color:"var(--red)"}}>Owes ${c.forfeitCap||0}</div>
          </div>
        </div>
      )}

      {/* Other members */}
      {rows.filter(r=>r.name!==currentUser).map(r=>(
        <div key={r.name} style={{marginBottom:6}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
            <span style={{fontSize:12,color:"var(--muted)",display:"flex",alignItems:"center",gap:4}}>
              {r.forfeited&&<span>🏳️</span>}{r.name}: {r.forfeited?<span style={{color:"var(--red)"}}>FORFEITED (owes ${c.forfeitCap||0})</span>:`${r.prog}/${r.goal}`}
            </span>
            {!r.forfeited&&<span style={{fontSize:12,color:r.pct>=100?"var(--green)":"var(--muted)"}}>{r.pct}%</span>}
          </div>
          {!r.forfeited&&<div className="progress-bar" style={{height:4}}><div className="progress-fill" style={{width:`${r.pct}%`,opacity:.6}}/></div>}
        </div>
      ))}

      <PenaltyTracker challenge={c} history={history} profiles={profiles} currentUser={currentUser} adminName={adminName} onMarkPaid={onMarkPaid} onLogPayment={onLogPayment}/>

      {/* Auto-forfeit prompt when at cap */}
      {!completed&&amI&&!myForfeited&&atForfeitCap&&(
        <div style={{marginTop:10,padding:"10px 12px",background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:10}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--red)",marginBottom:4}}>⚠️ FORFEIT CAP REACHED</div>
          <div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>You've hit the ${c.forfeitCap} cap. Forfeit now to stop the clock.</div>
          <button onClick={()=>setForfeitConfirm(true)} style={{width:"100%",padding:"8px",background:"var(--red)",border:"none",borderRadius:8,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1}}>FORFEIT — OWE ${c.forfeitCap}</button>
        </div>
      )}

      {/* Completed losers */}
      {completed&&(losers.length>0||forfeited.length>0)&&(
        <div style={{marginTop:10,padding:"10px 12px",background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.25)",borderRadius:10}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,color:"var(--red)",marginBottom:5}}>🚨 FINAL STANDINGS</div>
          {forfeited.map(l=><div key={l.name} style={{fontSize:13,color:"var(--muted)",marginBottom:4}}>🏳️ <span style={{color:"var(--text)"}}>{l.name}</span> — forfeited, owes <span style={{color:"var(--red)"}}>${c.forfeitCap||0}</span></div>)}
          {losers.map(l=>{const p=penalties[l.name];return<div key={l.name} style={{fontSize:13,color:"var(--muted)",marginBottom:4}}><span style={{color:"var(--text)"}}>{l.name}</span> — owes <span style={{color:"var(--red)"}}>${p?.totalOwed||0}</span></div>;})}
          {(losers.find(l=>l.name===currentUser)||myForfeited)&&<div style={{marginTop:6,fontSize:12,color:"var(--orange)",fontWeight:600}}>😬 That's you! {c.penalty}</div>}
        </div>
      )}

      {/* Action buttons */}
      {!completed&&amI&&myPct<100&&!isDR&&!myForfeited&&<button onClick={()=>setLogOpen(true)} style={{marginTop:10,width:"100%",padding:10,background:"rgba(124,92,191,0.15)",border:"1px solid rgba(124,92,191,0.3)",borderRadius:10,cursor:"pointer",color:"var(--accent2)",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2}}>+ LOG PROGRESS</button>}
      {isDR&&!completed&&amI&&!myForfeited&&<div style={{marginTop:8,fontSize:11,color:"var(--muted)",textAlign:"center"}}>Progress auto-tracked from your daily workouts</div>}
      {myPct>=100&&!myForfeited&&<div style={{marginTop:8,textAlign:"center",color:"var(--green)",fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2}}>✓ YOU COMPLETED THIS</div>}

      {/* Forfeit button — always available */}
      {!completed&&amI&&!myForfeited&&c.forfeitCap>0&&!atForfeitCap&&(
        <button onClick={()=>setForfeitConfirm(true)} style={{marginTop:8,width:"100%",padding:"8px",background:"rgba(255,255,255,0.04)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",color:"var(--muted)",fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1}}>
          🏳️ FORFEIT — OWE ${c.forfeitCap}
        </button>
      )}

      {/* Forfeit confirm */}
      {forfeitConfirm&&(
        <div style={{marginTop:10,padding:"12px",background:"rgba(231,76,60,0.08)",border:"1px solid rgba(231,76,60,0.2)",borderRadius:10}}>
          <div style={{fontSize:13,marginBottom:10}}>Are you sure? You'll owe <strong style={{color:"var(--red)"}}>${c.forfeitCap}</strong> and be removed from the challenge.</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={doForfeit} style={{flex:1,padding:10,background:"var(--red)",border:"none",borderRadius:8,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1}}>YES, FORFEIT</button>
            <button onClick={()=>setForfeitConfirm(false)} style={{flex:1,padding:10,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,cursor:"pointer",color:"var(--muted)",fontSize:13}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Log input */}
      {logOpen&&<div style={{marginTop:10,display:"flex",gap:8}}><input className="input" type="number" placeholder={`Add ${c.unit}...`} value={amt} onChange={e=>setAmt(e.target.value)} min={1} autoFocus onKeyDown={e=>e.key==="Enter"&&doLog()}/><button onClick={doLog} disabled={!amt||Number(amt)<=0} style={{padding:"10px 14px",background:"var(--accent)",border:"none",borderRadius:10,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13}}>LOG</button><button onClick={()=>{setLogOpen(false);setAmt("");}} style={{padding:"10px 12px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",color:"var(--muted)",fontSize:13}}>✕</button></div>}
      {editOpen&&<EditChallengeModal challenge={c} members={members} onSave={onEdit} onClose={()=>setEditOpen(false)}/>}
    </div>
  );
}

function ChallengeInvites({currentUser,challenges,profiles,onAccept,onDecline,onOpenProfile}){
  const pending=challenges.filter(c=>c.status==="active"&&c.participants?.[currentUser]?.status==="pending");
  if(pending.length===0)return null;
  return(
    <div style={{margin:"0 0 4px"}}>
      {pending.map(c=>(
        <div key={c.id} style={{margin:"0 16px 10px",padding:"14px",background:"rgba(124,92,191,0.08)",border:"1px solid rgba(124,92,191,0.35)",borderRadius:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:20}}>⚔️</span>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:2}}>{c.title}</div>
              <div style={{fontSize:11,color:"var(--muted)"}}>Invited by {c.createdBy}</div>
            </div>
          </div>
          {/* Challenge details */}
          <div style={{fontSize:12,color:"var(--muted)",marginBottom:8,lineHeight:1.6}}>
            {c.goalType==="dateRange"?`📅 ${fmtDate(c.startDate)} → ${fmtDate(c.endDate)}`:`🎯 Goal: ${c.goal} ${c.unit}`}
            {c.maxRestDays!=null&&<span> · max {c.maxRestDays} rest days/week</span>}
            {c.penaltyAmt>0&&<span style={{color:"var(--orange)"}}> · ${c.penaltyAmt}/miss</span>}
            {c.forfeitCap>0&&<span style={{color:"var(--red)"}}> · forfeit cap ${c.forfeitCap}</span>}
          </div>
          {/* Rest day reminder */}
          <div style={{padding:"8px 10px",background:"rgba(255,107,53,0.1)",border:"1px solid rgba(255,107,53,0.2)",borderRadius:8,marginBottom:10,fontSize:12,color:"var(--orange)",lineHeight:1.5}}>
            ⚠️ Before accepting, make sure your rest days are up to date — they'll be locked once you join.{" "}
            <span onClick={onOpenProfile} style={{textDecoration:"underline",cursor:"pointer",fontWeight:600}}>Update rest days →</span>
          </div>
          {/* Accept / Decline */}
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>onAccept(c.id,currentUser)} style={{flex:1,padding:"10px",background:"linear-gradient(135deg,var(--accent),var(--orange))",border:"none",borderRadius:10,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1}}>
              ✓ ACCEPT
            </button>
            <button onClick={()=>onDecline(c.id,currentUser)} style={{flex:1,padding:"10px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",color:"var(--muted)",fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1}}>
              ✕ DECLINE
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChallengesTab({currentUser,adminName,members,profiles,challenges,history,onAdd,onLogProgress,onDelete,onEditChallenge,onForfeit,onAccept,onDecline,onOpenProfile,onMarkPaid,onLogPayment}){
  const [open,setOpen]=useState(false);
  const defEnd=()=>{const e=new Date();e.setDate(e.getDate()+30);return localDateStr(e);};
  const [form,setForm]=useState({title:"",useDateRange:false,goal:30,unit:"reps",startDate:todayStr(),endDate:defEnd(),penalty:"",penaltyAmt:"",forfeitCap:"",maxRestDays:2,participants:[],paymentRecipient:"creator"});
  useEffect(()=>setForm(f=>({...f,participants:members})),[members]);
  const toggleP=m=>setForm(f=>({...f,participants:f.participants.includes(m)?f.participants.filter(x=>x!==m):[...f.participants,m]}));
  const sub=()=>{
    if(!form.title.trim())return;
    const parts=form.participants.length>0?form.participants:members;
    const goal=form.useDateRange?getDateRange(form.startDate,form.endDate).length:Number(form.goal);
    // Creator is auto-enrolled, everyone else gets a pending invite
    const participantMap=parts.reduce((a,m)=>({
      ...a,
      [m]: m===currentUser
        ? {progress:0,done:false,status:"accepted"}
        : {progress:0,done:false,status:"pending"}
    }),{});
    onAdd({id:Date.now().toString(),title:form.title.trim(),goalType:form.useDateRange?"dateRange":"amount",goal,unit:form.useDateRange?"days":form.unit,startDate:form.useDateRange?form.startDate:null,endDate:form.useDateRange?form.endDate:null,penalty:form.penalty.trim(),penaltyAmt:form.penaltyAmt?Number(form.penaltyAmt):0,forfeitCap:form.forfeitCap?Number(form.forfeitCap):0,maxRestDays:form.useDateRange?Number(form.maxRestDays):null,createdBy:currentUser,createdAt:Date.now(),participants:participantMap,status:"active"});
    setOpen(false);
  };
  const active=challenges.filter(c=>c.status==="active"),done=challenges.filter(c=>c.status!=="active");
  return(
    <div>
      <div style={{padding:"12px 16px 8px"}}><button className="btn-primary" onClick={()=>setOpen(true)}>⚔️ CREATE CHALLENGE</button></div>
      <ChallengeInvites currentUser={currentUser} challenges={challenges} profiles={profiles} onAccept={onAccept} onDecline={onDecline} onOpenProfile={onOpenProfile}/>
      {active.filter(c=>c.participants?.[currentUser]?.status!=="pending").length===0&&done.length===0&&challenges.filter(c=>c.participants?.[currentUser]?.status==="pending").length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:"var(--muted)"}}><div style={{fontSize:40,marginBottom:12}}>⚔️</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>NO ACTIVE CHALLENGES</div></div>}
      {active.filter(c=>c.participants?.[currentUser]?.status!=="pending").length>0&&<div className="section-label">ACTIVE</div>}
      {active.filter(c=>c.participants?.[currentUser]?.status!=="pending").map(c=><ChallengeCard key={c.id} challenge={c} currentUser={currentUser} adminName={adminName} members={members} profiles={profiles} onLog={onLogProgress} onDelete={onDelete} onEdit={onEditChallenge} onForfeit={onForfeit} onMarkPaid={onMarkPaid} onLogPayment={onLogPayment} history={history}/>)}
      {done.length>0&&<div className="section-label" style={{marginTop:8}}>COMPLETED</div>}
      {done.map(c=><ChallengeCard key={c.id} challenge={c} currentUser={currentUser} adminName={adminName} members={members} profiles={profiles} onLog={onLogProgress} onDelete={onDelete} onEdit={onEditChallenge} onForfeit={onForfeit} onMarkPaid={onMarkPaid} onLogPayment={onLogPayment} history={history} completed/>)}
      {open&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setOpen(false)}><div className="modal">
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:14}}>NEW CHALLENGE</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <input className="input" placeholder="Challenge name..." value={form.title} onChange={e=>setForm({...form,title:e.target.value})} autoFocus maxLength={50}/>
          <div style={{display:"flex",gap:8}}>
            {[{v:false,l:"📊 GOAL AMOUNT"},{v:true,l:"📅 DATE RANGE"}].map(({v,l})=>(
              <button key={String(v)} onClick={()=>setForm({...form,useDateRange:v})} style={{flex:1,padding:10,borderRadius:10,cursor:"pointer",fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,background:form.useDateRange===v?"rgba(124,92,191,0.2)":"var(--bg3)",border:form.useDateRange===v?"1px solid var(--accent)":"1px solid var(--border)",color:form.useDateRange===v?"var(--accent2)":"var(--muted)"}}>{l}</button>
            ))}
          </div>
          {!form.useDateRange?(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Goal amount</div><input className="input" type="number" value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})} min={1}/></div>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Unit</div><select className="input" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} style={{appearance:"none"}}>{["reps","miles","minutes","lbs","kg","sessions","calories"].map(u=><option key={u}>{u}</option>)}</select></div>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Start</div><input className="input" type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></div>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>End</div><input className="input" type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></div>
              {form.startDate&&form.endDate&&<div style={{gridColumn:"1/-1",fontSize:12,color:"var(--accent2)",background:"rgba(124,92,191,0.1)",padding:"8px 12px",borderRadius:8}}>📅 {getDateRange(form.startDate,form.endDate).length} total days · your workout days depend on your rest day settings</div>}
            </div>
          )}
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>Participants</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{members.map(m=><button key={m} onClick={()=>toggleP(m)} style={{padding:"6px 12px",borderRadius:20,cursor:"pointer",fontSize:13,background:form.participants.includes(m)?"rgba(124,92,191,0.2)":"var(--bg3)",border:form.participants.includes(m)?"1px solid var(--accent)":"1px solid var(--border)",color:form.participants.includes(m)?"var(--accent2)":"var(--muted)"}}>{m}</button>)}</div></div>
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Penalty (optional)</div><input className="input" placeholder='e.g. "Buys lunch"' value={form.penalty} onChange={e=>setForm({...form,penalty:e.target.value})} maxLength={80}/></div>
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>$ per missed workout <span style={{color:"var(--bg3)",fontSize:11}}>(optional)</span></div><input className="input" type="number" placeholder="optional — e.g. 5" value={form.penaltyAmt} onChange={e=>setForm({...form,penaltyAmt:e.target.value})} min={0}/></div>
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Forfeit cap $ (optional — max they'll ever owe)</div><input className="input" type="number" placeholder="e.g. 50" value={form.forfeitCap} onChange={e=>setForm({...form,forfeitCap:e.target.value})} min={0}/></div>
          <div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>Payments go to</div>
            <div style={{display:"flex",gap:8}}>
              {[{v:"creator",l:"Me (challenge creator)"},{v:"admin",l:`Admin (${adminName})`}].map(({v,l})=>(
                <button key={v} onClick={()=>setForm({...form,paymentRecipient:v})} style={{flex:1,padding:"8px",borderRadius:10,cursor:"pointer",fontSize:12,background:(form.paymentRecipient||"creator")===v?"rgba(124,92,191,0.2)":"var(--bg3)",border:(form.paymentRecipient||"creator")===v?"1px solid var(--accent)":"1px solid var(--border)",color:(form.paymentRecipient||"creator")===v?"var(--accent2)":"var(--muted)"}}>{l}</button>
              ))}
            </div>
          </div>
          {form.useDateRange&&<div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>Max rest days per week allowed</div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <button onClick={()=>setForm(f=>({...f,maxRestDays:Math.max(1,f.maxRestDays-1)}))} style={{width:36,height:36,borderRadius:"50%",background:"var(--bg3)",border:"1px solid var(--border)",cursor:"pointer",color:"var(--text)",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
              <div style={{flex:1,textAlign:"center"}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:28,color:"var(--accent2)"}}>{form.maxRestDays}</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>day{form.maxRestDays!==1?"s":""} / week</div>
              </div>
              <button onClick={()=>setForm(f=>({...f,maxRestDays:Math.min(6,f.maxRestDays+1)}))} style={{width:36,height:36,borderRadius:"50%",background:"var(--bg3)",border:"1px solid var(--border)",cursor:"pointer",color:"var(--text)",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:6,textAlign:"center"}}>Anyone taking more than {form.maxRestDays} rest day{form.maxRestDays!==1?"s":""} in a week will be penalized for the extra missed days</div>
          </div>}
          <button className="btn-primary" onClick={sub} disabled={!form.title.trim()} style={{marginTop:4}}>CREATE ⚔️</button>
        </div>
      </div></div>}
    </div>
  );
}

function StatsTab({currentUser,members,profiles,history,challenges,feed}){
  const last30=Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-29+i);return{date:localDateStr(d),day:d.getDate()};});
  const mb=computeBadges(currentUser,history,feed,challenges,profiles[currentUser]);
  return(
    <div>
      <div className="section-label" style={{marginTop:12}}>LAST 30 DAYS</div>
      <div style={{padding:"0 16px 16px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:5}}>
          {last30.map(({date,day})=>{const done=!!history[date]?.[currentUser]?.done,we=isWeekend(date);return<div key={date} style={{aspectRatio:"1",borderRadius:6,background:done?"linear-gradient(135deg,var(--accent),var(--orange))":we?"rgba(255,255,255,0.02)":"var(--bg3)",border:`1px solid ${we?"rgba(255,255,255,0.03)":"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:done?"#fff":we?"rgba(255,255,255,0.15)":"var(--muted)"}}>{we?"":day}</div>;})}
        </div>
        <div style={{display:"flex",gap:12,marginTop:8,fontSize:11,color:"var(--muted)"}}>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"linear-gradient(135deg,var(--accent),var(--orange))",display:"inline-block"}}/>Workout</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"var(--bg3)",border:"1px solid var(--border)",display:"inline-block"}}/>Missed</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"rgba(255,255,255,0.02)",display:"inline-block"}}/>Weekend</span>
        </div>
      </div>
      <div className="section-label">BADGES</div>
      <div className="badge-grid" style={{marginBottom:16}}>
        {BADGES.map(b=>{const earned=mb.includes(b.id);return<div key={b.id} className={`badge-item ${earned?"earned":"locked"}`}><div style={{fontSize:28,marginBottom:4}}>{b.icon}</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1}}>{b.label}</div><div style={{fontSize:10,color:"var(--muted)",marginTop:2,lineHeight:1.3}}>{b.desc}</div></div>;})}
      </div>
      <div className="section-label">PACK COMPARISON</div>
      {[...members].sort((a,b)=>getTotalWorkouts(history,b)-getTotalWorkouts(history,a)).map((m,i)=>{
        const t=getTotalWorkouts(history,m),s=getStreak(history,m),mx=Math.max(...members.map(x=>getTotalWorkouts(history,x)),1);
        return<div key={m} className="member-row" style={{margin:"0 16px 8px"}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,color:"var(--muted)",width:22}}>{i+1}</div><AvatarDisplay profile={profiles[m]} size={36}/><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:1}}>{m}{m===currentUser&&" (you)"}</span><span style={{fontSize:12,color:"var(--muted)"}}>{t} workouts</span></div><div className="progress-bar" style={{height:4}}><div className="progress-fill" style={{width:`${(t/mx)*100}%`}}/></div><div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>🔥{s} day streak</div></div></div>;
      })}
      <div className="section-label">MY WORKOUT HISTORY</div>
      <div style={{padding:"0 16px 16px",display:"flex",flexDirection:"column",gap:8}}>
        {(()=>{
          const entries=Object.entries(history)
            .filter(([,d])=>d?.[currentUser]?.done)
            .sort((a,b)=>b[0].localeCompare(a[0]))
            .slice(0,60);
          if(entries.length===0)return<div style={{textAlign:"center",padding:"20px",color:"var(--muted)",fontSize:13}}>No workouts logged yet.</div>;
          return entries.map(([date,dayData])=>{
            const entry=dayData[currentUser];
            const summary=Array.isArray(entry.summary)?entry.summary:[entry.workoutLabel||"Workout"];
            return(
              <div key={date} style={{padding:"12px 14px",background:"var(--bg3)",borderRadius:12,border:"1px solid var(--border)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1,color:"var(--accent2)"}}>{fmtDate(date)}</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>{entry.time||""}</div>
                </div>
                {summary.map((line,i)=><div key={i} style={{fontSize:12,color:"var(--green)",lineHeight:1.6}}>{line}</div>)}
                {entry.note&&<div style={{fontSize:11,color:"var(--muted)",marginTop:4,fontStyle:"italic"}}>"{entry.note}"</div>}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}

// ── PROFILE MODAL ────────────────────────────────────────────────────────────
function ProfileModal({currentUser,profile,profiles,history,challenges,onClose,onSaveWeight,onSaveGoal,onChangePin,onChangeName,onSaveProfile,onSaveBackfill}){
  const [tab,setTab]=useState("stats");
  const [weight,setWeight]=useState("");
  const [weightUnit,setWeightUnit]=useState("lbs");
  const [goal,setGoal]=useState(profile?.personalGoal||"");
  const [goalSaved,setGoalSaved]=useState(false);
  const [shareGoal,setShareGoal]=useState(profile?.shareGoal||false);
  const [pin1,setPin1]=useState("");
  const [pin2,setPin2]=useState("");
  const [pinErr,setPinErr]=useState("");
  const [pinDone,setPinDone]=useState(false);
  const [newName,setNewName]=useState(currentUser);
  const [nameErr,setNameErr]=useState("");
  const [nameDone,setNameDone]=useState(false);

  const streak=getStreak(history,currentUser);
  const total=getTotalWorkouts(history,currentUser);
  const weightLog=profile?.weightLog||[];

  const logWeight=()=>{
    if(!weight||isNaN(Number(weight)))return;
    const entry={w:Number(weight),unit:weightUnit,date:todayStr(),ts:Date.now()};
    onSaveWeight([entry,...weightLog].slice(0,30));
    setWeight("");
  };

  const saveGoal=()=>{onSaveGoal(goal.trim(),shareGoal);setGoalSaved(true);setTimeout(()=>setGoalSaved(false),2000);};

  const changePin=async()=>{
    if(pin1.length!==4)return setPinErr("PIN must be 4 digits");
    if(pin1!==pin2)return setPinErr("PINs don't match");
    setPinErr("");await onChangePin(pin1);setPinDone(true);setPin1("");setPin2("");
  };

  const [restDays,setRestDays]=useState(profile?.restDays||[0,6]);
  const toggleRestDay=d=>{
    if(restDays.includes(d)){if(restDays.length<=2)return;setRestDays(r=>r.filter(x=>x!==d));}
    else setRestDays(r=>[...r,d]);
  };
  const saveRestDays=async()=>{
    const np={...profiles,[currentUser]:{...profiles[currentUser],restDays}};
    await fsSet("wolfpack/profiles",{users:np});if(onSaveProfile)onSaveProfile(np);
    showRestSaved(true);setTimeout(()=>showRestSaved(false),2000);
  };
  const [restSaved,showRestSaved]=useState(false);
  const [zelleInfo,setZelleInfo]=useState(profile?.zelleContact||"");
  const [zelleSaved,setZelleSaved]=useState(false);
  const saveZelle=async()=>{
    const np={...profiles,[currentUser]:{...profiles[currentUser],zelleContact:zelleInfo.trim()}};
    await fsSet("wolfpack/profiles",{users:np});if(onSaveProfile)onSaveProfile(np);
    setZelleSaved(true);setTimeout(()=>setZelleSaved(false),2000);
  };
  const onSaveZelle=async(val)=>{
    const np={...profiles,[currentUser]:{...profiles[currentUser],zelleContact:val}};
    await fsSet("wolfpack/profiles",{users:np});if(onSaveProfile)onSaveProfile(np);
    setZelleInfo(val);
  };
  const [pbExercise,setPbExercise]=useState("");
  const [pbValue,setPbValue]=useState("");
  const [pbUnit,setPbUnit]=useState("lbs");
  const [pbNote,setPbNote]=useState("");
  const savePB=async()=>{
    if(!pbExercise.trim()||!pbValue)return;
    const pr={exercise:pbExercise.trim(),value:Number(pbValue),unit:pbUnit.trim()||"lbs",note:pbNote.trim(),date:todayStr()};
    const updated=[pr,...(profile?.personalBests||[])].slice(0,50);
    const np={...profiles,[currentUser]:{...profiles[currentUser],personalBests:updated}};
    await fsSet("wolfpack/profiles",{users:np});if(onSaveProfile)onSaveProfile(np);
    setPbExercise("");setPbValue("");setPbUnit("lbs");setPbNote("");
  };
  const deletePB=async(idx)=>{
    const updated=[...(profile?.personalBests||[])];updated.splice(idx,1);
    const np={...profiles,[currentUser]:{...profiles[currentUser],personalBests:updated}};
    await fsSet("wolfpack/profiles",{users:np});if(onSaveProfile)onSaveProfile(np);
  };

  // Avatar editing
  const [editingAvatar,setEditingAvatar]=useState(false);
  const [newAvatar,setNewAvatar]=useState(profile?.avatar||"🐺");
  const [newAvatarImg,setNewAvatarImg]=useState(profile?.avatarImg||null);
  const avatarFileRef=useRef();

  const handleAvatarPhoto=async e=>{
    const f=e.target.files?.[0];if(!f)return;
    const raw=await readFileAsDataURL(f);
    const comp=await compressImage(raw);
    setNewAvatarImg(comp);
  };
  const saveAvatar=async()=>{
    const updated={...profiles[currentUser],avatar:newAvatarImg?null:newAvatar,...(newAvatarImg?{avatarImg:newAvatarImg}:{avatarImg:undefined})};
    if(!newAvatarImg) delete updated.avatarImg;
    const np={...profiles,[currentUser]:updated};
    await fsSet("wolfpack/profiles",{users:np});
    if(onSaveProfile)onSaveProfile(np);
    setEditingAvatar(false);
  };

  // Backfill state
  const [backfillDate,setBackfillDate]=useState("");
  const [backfillWorkouts,setBackfillWorkouts]=useState([]);
  const [backfillDone,setBackfillDone]=useState(false);
  const [backfillSaving,setBackfillSaving]=useState(false);

  // Last 7 days excluding today
  const backfillDates=Array.from({length:7},(_,i)=>{
    const d=new Date();
    d.setDate(d.getDate()-(i+1));
    return localDateStr(d);
  });

  const toggleBackfillWorkout=w=>setBackfillWorkouts(s=>s.find(x=>x.id===w.id)?s.filter(x=>x.id!==w.id):[...s,w]);

  const saveBackfill=async()=>{
    if(!backfillDate||backfillWorkouts.length===0)return;
    setBackfillSaving(true);
    const time="12:00 PM";
    const icons=backfillWorkouts.map(w=>w.icon).join("");
    const labels=backfillWorkouts.map(w=>w.label).join(" + ");
    const entry={done:true,workouts:backfillWorkouts.map(w=>({id:w.id,icon:w.icon,label:w.label})),workoutIcon:icons,workoutLabel:labels,note:"(backfilled)",time,ts:new Date(backfillDate+"T12:00:00").getTime()};
    const updated={...history,[backfillDate]:{...(history[backfillDate]||{}),[currentUser]:entry}};
    await onSaveBackfill(updated);
    setBackfillDate("");setBackfillWorkouts([]);setBackfillDone(true);
    setTimeout(()=>setBackfillDone(false),2500);
    setBackfillSaving(false);
  };

  // Longest streak ever
  const longestStreak=(()=>{
    let best=0,cur=0;
    const base=new Date();
    for(let i=365;i>=0;i--){
      const d=new Date(base);d.setDate(base.getDate()-i);
      const k=localDateStr(d);
      if(isRestDay(k,profile))continue;
      if(history[k]?.[currentUser]?.done){cur++;best=Math.max(best,cur);}
      else cur=0;
    }
    return best;
  })();

  const tabs=[{id:"stats",label:"STATS"},{id:"body",label:"BODY"},{id:"ai",label:"🔥 WOLF"},{id:"pb",label:"MY PRs"},{id:"rest",label:"REST DAYS"},{id:"pin",label:"PIN"}];

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"85dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        {/* header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{position:"relative",cursor:"pointer"}} onClick={()=>setEditingAvatar(true)}>
            <AvatarDisplay profile={profile} size={52}/>
            <div style={{position:"absolute",bottom:-2,right:-2,width:18,height:18,borderRadius:"50%",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",border:"2px solid var(--bg2)"}}>✏️</div>
          </div>
          <div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3}}>{currentUser}</div>
            <div style={{fontSize:12,color:"var(--muted)"}}>🔥 {streak} streak · 💪 {total} workouts</div>
          </div>
        </div>

        {/* avatar edit modal */}
        {editingAvatar&&(
          <div style={{marginBottom:16,padding:16,background:"var(--bg3)",borderRadius:14,border:"1px solid var(--border)"}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,marginBottom:12}}>CHANGE PROFILE PICTURE</div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginBottom:12}}>
              {newAvatarImg
                ?<img src={newAvatarImg} alt="av" style={{width:72,height:72,borderRadius:"50%",objectFit:"cover",border:"3px solid var(--accent)"}}/>
                :<div style={{width:72,height:72,borderRadius:"50%",background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,border:"2px solid var(--border)"}}>{newAvatar}</div>
              }
              <button className="btn-ghost" onClick={()=>avatarFileRef.current.click()} style={{fontSize:13}}>{newAvatarImg?"Change Photo":"Upload Photo"}</button>
              <input ref={avatarFileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleAvatarPhoto}/>
              {newAvatarImg&&<button className="btn-ghost" onClick={()=>setNewAvatarImg(null)} style={{fontSize:12,color:"var(--muted)"}}>Remove photo</button>}
            </div>
            {!newAvatarImg&&(
              <>
                <div style={{textAlign:"center",fontSize:12,color:"var(--muted)",marginBottom:8}}>— or pick an emoji —</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6,marginBottom:12}}>
                  {WOLF_AVATARS.map(a=>(
                    <button key={a} onClick={()=>setNewAvatar(a)} style={{padding:8,fontSize:22,borderRadius:10,cursor:"pointer",background:newAvatar===a?"rgba(124,92,191,0.25)":"var(--bg2)",border:newAvatar===a?"2px solid var(--accent)":"2px solid var(--border)"}}>{a}</button>
                  ))}
                </div>
              </>
            )}
            <div style={{display:"flex",gap:8}}>
              <button className="btn-primary" onClick={saveAvatar} style={{flex:1}}>SAVE</button>
              <button className="btn-ghost" onClick={()=>{setEditingAvatar(false);setNewAvatarImg(profile?.avatarImg||null);setNewAvatar(profile?.avatar||"🐺");}} style={{flex:1}}>Cancel</button>
            </div>
          </div>
        )}

        {/* tabs */}
        <div style={{display:"flex",gap:6,marginBottom:16}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 4px",borderRadius:10,cursor:"pointer",fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,background:tab===t.id?"rgba(124,92,191,0.2)":"var(--bg3)",border:tab===t.id?"1px solid var(--accent)":"1px solid var(--border)",color:tab===t.id?"var(--accent2)":"var(--muted)"}}>{t.label}</button>
          ))}
        </div>

        {/* ── TAB CONTENT — fixed min height so modal doesn't jump ── */}
        <div style={{minHeight:320}}>

          {/* STATS tab */}
          {tab==="stats"&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  ["🔥","Consecutive days logged",`${streak} day streak`],
                  ["🏆","Best consecutive days",`${longestStreak} days`],
                  ["💪","Total sessions logged",total],
                  ["📅","Sessions this month",Object.keys(history).filter(d=>{const m=new Date();return d.startsWith(`${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}`)&&history[d]?.[currentUser]?.done}).reduce((sum,d)=>{const s=history[d]?.[currentUser]?.workouts?.length||1;return sum+s;},0)],
                ].map(([icon,label,val])=>(
                  <div key={label} style={{padding:"14px",background:"var(--bg3)",borderRadius:14,border:"1px solid var(--border)",textAlign:"center"}}>
                    <div style={{fontSize:24,marginBottom:4}}>{icon}</div>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:1}}>{val}</div>
                    <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{label}</div>
                  </div>
                ))}
              </div>
              {profile?.personalGoal&&(
                <div style={{padding:"12px 14px",background:"rgba(124,92,191,0.1)",border:"1px solid rgba(124,92,191,0.25)",borderRadius:12}}>
                  <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>MY GOAL</div>
                  <div style={{fontSize:14,color:"var(--text)"}}>🎯 {profile.personalGoal}</div>
                </div>
              )}
            </div>
          )}

          {/* BODY tab — goal + weight combined */}
          {tab==="pb"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.6}}>Track your personal records. Private — only you can see these.</div>
              {/* Add PR form */}
              <div style={{display:"flex",flexDirection:"column",gap:8,padding:"12px",background:"var(--bg3)",borderRadius:12,border:"1px solid var(--border)"}}>
                <input className="input" placeholder="Exercise (e.g. Bench Press)" value={pbExercise} onChange={e=>setPbExercise(e.target.value)} maxLength={40}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <input className="input" placeholder="Value (e.g. 225)" value={pbValue} onChange={e=>setPbValue(e.target.value)} type="number" min={0}/>
                  <input className="input" placeholder="Unit (lbs, reps, min)" value={pbUnit} onChange={e=>setPbUnit(e.target.value)} maxLength={10}/>
                </div>
                <input className="input" placeholder="Note (optional)" value={pbNote} onChange={e=>setPbNote(e.target.value)} maxLength={60}/>
                <button className="btn-primary" onClick={savePB} disabled={!pbExercise.trim()||!pbValue}>LOG PR 🏆</button>
              </div>
              {/* PR list */}
              {(profile?.personalBests||[]).length===0?(
                <div style={{textAlign:"center",padding:"20px",color:"var(--muted)",fontSize:13}}>No PRs logged yet. Set your first one!</div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {(profile?.personalBests||[]).map((pb,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"var(--bg3)",borderRadius:12,border:"1px solid var(--border)"}}>
                      <div style={{fontSize:20}}>🏆</div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:1}}>{pb.exercise}</div>
                        <div style={{fontSize:13,color:"var(--accent2)",fontWeight:700}}>{pb.value} {pb.unit}</div>
                        {pb.note&&<div style={{fontSize:11,color:"var(--muted)",fontStyle:"italic"}}>{pb.note}</div>}
                        <div style={{fontSize:11,color:"var(--muted)"}}>{fmtDate(pb.date)}</div>
                      </div>
                      <button onClick={()=>deletePB(i)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:18,lineHeight:1}}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab==="body"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {/* Personal goal */}
              <div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--muted)",marginBottom:8}}>MY GOAL</div>
                <div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>Set a personal goal. Private by default — toggle to share with the pack.</div>
                <textarea className="input" rows={3} placeholder="e.g. Run a 5K by June, lose 15 lbs, bench 225..." value={goal} onChange={e=>setGoal(e.target.value)} maxLength={120} style={{resize:"none",marginBottom:8}}/>
                <div onClick={()=>setShareGoal(s=>!s)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--bg3)",borderRadius:10,border:"1px solid var(--border)",marginBottom:8,cursor:"pointer"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:"var(--text)"}}>Share with the pack</div>
                    <div style={{fontSize:11,color:"var(--muted)"}}>{shareGoal?"Visible on the Pack tab":"Only you can see this"}</div>
                  </div>
                  <div style={{width:44,height:24,borderRadius:12,background:shareGoal?"var(--accent)":"rgba(255,255,255,0.1)",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                    <div style={{position:"absolute",top:3,left:shareGoal?20:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn-primary" onClick={saveGoal} disabled={!goal.trim()} style={{flex:1}}>{goalSaved?"✓ SAVED!":"SAVE GOAL"}</button>
                  {profile?.personalGoal&&<button className="btn-ghost" onClick={()=>{setGoal("");onSaveGoal("",false);}} style={{flex:1}}>Clear</button>}
                </div>
              </div>
              <div style={{height:1,background:"var(--border)"}}/>
              {/* Weight log */}
              <div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--muted)",marginBottom:8}}>WEIGHT LOG <span style={{fontSize:10,color:"var(--muted)",letterSpacing:1}}>— private, only you see this</span></div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <input className="input" type="number" placeholder="Enter weight..." value={weight} onChange={e=>setWeight(e.target.value)} style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&logWeight()}/>
                  <select className="input" value={weightUnit} onChange={e=>setWeightUnit(e.target.value)} style={{width:70,appearance:"none",textAlign:"center"}}>
                    <option>lbs</option><option>kg</option>
                  </select>
                  <button onClick={logWeight} disabled={!weight} style={{padding:"10px 14px",background:"var(--accent)",border:"none",borderRadius:10,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13}}>LOG</button>
                </div>
                {weightLog.length===0?(
                  <div style={{textAlign:"center",padding:"16px",color:"var(--muted)",fontSize:13}}>No weight entries yet.</div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:180,overflowY:"auto"}}>
                    {weightLog.map((e,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",background:"var(--bg3)",borderRadius:10,border:"1px solid var(--border)"}}>
                        <span style={{fontSize:14,fontWeight:600}}>{e.w} {e.unit}</span>
                        <span style={{fontSize:12,color:"var(--muted)"}}>{fmtDate(e.date)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{height:1,background:"var(--border)",margin:"4px 0"}}/>
              {/* Zelle contact — private */}
              <div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--muted)",marginBottom:4}}>ZELLE CONTACT <span style={{fontSize:10,letterSpacing:1}}>— private, for challenge payments</span></div>
                <input className="input" placeholder="Phone or email for Zelle" value={zelleInfo} onChange={e=>setZelleInfo(e.target.value)} maxLength={50}/>
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <button className="btn-primary" onClick={saveZelle} disabled={zelleInfo===profile?.zelleContact}>{zelleSaved?"✓ SAVED!":"SAVE ZELLE"}</button>
                  {profile?.zelleContact&&<button className="btn-ghost" onClick={()=>{setZelleInfo("");onSaveZelle("");}}>Clear</button>}
                </div>
                <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>Only used when someone taps "Pay via Zelle" on a challenge you created. Never shown to others.</div>
              </div>
            </div>
          )}

          {/* AI TRAINER tab */}
          {tab==="ai"&&(
            <AITrainerProfileTab
              currentUser={currentUser}
              profile={profile}
              profiles={profiles}
              onSaveProfile={onSaveProfile}
            />
          )}

          {/* REST DAYS tab */}
          {tab==="rest"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {challenges.some(ch=>ch.status==="active"&&Object.keys(ch.participants||{}).includes(currentUser)&&ch.participants[currentUser]?.status==="accepted")?(
                <div style={{padding:"14px",background:"rgba(255,107,53,0.1)",border:"1px solid rgba(255,107,53,0.3)",borderRadius:12,textAlign:"center"}}>
                  <div style={{fontSize:24,marginBottom:6}}>🔒</div>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,color:"var(--orange)",marginBottom:4}}>LOCKED DURING CHALLENGE</div>
                  <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.5}}>You can't change rest days while in an active challenge. Finish or forfeit all active challenges first.</div>
                </div>
              ):(
                <>
                  <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.6}}>
                    Pick your personal rest days. Minimum 2 required.<br/>
                    <span style={{color:"var(--orange)"}}>Note: the gym is always closed on weekends.</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
                    {DAY_NAMES.map((name,i)=>{
                      const sel=restDays.includes(i);
                      const isWE=i===0||i===6;
                      return(
                        <button key={i} onClick={()=>toggleRestDay(i)} style={{
                          padding:"10px 4px",borderRadius:10,cursor:"pointer",textAlign:"center",
                          background:sel?"rgba(124,92,191,0.25)":"var(--bg3)",
                          border:sel?"1px solid var(--accent)":"1px solid var(--border)",
                          color:sel?"var(--accent2)":isWE?"var(--muted)":"var(--text)",
                          fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,
                          opacity:!sel&&restDays.length>=2?0.6:1,
                        }}>
                          <div>{name}</div>
                          {sel&&<div style={{fontSize:9,marginTop:2}}>REST</div>}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{fontSize:12,color:"var(--muted)"}}>Selected: {restDays.map(d=>DAY_NAMES[d]).join(", ")} ({restDays.length} days)</div>
                  <button className="btn-primary" onClick={saveRestDays}>{restSaved?"✓ SAVED!":"SAVE REST DAYS"}</button>
                </>
              )}
            </div>
          )}

          {/* PIN tab */}
          {tab==="pin"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {/* Name change */}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--muted)"}}>DISPLAY NAME</div>
                <input className="input" placeholder="Your name..." value={newName}
                  onChange={e=>{setNewName(e.target.value.slice(0,20));setNameErr("");setNameDone(false);}}
                  maxLength={20}/>
                {nameErr&&<div style={{color:"var(--red)",fontSize:13}}>{nameErr}</div>}
                {nameDone&&<div style={{color:"var(--green)",fontSize:13}}>✓ Name updated!</div>}
                <button className="btn-primary" onClick={()=>onChangeName(newName.trim(),setNameErr,setNameDone)}
                  disabled={!newName.trim()||newName.trim()===currentUser}>
                  UPDATE NAME
                </button>
              </div>
              <div style={{height:1,background:"var(--border)"}}/>
              {/* PIN change */}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--muted)"}}>CHANGE PIN</div>
                <input className="input" type="password" inputMode="numeric" placeholder="New 4-digit PIN" value={pin1} onChange={e=>setPin1(e.target.value.replace(/\D/g,"").slice(0,4))} maxLength={4} style={{letterSpacing:8,textAlign:"center",fontSize:22}}/>
                <input className="input" type="password" inputMode="numeric" placeholder="Confirm new PIN" value={pin2} onChange={e=>setPin2(e.target.value.replace(/\D/g,"").slice(0,4))} maxLength={4} style={{letterSpacing:8,textAlign:"center",fontSize:22}}/>
                {pinErr&&<div style={{color:"var(--red)",fontSize:13}}>{pinErr}</div>}
                {pinDone&&<div style={{color:"var(--green)",fontSize:13}}>✓ PIN updated!</div>}
                <button className="btn-primary" onClick={changePin} disabled={pin1.length!==4||pin2.length!==4}>UPDATE PIN</button>
              </div>
            </div>
          )}

        </div>{/* end min-height wrapper */}

                <button className="btn-ghost" style={{width:"100%",marginTop:12}} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ── EDIT WORKOUT MODAL ────────────────────────────────────────────────────────
function EditWorkoutModal({entry, date, currentUser, onClose, onSave, onDelete}){
  const [selected,setSelected]=useState(
    entry.workouts?.map(w=>WORKOUT_TYPES.find(x=>x.id===w.id)).filter(Boolean)||
    WORKOUT_TYPES.filter(w=>entry.workoutType===w.id)
  );
  const [note,setNote]=useState(entry.note||"");
  const [duration,setDuration]=useState(entry.duration||"");
  const toggle=w=>setSelected(s=>s.find(x=>x.id===w.id)?s.filter(x=>x.id!==w.id):[...s,w]);

  const save=()=>{
    if(selected.length===0)return;
    const icons=selected.map(w=>w.icon).join("");
    const labels=selected.map(w=>w.label).join(" + ");
    onSave(date,{...entry,workouts:selected.map(w=>({id:w.id,icon:w.icon,label:w.label})),workoutIcon:icons,workoutLabel:labels,note,duration:duration?Number(duration):null});
    onClose();
  };

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:6}}>EDIT WORKOUT</div>
        <div style={{fontSize:12,color:"var(--muted)",marginBottom:12}}>{fmtDate(date)}</div>
        <div className="workout-grid" style={{marginBottom:14}}>
          {WORKOUT_TYPES.map(w=>{
            const sel=!!selected.find(x=>x.id===w.id);
            return(
              <button key={w.id} className={`workout-tile ${sel?"selected":""}`} onClick={()=>toggle(w)} style={{position:"relative"}}>
                <div style={{fontSize:24,marginBottom:4}}>{w.icon}</div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1,color:sel?"var(--accent2)":"var(--muted)"}}>{w.label}</div>
                {sel&&<div style={{position:"absolute",top:4,right:4,width:14,height:14,borderRadius:"50%",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff"}}>✓</div>}
              </button>
            );
          })}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:4}}>
          <input className="input" placeholder="Note..." value={note} onChange={e=>setNote(e.target.value)} style={{flex:1}} maxLength={80}/>
          <input className="input" type="number" placeholder="mins" value={duration} onChange={e=>setDuration(e.target.value.slice(0,3))} style={{width:70,textAlign:"center"}} min={1}/>
        </div>
        <div style={{fontSize:11,color:"var(--muted)",marginBottom:12,textAlign:"right"}}>duration (optional)</div>
        <button className="btn-primary" onClick={save} disabled={selected.length===0}>SAVE CHANGES</button>
        <button onClick={onDelete} style={{width:"100%",marginTop:8,padding:"10px",background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.25)",borderRadius:10,cursor:"pointer",color:"var(--red)",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1}}>
          DELETE WORKOUT
        </button>
        <button className="btn-ghost" style={{width:"100%",marginTop:6}} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// Per-type field definitions
const LIFT_FOCUS = ["Legs","Arms","Chest","Back","Shoulders","Full Body","Core"];
const WORKOUT_FIELDS = {
  lift:   [{key:"focus",label:"Focus",placeholder:"e.g. Legs",text:true,isSelect:true,options:LIFT_FOCUS},{key:"rounds",label:"Rounds",placeholder:"e.g. 3",text:true},{key:"sets",label:"Sets",placeholder:"e.g. 4-6",text:true},{key:"reps",label:"Reps",placeholder:"e.g. 10-12",text:true},{key:"weight",label:"Weight (lbs)",placeholder:"e.g. 135-185",text:true},{key:"duration",label:"Duration (min)",placeholder:"e.g. 60"}],
  run:    [{key:"distance",label:"Distance (mi)",placeholder:"e.g. 3.1"},{key:"duration",label:"Duration (min)",placeholder:"e.g. 30"}],
  bike:   [{key:"distance",label:"Distance (mi)",placeholder:"e.g. 10"},{key:"duration",label:"Duration (min)",placeholder:"e.g. 45"}],
  hiit:   [{key:"rounds",label:"Rounds",placeholder:"e.g. 5",text:true},{key:"duration",label:"Duration (min)",placeholder:"e.g. 20"}],
  cardio: [{key:"duration",label:"Duration (min)",placeholder:"e.g. 30"},{key:"distance",label:"Distance (mi)",placeholder:"e.g. 2"}],
  walk:   [{key:"distance",label:"Distance (mi)",placeholder:"e.g. 1.5"},{key:"duration",label:"Duration (min)",placeholder:"e.g. 25"}],
  other:  [{key:"rounds",label:"Rounds",placeholder:"e.g. 3",text:true},{key:"duration",label:"Duration (min)",placeholder:"e.g. 45"}],
};

function formatWorkoutSummary(workouts, details){
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

function WorkoutSummaryDisplay({summary, workoutLabel, style={}}){
  // summary can be string (old) or used workoutLabel
  // Parse stacked workout display
  if(!workoutLabel&&!summary) return null;
  const lines = workoutLabel ? workoutLabel.split(" + ") : [summary];
  return(
    <div style={style}>
      {lines.map((line,i)=><div key={i} style={{fontSize:12,color:"var(--green)",lineHeight:1.6}}>{line}</div>)}
    </div>
  );
}

// ── AI TRAINER — profile settings tab ───────────────────────────────────────
function AITrainerProfileTab({currentUser, profile, profiles, onSaveProfile}){
  const cur=profile?.aiTrainer||{};
  const [goal,setGoal]=useState(cur.goal||"");
  const [secondaryGoal,setSecondaryGoal]=useState(cur.secondaryGoal||"none");
  const [experience,setExperience]=useState(cur.experience||"");
  const [injuries,setInjuries]=useState(cur.injuries||[]);
  const [usualSetup,setUsualSetup]=useState(cur.usualSetup||"home");
  const [customInjury,setCustomInjury]=useState("");
  const [saved,setSaved]=useState(false);

  const toggleInjury=(inj)=>{
    setInjuries(prev=>prev.includes(inj)?prev.filter(x=>x!==inj):[...prev,inj]);
    setSaved(false);
  };

  const addCustomInjury=()=>{
    if(customInjury.trim()){
      setInjuries(prev=>[...prev,customInjury.trim()]);
      setCustomInjury("");
      setSaved(false);
    }
  };

  const save=async()=>{
    const updated={
      ...profile,
      aiTrainer:{
        ...cur,
        goal,
        secondaryGoal:secondaryGoal==="none"?null:secondaryGoal,
        experience,
        injuries,
        usualSetup,
      },
    };
    const np={...profiles,[currentUser]:updated};
    await fsSet("wolfpack/profiles",{users:np});
    if(onSaveProfile)onSaveProfile(np);
    setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.5}}>
        WOLFMODE uses this to build workouts tailored to you. Set these once — change anytime.
      </div>

      {/* Goal */}
      <div>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>🎯 PRIMARY GOAL</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {AI_GOALS.map(g=>{
            const sel=goal===g.id;
            return(
              <button key={g.id} onClick={()=>{setGoal(g.id);setSaved(false);}}
                style={{
                  padding:"10px 8px",borderRadius:10,cursor:"pointer",textAlign:"left",
                  background:sel?"rgba(124,92,191,0.2)":"var(--bg3)",
                  border:sel?"1px solid var(--accent)":"1px solid var(--border)",
                  display:"flex",alignItems:"center",gap:8,
                }}>
                <span style={{fontSize:18}}>{g.icon}</span>
                <span style={{fontSize:12,color:sel?"var(--accent2)":"#fff"}}>{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary Goal */}
      <div>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,color:"var(--accent2)",marginBottom:4}}>➕ SECONDARY FOCUS <span style={{fontSize:9,color:"var(--muted)",fontFamily:"inherit",letterSpacing:1}}>(OPTIONAL)</span></div>
        <div style={{fontSize:10,color:"var(--muted)",marginBottom:8}}>Shapes how workouts are programmed — primary goal still drives muscle focus.</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {AI_SECONDARY_GOALS.map(s=>{
            const sel=(secondaryGoal||"none")===s.id;
            return(
              <button key={s.id} onClick={()=>{setSecondaryGoal(s.id);setSaved(false);}}
                style={{
                  padding:"10px 12px",borderRadius:10,cursor:"pointer",textAlign:"left",
                  background:sel?"rgba(124,92,191,0.15)":"var(--bg3)",
                  border:sel?"1px solid var(--accent)":"1px solid var(--border)",
                  display:"flex",alignItems:"center",gap:10,
                }}>
                <span style={{fontSize:16,flexShrink:0}}>{s.icon}</span>
                <div>
                  <div style={{fontSize:12,color:sel?"var(--accent2)":"#fff",marginBottom:1}}>{s.label}</div>
                  <div style={{fontSize:10,color:"var(--muted)"}}>{s.desc}</div>
                </div>
                {sel&&<div style={{marginLeft:"auto",color:"var(--accent)",fontSize:14}}>✓</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Experience */}
      <div>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>📊 EXPERIENCE LEVEL</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {AI_EXPERIENCE.map(e=>{
            const sel=experience===e.id;
            return(
              <button key={e.id} onClick={()=>{setExperience(e.id);setSaved(false);}}
                style={{
                  padding:"10px 12px",borderRadius:10,cursor:"pointer",textAlign:"left",
                  background:sel?"rgba(124,92,191,0.2)":"var(--bg3)",
                  border:sel?"1px solid var(--accent)":"1px solid var(--border)",
                }}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1.5,color:sel?"var(--accent2)":"#fff",marginBottom:2}}>{e.label}</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>{e.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Injuries */}
      <div>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>🚨 INJURIES & LIMITATIONS</div>
        <div style={{fontSize:11,color:"var(--muted)",marginBottom:8}}>Tap any that apply. The AI will avoid movements that aggravate these.</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
          {AI_INJURIES.map(inj=>{
            const sel=injuries.includes(inj);
            return(
              <button key={inj} onClick={()=>toggleInjury(inj)}
                style={{
                  padding:"6px 12px",borderRadius:20,cursor:"pointer",fontSize:11,
                  background:sel?"rgba(231,76,60,0.15)":"var(--bg3)",
                  border:sel?"1px solid var(--red)":"1px solid var(--border)",
                  color:sel?"var(--red)":"var(--muted)",
                }}>
                {sel?"✕ ":""}{inj}
              </button>
            );
          })}
        </div>
        {/* Custom injuries already added (those not in AI_INJURIES) */}
        {injuries.filter(i=>!AI_INJURIES.includes(i)).length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
            {injuries.filter(i=>!AI_INJURIES.includes(i)).map(inj=>(
              <button key={inj} onClick={()=>toggleInjury(inj)}
                style={{
                  padding:"6px 12px",borderRadius:20,cursor:"pointer",fontSize:11,
                  background:"rgba(231,76,60,0.15)",border:"1px solid var(--red)",color:"var(--red)",
                }}>
                ✕ {inj}
              </button>
            ))}
          </div>
        )}
        <div style={{display:"flex",gap:6}}>
          <input className="input" placeholder="Add custom (e.g. 'plantar fasciitis')"
            value={customInjury} onChange={e=>setCustomInjury(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addCustomInjury()}
            style={{padding:8,fontSize:12,flex:1}}/>
          <button className="btn-ghost" onClick={addCustomInjury} disabled={!customInjury.trim()} style={{padding:"6px 12px",fontSize:12}}>+ Add</button>
        </div>
      </div>

      {/* Usual setup */}
      <div>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>🏠 USUAL TRAINING SPOT</div>
        <div style={{fontSize:11,color:"var(--muted)",marginBottom:8}}>Defaults to this when you generate a workout (you can change it each time).</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {AI_EQUIPMENT_PRESETS.map(p=>{
            const sel=usualSetup===p.id;
            return(
              <button key={p.id} onClick={()=>{setUsualSetup(p.id);setSaved(false);}}
                style={{
                  padding:"10px 8px",borderRadius:10,cursor:"pointer",textAlign:"left",
                  background:sel?"rgba(124,92,191,0.2)":"var(--bg3)",
                  border:sel?"1px solid var(--accent)":"1px solid var(--border)",
                }}>
                <div style={{fontSize:16,marginBottom:2}}>{p.icon}</div>
                <div style={{fontSize:11,color:sel?"var(--accent2)":"#fff"}}>{p.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <button className="btn-primary" onClick={save} disabled={!goal||!experience}>
        {saved?"✓ SAVED":"SAVE AI TRAINER SETTINGS"}
      </button>

      {/* Reset button */}
      <button onClick={async()=>{
        if(!window.confirm("Clear all your AI Trainer data? This resets your goal, experience, injuries, nutrition stats, and saved plan."))return;
        const updated={...profile,aiTrainer:{}};
        const np={...profiles,[currentUser]:updated};
        await fsSet("wolfpack/profiles",{users:np});
        if(onSaveProfile)onSaveProfile(np);
        setGoal("");setExperience("");setInjuries([]);setUsualSetup("home");setSaved(false);
      }} style={{
        width:"100%",padding:"10px",borderRadius:10,cursor:"pointer",
        background:"transparent",border:"1px solid rgba(231,76,60,0.2)",
        color:"rgba(231,76,60,0.5)",fontSize:11,marginTop:4,
      }}>
        🗑️ Reset all AI Trainer data
      </button>

      {/* ── AI COACH (Nutrition + Supplements) Section ── */}
      <AICoachSection
        currentUser={currentUser}
        profile={profile}
        profiles={profiles}
        onSaveProfile={onSaveProfile}
      />
    </div>
  );
}

// ── AI COACH — nutrition + supplements (opt-in) ─────────────────────────────
function AICoachSection({currentUser, profile, profiles, onSaveProfile}){
  const coach=profile?.aiTrainer?.coach||{};
  const enabled=!!coach.enabled;
  const acknowledged=!!coach.disclaimerAcknowledged;
  const [showDisclaimer,setShowDisclaimer]=useState(false);
  const [showStats,setShowStats]=useState(false);
  const [showPlan,setShowPlan]=useState(false);

  const enableCoach=async()=>{
    // Open disclaimer modal first if they haven't accepted it before
    if(!acknowledged){
      setShowDisclaimer(true);
    }else{
      // Already accepted in the past — just flip the toggle on
      await persistCoach({enabled:true});
    }
  };

  const disableCoach=async()=>{
    await persistCoach({enabled:false});
  };

  const persistCoach=async(updates)=>{
    const updated={
      ...profile,
      aiTrainer:{
        ...(profile?.aiTrainer||{}),
        coach:{...coach,...updates},
      },
    };
    const np={...profiles,[currentUser]:updated};
    await fsSet("wolfpack/profiles",{users:np});
    if(onSaveProfile)onSaveProfile(np);
  };

  return(
    <>
      <div style={{
        marginTop:20,
        padding:"14px 16px",
        background:"linear-gradient(135deg, rgba(255,107,53,0.06), rgba(124,92,191,0.06))",
        border:"1px solid var(--border)",
        borderRadius:14,
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:20}}>🥩</span>
            <div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,color:"var(--accent2)"}}>NUTRITION & SUPPLEMENTS</div>
              <div style={{fontSize:10,color:"var(--muted)"}}>Optional · macros + supp suggestions</div>
            </div>
          </div>
          <button
            onClick={enabled?disableCoach:enableCoach}
            style={{
              padding:"6px 14px",borderRadius:20,cursor:"pointer",fontSize:11,
              background:enabled?"rgba(46,204,113,0.15)":"var(--bg3)",
              border:enabled?"1px solid var(--green)":"1px solid var(--border)",
              color:enabled?"var(--green)":"var(--muted)",
              fontFamily:"'Bebas Neue',cursive",letterSpacing:1.5,
            }}>
            {enabled?"✓ ENABLED":"+ ENABLE"}
          </button>
        </div>
        {!enabled&&(
          <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.5,marginTop:6}}>
            Want the AI to suggest calories, macros, and supplements based on your goal? Enable this and it'll personalize a plan. It's purely informational — not medical advice.
          </div>
        )}
        {enabled&&(
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:10}}>
            <button className="btn-ghost" onClick={()=>setShowStats(true)} style={{justifyContent:"flex-start",padding:"10px 12px",fontSize:12}}>
              {coach.stats?"✏️ Edit my stats":"📝 Enter my stats (required)"}
            </button>
            {coach.stats&&(
              <button className="btn-primary" onClick={()=>setShowPlan(true)} style={{fontSize:12,padding:"10px 12px"}}>
                🤖 GET MY NUTRITION & SUPP PLAN
              </button>
            )}
            {coach.lastPlan&&(
              <button className="btn-ghost" onClick={()=>setShowPlan(true)} style={{justifyContent:"flex-start",padding:"8px 12px",fontSize:11,color:"var(--muted)"}}>
                📋 View last plan ({new Date(coach.lastPlan.generatedAt).toLocaleDateString()})
              </button>
            )}
          </div>
        )}
      </div>

      {showDisclaimer&&(
        <CoachDisclaimerModal
          onAccept={async()=>{
            await persistCoach({enabled:true,disclaimerAcknowledged:true,disclaimerAcceptedAt:Date.now()});
            setShowDisclaimer(false);
          }}
          onClose={()=>setShowDisclaimer(false)}
        />
      )}

      {showStats&&(
        <CoachStatsModal
          coach={coach}
          onSave={async(stats)=>{
            await persistCoach({stats});
            setShowStats(false);
          }}
          onClose={()=>setShowStats(false)}
        />
      )}

      {showPlan&&(
        <CoachPlanModal
          currentUser={currentUser}
          profile={profile}
          coach={coach}
          onPlanGenerated={async(plan)=>{
            await persistCoach({lastPlan:{...plan,generatedAt:Date.now()}});
          }}
          onClose={()=>setShowPlan(false)}
        />
      )}
    </>
  );
}

// ── AI COACH — disclaimer modal (shown once) ────────────────────────────────
function CoachDisclaimerModal({onAccept, onClose}){
  const [ack,setAck]=useState(false);
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:1100}}>
      <div className="modal" style={{maxHeight:"85dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        <div style={{textAlign:"center",fontSize:32,marginBottom:8}}>⚠️</div>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,textAlign:"center",marginBottom:12}}>BEFORE YOU CONTINUE</div>

        <div style={{
          padding:"12px 14px",marginBottom:12,
          background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,
          fontSize:12,color:"rgba(255,255,255,0.85)",lineHeight:1.6,
        }}>
          <div style={{marginBottom:10}}>
            <strong style={{color:"var(--accent2)"}}>This is INFORMATIONAL ONLY.</strong> The AI Coach is not a doctor, dietitian, or medical professional. Nothing it suggests is medical advice.
          </div>
          <div style={{marginBottom:10}}>
            <strong style={{color:"var(--orange)"}}>Always talk to a healthcare provider</strong> before starting any supplement, making significant diet changes, or beginning a new exercise program — especially if you take medications, have a medical condition, are pregnant or nursing, or are under 18.
          </div>
          <div style={{marginBottom:10}}>
            <strong style={{color:"var(--red)"}}>You are responsible</strong> for your own health decisions. Neither WOLFPACK nor its creators are liable for outcomes from any information provided.
          </div>
          <div>
            Supplement suggestions stick to widely-available OTC items. The AI will not recommend prescription drugs, hormones, SARMs, or anything similar.
          </div>
        </div>

        <label style={{
          display:"flex",alignItems:"flex-start",gap:10,
          padding:"10px 12px",marginBottom:12,
          background:ack?"rgba(46,204,113,0.08)":"var(--bg3)",
          border:ack?"1px solid var(--green)":"1px solid var(--border)",
          borderRadius:10,cursor:"pointer",
        }}>
          <input
            type="checkbox"
            checked={ack}
            onChange={e=>setAck(e.target.checked)}
            style={{marginTop:2,flexShrink:0,accentColor:"var(--accent)"}}
          />
          <span style={{fontSize:12,color:"rgba(255,255,255,0.85)",lineHeight:1.5}}>
            I understand this is informational only, not medical advice. I will consult a healthcare provider before making decisions based on it.
          </span>
        </label>

        <div style={{display:"flex",gap:8}}>
          <button className="btn-ghost" onClick={onClose} style={{flex:1}}>CANCEL</button>
          <button className="btn-primary" onClick={onAccept} disabled={!ack} style={{flex:1}}>I AGREE</button>
        </div>
      </div>
    </div>
  );
}

// ── AI COACH — stats input modal ────────────────────────────────────────────
function CoachStatsModal({coach, onSave, onClose}){
  const stats=coach.stats||{};
  const [age,setAge]=useState(stats.age||"");
  const [feet,setFeet]=useState(stats.feet||"");
  const [inches,setInches]=useState(stats.inches||"");
  const [weight,setWeight]=useState(stats.weight||"");
  const [gender,setGender]=useState(stats.gender||"");
  const [bulkCut,setBulkCut]=useState(stats.bulkCut||"");
  const [activity,setActivity]=useState(stats.activity||"");
  const [diet,setDiet]=useState(stats.diet||"No restrictions");

  const canSave=age&&feet&&weight&&gender&&bulkCut&&activity;

  const save=()=>{
    onSave({
      age:Number(age),
      feet:Number(feet),
      inches:Number(inches)||0,
      heightInches:Number(feet)*12+(Number(inches)||0),
      weight:Number(weight),
      gender,
      bulkCut,
      activity,
      diet,
    });
  };

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:1100}}>
      <div className="modal" style={{maxHeight:"90dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:4}}>YOUR STATS</div>
        <div style={{fontSize:11,color:"var(--muted)",marginBottom:14}}>Used only to personalize your nutrition plan. Saved to your profile, never shared with the pack.</div>

        {/* Age + Weight */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div>
            <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Age</div>
            <input className="input" type="number" value={age} onChange={e=>setAge(e.target.value)} placeholder="e.g. 28" style={{padding:10}}/>
          </div>
          <div>
            <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Weight (lbs)</div>
            <input className="input" type="number" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="e.g. 175" style={{padding:10}}/>
          </div>
        </div>

        {/* Height */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Height</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <input className="input" type="number" value={feet} onChange={e=>setFeet(e.target.value)} placeholder="5" style={{padding:10}}/>
              <span style={{fontSize:12,color:"var(--muted)"}}>ft</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <input className="input" type="number" value={inches} onChange={e=>setInches(e.target.value)} placeholder="10" style={{padding:10}}/>
              <span style={{fontSize:12,color:"var(--muted)"}}>in</span>
            </div>
          </div>
        </div>

        {/* Gender */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>Gender (for calorie math)</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {AI_GENDERS.map(g=>{
              const sel=gender===g.id;
              return(
                <button key={g.id} onClick={()=>setGender(g.id)} style={{
                  padding:"8px 14px",borderRadius:20,cursor:"pointer",fontSize:12,
                  background:sel?"rgba(124,92,191,0.2)":"var(--bg3)",
                  border:sel?"1px solid var(--accent)":"1px solid var(--border)",
                  color:sel?"var(--accent2)":"var(--muted)",
                }}>{g.label}</button>
              );
            })}
          </div>
        </div>

        {/* Bulk/Cut/Maintain */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>Goal Mode</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            {AI_BULK_CUT.map(b=>{
              const sel=bulkCut===b.id;
              return(
                <button key={b.id} onClick={()=>setBulkCut(b.id)} style={{
                  padding:"10px 6px",borderRadius:12,cursor:"pointer",textAlign:"center",
                  background:sel?"rgba(124,92,191,0.2)":"var(--bg3)",
                  border:sel?"1px solid var(--accent)":"1px solid var(--border)",
                }}>
                  <div style={{fontSize:18,marginBottom:2}}>{b.icon}</div>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1.5,color:sel?"var(--accent2)":"#fff"}}>{b.label}</div>
                  <div style={{fontSize:9,color:"var(--muted)",marginTop:2,lineHeight:1.3}}>{b.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Activity Level */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>Activity Level</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {AI_ACTIVITY_LEVELS.map(a=>{
              const sel=activity===a.id;
              return(
                <button key={a.id} onClick={()=>setActivity(a.id)} style={{
                  padding:"10px 12px",borderRadius:10,cursor:"pointer",textAlign:"left",
                  background:sel?"rgba(124,92,191,0.15)":"var(--bg3)",
                  border:sel?"1px solid var(--accent)":"1px solid var(--border)",
                }}>
                  <div style={{fontSize:12,color:sel?"var(--accent2)":"#fff",marginBottom:2}}>{a.label}</div>
                  <div style={{fontSize:10,color:"var(--muted)"}}>{a.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Diet */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>Dietary Restrictions</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {AI_DIETS.map(d=>{
              const sel=diet===d;
              return(
                <button key={d} onClick={()=>setDiet(d)} style={{
                  padding:"6px 12px",borderRadius:20,cursor:"pointer",fontSize:11,
                  background:sel?"rgba(124,92,191,0.2)":"var(--bg3)",
                  border:sel?"1px solid var(--accent)":"1px solid var(--border)",
                  color:sel?"var(--accent2)":"var(--muted)",
                }}>{d}</button>
              );
            })}
          </div>
        </div>

        <button className="btn-primary" onClick={save} disabled={!canSave}>SAVE STATS</button>
        <div style={{textAlign:"center",fontSize:10,color:"var(--muted)",marginTop:8,fontStyle:"italic"}}>
          Informational only — not medical advice
        </div>
      </div>
    </div>
  );
}

// ── AI COACH — nutrition plan modal (results) ───────────────────────────────
function CoachPlanModal({currentUser, profile, coach, onPlanGenerated, onClose}){
  const [step,setStep]=useState(coach.lastPlan?"result":"loading");
  const [plan,setPlan]=useState(coach.lastPlan||null);
  const [error,setError]=useState(null);

  const generate=async()=>{
    setStep("loading");
    setError(null);
    const stats=coach.stats||{};
    const goalLabel=AI_GOALS.find(g=>g.id===profile?.aiTrainer?.goal)?.label||"General Fitness";
    const result=await aiGenerateNutritionPlan({
      userName:currentUser,
      age:stats.age,
      heightInches:stats.heightInches,
      weightLbs:stats.weight,
      gender:stats.gender,
      bulkCut:stats.bulkCut,
      activityLevel:stats.activity,
      dietaryRestrictions:stats.diet,
      goal:goalLabel,
    });
    if(result.ok){
      setPlan(result.plan);
      setStep("result");
      if(onPlanGenerated){await onPlanGenerated(result.plan);}
    }else{
      setError(result.error);
      setStep("error");
    }
  };

  // Auto-generate on first open if no cached plan
  useEffect(()=>{
    if(!coach.lastPlan)generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:1100}}>
      <div className="modal" style={{maxHeight:"92dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>

        {step==="loading"&&(
          <div style={{textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:48,marginBottom:14,animation:"spin 2s linear infinite",display:"inline-block"}}>🥩</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2,marginBottom:6}}>BUILDING YOUR PLAN</div>
            <div style={{fontSize:12,color:"var(--muted)"}}>Calculating calories, macros, and supplement fit...</div>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {step==="error"&&(
          <div style={{textAlign:"center",padding:"30px 20px"}}>
            <div style={{fontSize:36,marginBottom:10}}>😬</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:2,marginBottom:8}}>SOMETHING WENT WRONG</div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:14}}>{error}</div>
            <button className="btn-primary" onClick={generate} style={{maxWidth:200,margin:"0 auto"}}>TRY AGAIN</button>
          </div>
        )}

        {step==="result"&&plan&&(
          <>
            <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
              <div style={{fontSize:24}}>🥩</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:2,lineHeight:1.1}}>YOUR NUTRITION PLAN</div>
                <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{coach.stats?.bulkCut?.toUpperCase()} mode · {coach.stats?.activity} activity</div>
              </div>
            </div>

            {plan.explanation&&(
              <div style={{
                padding:"10px 12px",marginBottom:12,
                background:"rgba(124,92,191,0.08)",
                border:"1px solid rgba(124,92,191,0.2)",
                borderRadius:10,fontSize:12,color:"rgba(255,255,255,0.85)",lineHeight:1.5,fontStyle:"italic",
              }}>
                💭 {plan.explanation}
              </div>
            )}

            {/* Calorie card */}
            <div style={{
              padding:"14px",marginBottom:10,
              background:"linear-gradient(135deg, rgba(255,107,53,0.1), rgba(124,92,191,0.06))",
              border:"1px solid rgba(255,107,53,0.3)",
              borderRadius:14,textAlign:"center",
            }}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--muted)",marginBottom:2}}>DAILY TARGET</div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:34,letterSpacing:2,color:"var(--orange)",lineHeight:1}}>{plan.calorieTarget?.toLocaleString()}</div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>calories per day {plan.tdee&&`· TDEE: ${plan.tdee.toLocaleString()}`}</div>
            </div>

            {/* Macro cards */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
              <div style={{padding:"10px 8px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--muted)"}}>Protein</div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"#ef4444"}}>{plan.macros?.proteinGrams}g</div>
              </div>
              <div style={{padding:"10px 8px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--muted)"}}>Carbs</div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"#f59e0b"}}>{plan.macros?.carbsGrams}g</div>
              </div>
              <div style={{padding:"10px 8px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--muted)"}}>Fat</div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"#a78bfa"}}>{plan.macros?.fatGrams}g</div>
              </div>
            </div>

            {plan.mealTiming&&(
              <div style={{
                padding:"10px 12px",marginBottom:14,
                background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,
                fontSize:12,color:"rgba(255,255,255,0.8)",lineHeight:1.5,
              }}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:10,letterSpacing:2,color:"var(--accent2)",marginBottom:4}}>⏰ MEAL TIMING</div>
                {plan.mealTiming}
              </div>
            )}

            {/* Supplements */}
            {plan.supplements?.length>0&&(
              <>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>💊 SUPPLEMENT SUGGESTIONS</div>
                {plan.supplements.map((s,i)=>(
                  <div key={i} style={{
                    marginBottom:8,padding:"10px 12px",
                    background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,
                  }}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1.5,color:"#fff"}}>{s.name}</div>
                      {s.priority==="high"&&<span style={{fontSize:10,padding:"2px 8px",background:"rgba(46,204,113,0.15)",border:"1px solid var(--green)",borderRadius:10,color:"var(--green)"}}>RECOMMENDED</span>}
                    </div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.75)",marginBottom:4,lineHeight:1.5}}>{s.why}</div>
                    {s.typicalUse&&<div style={{fontSize:11,color:"var(--muted)",fontStyle:"italic"}}>Typical use: {s.typicalUse}</div>}
                  </div>
                ))}
              </>
            )}

            <div style={{
              padding:"10px 12px",marginTop:12,marginBottom:12,
              background:"rgba(231,76,60,0.05)",border:"1px solid rgba(231,76,60,0.2)",borderRadius:10,
              fontSize:10,color:"var(--muted)",lineHeight:1.5,textAlign:"center",
            }}>
              ⚠️ Informational only — not medical advice. Consult a healthcare provider before starting any supplement or significant diet change.
            </div>

            <div style={{display:"flex",gap:8}}>
              <button className="btn-primary" onClick={generate} style={{flex:1}}>🔄 REGENERATE</button>
              <button className="btn-ghost" onClick={onClose} style={{flex:1}}>CLOSE</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── AI TRAINER — exercise card (form cues + GIF) ─────────────────────────────
function ExerciseCard({exercise, userName, experience, injuries, idx}){
  const [expanded,setExpanded]=useState(false);
  const [cues,setCues]=useState(null);
  const [cuesLoading,setCuesLoading]=useState(false);
  const [cuesError,setCuesError]=useState(null);

  const handleExpand=async()=>{
    const next=!expanded;
    setExpanded(next);
    if(next&&!cues&&!cuesLoading){
      setCuesLoading(true);
      setCuesError(null);
      const cueRes=await aiGenerateFormCues({
        userName,
        exerciseName:exercise.name,
        experience:experience||"intermediate",
        injuries:injuries||"",
      });
      if(cueRes.ok){setCues(cueRes.cues);}
      else{setCuesError(cueRes.error||"Couldn't load form cues.");}
      setCuesLoading(false);
    }
  };

  // Capitalise primary muscle for display
  const muscleLabel=exercise.primaryMuscle
    ? exercise.primaryMuscle.charAt(0).toUpperCase()+exercise.primaryMuscle.slice(1)
    : null;

  return(
    <div style={{marginBottom:10,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden"}}>
      {/* Header row */}
      <div onClick={handleExpand} style={{padding:"12px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
        <div style={{
          width:28,height:28,borderRadius:"50%",
          background:"rgba(124,92,191,0.2)",border:"1px solid rgba(124,92,191,0.4)",
          color:"var(--accent2)",display:"flex",alignItems:"center",justifyContent:"center",
          fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1,flexShrink:0,
        }}>{idx+1}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:1.5,color:"#fff",marginBottom:2}}>
            {exercise.name}
          </div>
          <div style={{fontSize:11,color:"var(--muted)",display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <span>{exercise.sets} × {exercise.reps}</span>
            {exercise.weight&&exercise.weight!=="bodyweight"&&<span>· {exercise.weight}</span>}
            {exercise.weight==="bodyweight"&&<span>· bodyweight</span>}
            {exercise.restSeconds&&<span>· {exercise.restSeconds}s rest</span>}
            {muscleLabel&&(
              <span style={{
                padding:"1px 7px",borderRadius:10,fontSize:10,
                background:"rgba(255,107,53,0.12)",
                border:"1px solid rgba(255,107,53,0.25)",
                color:"#ff6b35",
              }}>{muscleLabel}</span>
            )}
          </div>
        </div>
        <div style={{fontSize:18,color:"var(--muted)",transition:"transform .2s",transform:expanded?"rotate(180deg)":"rotate(0)"}}>▾</div>
      </div>

      {/* Expanded content */}
      {expanded&&(
        <div style={{padding:"0 14px 14px",borderTop:"1px solid var(--border)"}}>
          {exercise.notes&&(
            <div style={{marginTop:12,padding:"8px 12px",background:"rgba(255,107,53,0.08)",border:"1px solid rgba(255,107,53,0.2)",borderRadius:10,fontSize:12,color:"var(--orange)"}}>
              💡 {exercise.notes}
            </div>
          )}

          {/* YouTube form guide — opens in external browser so music keeps playing */}
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name+" exercise form")}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display:"flex",alignItems:"center",gap:10,
              marginTop:12,padding:"10px 14px",
              background:"rgba(255,0,0,0.06)",
              border:"1px solid rgba(255,0,0,0.15)",
              borderRadius:10,textDecoration:"none",
            }}>
            <span style={{fontSize:20}}>▶️</span>
            <div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1.5,color:"#ff5555"}}>WATCH FORM GUIDE</div>
              <div style={{fontSize:10,color:"var(--muted)"}}>{exercise.name} · opens in browser</div>
            </div>
          </a>

          {/* Form cues */}
          <div style={{marginTop:12}}>
            {cuesLoading&&<div style={{textAlign:"center",padding:14,color:"var(--muted)",fontSize:12}}>Writing form cues...</div>}
            {cuesError&&<div style={{padding:10,color:"var(--red)",fontSize:12,textAlign:"center"}}>{cuesError}</div>}
            {cues&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {cues.setup&&(
                  <div>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:4}}>SETUP</div>
                    <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",lineHeight:1.5}}>{cues.setup}</div>
                  </div>
                )}
                {cues.execution&&(
                  <div>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:4}}>EXECUTION</div>
                    <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",lineHeight:1.5}}>{cues.execution}</div>
                  </div>
                )}
                {cues.commonMistakes?.length>0&&(
                  <div>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--red)",marginBottom:4}}>AVOID</div>
                    <ul style={{margin:0,paddingLeft:18,fontSize:13,color:"rgba(255,255,255,0.75)",lineHeight:1.6}}>
                      {cues.commonMistakes.map((m,i)=><li key={i}>{m}</li>)}
                    </ul>
                  </div>
                )}
                {cues.breathing&&(
                  <div>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--muted)",marginBottom:4}}>BREATHING</div>
                    <div style={{fontSize:13,color:"rgba(255,255,255,0.75)",lineHeight:1.5}}>{cues.breathing}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── AI TRAINER MODAL ────────────────────────────────────────────────────────
function AITrainerModal({currentUser, profile, history, packHomeGym, onClose, onUseWorkout, showToast}){
  const [step,setStep]=useState("setup");
  const [selectedPreset,setSelectedPreset]=useState(profile?.aiTrainer?.usualSetup||"home");
  const [customEquip,setCustomEquip]=useState(profile?.aiTrainer?.savedPresets?.[0]?.equipment||"");
  const [showCustomEditor,setShowCustomEditor]=useState(false);
  const [savedPresets,setSavedPresets]=useState(profile?.aiTrainer?.savedPresets||[]);
  const [workout,setWorkout]=useState(null);
  const [error,setError]=useState(null);
  const [regenCount,setRegenCount]=useState(getRegenCount(currentUser));

  // Muscle group state
  const [muscleGroup,setMuscleGroup]=useState(null); // null = AI picks
  const [aiPickingMuscle,setAiPickingMuscle]=useState(false);
  const [aiMuscleReason,setAiMuscleReason]=useState("");
  // muscle group state only — volume controlled by AI

  const goal=profile?.aiTrainer?.goal;
  const experience=profile?.aiTrainer?.experience;
  const injuries=(profile?.aiTrainer?.injuries||[]).join(", ");
  const goalLabel=AI_GOALS.find(g=>g.id===goal)?.label||goal;

  // AI Pick for muscle group — looks at recent history and suggests
  const handleAIPick=()=>{
    setAiPickingMuscle(true);
    const history7=getRecentHistoryString(history,currentUser);
    // Simple heuristic: scan recent history for muscle keywords and pick the least-trained
    const groups=["chest","back","legs","glutes","shoulders","arms","core"];
    const counts={};
    groups.forEach(g=>{counts[g]=0;});
    const lower=history7.toLowerCase();
    if(lower.includes("chest")||lower.includes("bench")||lower.includes("push")) counts.chest+=2;
    if(lower.includes("back")||lower.includes("pull")||lower.includes("row")||lower.includes("lat")) counts.back+=2;
    if(lower.includes("leg")||lower.includes("squat")||lower.includes("lunge")) counts.legs+=2;
    if(lower.includes("glute")||lower.includes("hip thrust")||lower.includes("rdl")) counts.glutes+=2;
    if(lower.includes("shoulder")||lower.includes("press")||lower.includes("delt")) counts.shoulders+=2;
    if(lower.includes("arm")||lower.includes("curl")||lower.includes("tricep")||lower.includes("bicep")) counts.arms+=2;
    if(lower.includes("core")||lower.includes("abs")||lower.includes("plank")) counts.core+=2;
    // Find least trained
    const sorted=groups.sort((a,b)=>counts[a]-counts[b]);
    const pick=sorted[0];
    const mg=AI_MUSCLE_GROUPS.find(m=>m.id===pick)||AI_MUSCLE_GROUPS[7]; // fallback full body
    setMuscleGroup(mg.id);
    setAiMuscleReason(`You haven't trained ${mg.label.toLowerCase()} much recently — good time to hit it.`);
    setAiPickingMuscle(false);
  };

  const generate=async(isRegen=false)=>{
    if(isRegen&&regenCount>=MAX_DAILY_REGENS){
      showToast(`Daily limit reached (${MAX_DAILY_REGENS} regens). Try again tomorrow.`);
      return;
    }
    setStep("loading");
    setError(null);
    const equipment=buildEquipmentString(selectedPreset,customEquip,packHomeGym);
    const bulkCut=profile?.aiTrainer?.coach?.stats?.bulkCut;
    const muscleLabel=muscleGroup?AI_MUSCLE_GROUPS.find(m=>m.id===muscleGroup)?.label:"AI's choice based on history";
    const secondaryGoal=profile?.aiTrainer?.secondaryGoal;
    const secondaryLabel=secondaryGoal?AI_SECONDARY_GOALS.find(s=>s.id===secondaryGoal)?.label:null;
    // Build a single clean goal string — fold bulk/cut and secondary goal in here
    const fullGoal=[
      goalLabel,
      bulkCut?`(${bulkCut==="bulk"?"bulking":bulkCut==="cut"?"cutting":"maintaining"})`:null,
      secondaryLabel?`+ ${secondaryLabel}`:null,
    ].filter(Boolean).join(" ");
    const result=await aiGenerateWorkout({
      userName:currentUser,
      goal:fullGoal,
      experience:experience||"intermediate",
      injuries:injuries||"None",
      equipment,
      recentHistory:getRecentHistoryString(history,currentUser).split("|").slice(0,3).join("|"),
      muscleGroup:muscleLabel,
    });
    if(result.ok){
      setWorkout(result.workout);
      setStep("result");
      if(isRegen){setRegenCount(bumpRegenCount(currentUser));}
    }else{
      setError(result.error);
      setStep("setup");
    }
  };

  const handlePlanWorkout=(targetDate)=>{
    if(!workout)return;
    saveActiveWorkout(currentUser, workout, muscleGroup||"fullbody", targetDate);
    showToast(targetDate==="tomorrow"
      ?"📋 Planned for tomorrow! It'll be waiting for you."
      :"🔥 Workout saved! Tap it on the Pack tab when you're ready.");
    onClose();
  };

  // ── Profile not set up ───────────────────────────────────────────────────
  if(!goal||!experience){
    return(
      <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div className="modal" style={{maxHeight:"85dvh",overflowY:"auto"}}>
          <div className="modal-handle"/>
          <div style={{textAlign:"center",padding:"10px 0 16px"}}>
            <div style={{fontSize:36,marginBottom:8}}>🔥</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,marginBottom:8}}>SET UP YOUR PROFILE FIRST</div>
            <div style={{fontSize:13,color:"var(--muted)",marginBottom:18,lineHeight:1.5,padding:"0 10px"}}>
              WOLFMODE needs your goal and experience level to train you right. Open your profile and fill in the 🤖 AI tab.
            </div>
            <button className="btn-primary" onClick={onClose} style={{maxWidth:240,margin:"0 auto"}}>OPEN MY PROFILE</button>
          </div>
        </div>
      </div>
    );
  }

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"92dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>

        {/* ── SETUP STEP ── */}
        {step==="setup"&&(
          <>
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
              <div style={{fontSize:26}}>🔥</div>
              <div style={{flex:1}}>
                <div style={{
                  fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,
                  background:"linear-gradient(90deg,#ff6b35,#c084fc)",
                  WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                  lineHeight:1,
                }}>WOLFMODE</div>
                <div style={{fontSize:10,color:"var(--muted)"}}>Goal: {goalLabel} · {experience}</div>
              </div>
            </div>

            {/* ── MUSCLE GROUP ── */}
            <div style={{marginBottom:14}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>🎯 MUSCLE GROUP</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:8}}>
                {AI_MUSCLE_GROUPS.map(mg=>{
                  const sel=muscleGroup===mg.id;
                  return(
                    <button key={mg.id} onClick={()=>{setMuscleGroup(mg.id);setAiMuscleReason("");}}
                      style={{
                        padding:"8px 4px",borderRadius:10,cursor:"pointer",textAlign:"center",
                        background:sel?"rgba(255,107,53,0.2)":"var(--bg3)",
                        border:sel?"1px solid rgba(255,107,53,0.6)":"1px solid var(--border)",
                      }}>
                      <div style={{fontSize:16,marginBottom:2}}>{mg.icon}</div>
                      <div style={{fontSize:9,color:sel?"#ff6b35":"var(--muted)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>{mg.label}</div>
                    </button>
                  );
                })}
              </div>
              <button onClick={handleAIPick} disabled={aiPickingMuscle}
                style={{
                  width:"100%",padding:"10px 12px",borderRadius:10,cursor:"pointer",
                  background:!muscleGroup?"rgba(124,92,191,0.2)":"var(--bg3)",
                  border:!muscleGroup?"1px solid var(--accent)":"1px solid var(--border)",
                  display:"flex",alignItems:"center",gap:8,
                }}>
                <span style={{fontSize:16}}>🤖</span>
                <div style={{textAlign:"left",flex:1}}>
                  <div style={{fontSize:12,color:!muscleGroup?"var(--accent2)":"var(--muted)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1.5}}>
                    {aiPickingMuscle?"ANALYZING YOUR HISTORY...":"AI PICK FOR ME"}
                  </div>
                  {aiMuscleReason&&<div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{aiMuscleReason}</div>}
                  {!muscleGroup&&!aiMuscleReason&&<div style={{fontSize:10,color:"var(--muted)"}}>Based on what you haven't trained recently</div>}
                </div>
                {!muscleGroup&&<div style={{fontSize:14,color:"var(--accent)"}}>✓</div>}
              </button>
            </div>

            {/* ── EQUIPMENT ── */}
            <div style={{marginBottom:14}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>🏠 WHERE ARE YOU TRAINING?</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
                {AI_EQUIPMENT_PRESETS.map(p=>{
                  const sel=selectedPreset===p.id;
                  return(
                    <button key={p.id} onClick={()=>{setSelectedPreset(p.id);setShowCustomEditor(false);}}
                      style={{
                        padding:"10px 8px",borderRadius:12,cursor:"pointer",
                        background:sel?"rgba(124,92,191,0.2)":"var(--bg3)",
                        border:sel?"1px solid var(--accent)":"1px solid var(--border)",
                        textAlign:"left",
                      }}>
                      <div style={{fontSize:18,marginBottom:2}}>{p.icon}</div>
                      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1.5,color:sel?"var(--accent2)":"#fff"}}>{p.label}</div>
                    </button>
                  );
                })}
              </div>
              {savedPresets.length>0&&savedPresets.map((sp,i)=>{
                const sel=selectedPreset===`saved_${i}`;
                return(
                  <button key={i} onClick={()=>{setSelectedPreset(`saved_${i}`);setCustomEquip(sp.equipment);setShowCustomEditor(false);}}
                    style={{
                      width:"100%",padding:"8px 12px",borderRadius:10,cursor:"pointer",textAlign:"left",marginBottom:6,
                      background:sel?"rgba(124,92,191,0.15)":"var(--bg3)",
                      border:sel?"1px solid var(--accent)":"1px solid var(--border)",
                    }}>
                    <div style={{fontSize:12,color:sel?"var(--accent2)":"#fff"}}>⚙️ {sp.name}</div>
                  </button>
                );
              })}
              <button onClick={()=>{setSelectedPreset("custom");setShowCustomEditor(true);}}
                style={{
                  width:"100%",padding:"8px 12px",borderRadius:10,cursor:"pointer",
                  background:selectedPreset==="custom"?"rgba(124,92,191,0.15)":"var(--bg3)",
                  border:selectedPreset==="custom"?"1px solid var(--accent)":"1px solid var(--border)",
                  textAlign:"left",color:selectedPreset==="custom"?"var(--accent2)":"var(--muted)",fontSize:12,
                }}>
                ⚙️ Custom equipment
              </button>
              {showCustomEditor&&(
                <textarea className="input" placeholder="Describe your equipment..." value={customEquip}
                  onChange={e=>setCustomEquip(e.target.value)} rows={2}
                  style={{padding:10,resize:"vertical",fontFamily:"inherit",fontSize:12,marginTop:6}}/>
              )}
            </div>

            {error&&<div style={{padding:10,marginBottom:10,background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:10,color:"var(--red)",fontSize:12}}>{error}</div>}

            <button className="btn-primary" disabled={selectedPreset==="custom"&&!customEquip.trim()} onClick={()=>generate(false)}
              style={{background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none"}}>
              🔥 GENERATE MY WORKOUT
            </button>
            <div style={{textAlign:"center",fontSize:10,color:"var(--muted)",marginTop:6}}>{MAX_DAILY_REGENS-regenCount} regens remaining today</div>
          </>
        )}

        {/* ── LOADING STEP ── */}
        {step==="loading"&&(
          <div style={{textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:48,marginBottom:14,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🔥</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:6,background:"linear-gradient(90deg,#ff6b35,#c084fc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>WOLFMODE ACTIVATED</div>
            <div style={{fontSize:12,color:"var(--muted)"}}>Building your {muscleGroup?AI_MUSCLE_GROUPS.find(m=>m.id===muscleGroup)?.label:"personalized"} workout...</div>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ── RESULT STEP ── */}
        {step==="result"&&workout&&(
          <>
            <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
              <div style={{fontSize:22}}>🔥</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:2,background:"linear-gradient(90deg,#ff6b35,#c084fc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.1}}>{workout.title}</div>
                <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>~{workout.estimatedMinutes} min · {workout.exercises?.length} exercises</div>
              </div>
            </div>
            {workout.reasoning&&(
              <div style={{padding:"10px 12px",marginBottom:12,background:"rgba(255,107,53,0.06)",border:"1px solid rgba(255,107,53,0.2)",borderRadius:10,fontSize:12,color:"rgba(255,255,255,0.8)",lineHeight:1.5,fontStyle:"italic"}}>
                💭 {workout.reasoning}
              </div>
            )}
            {workout.exercises.map((ex,i)=>(
              <ExerciseCard key={i} exercise={ex} userName={currentUser} experience={experience} injuries={injuries} idx={i}/>
            ))}
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button className="btn-primary" onClick={()=>handlePlanWorkout("today")}
                style={{flex:1,background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none"}}>
                🔥 TRAIN TODAY
              </button>
              <button className="btn-ghost" onClick={()=>generate(true)} disabled={regenCount>=MAX_DAILY_REGENS} style={{flex:"0 0 auto",padding:"0 14px"}}>
                🔄 ({MAX_DAILY_REGENS-regenCount})
              </button>
            </div>
            <button onClick={()=>handlePlanWorkout("tomorrow")}
              style={{
                width:"100%",marginTop:8,padding:"10px",
                background:"rgba(124,92,191,0.1)",
                border:"1px solid rgba(124,92,191,0.3)",
                borderRadius:12,cursor:"pointer",
                color:"var(--accent2)",fontSize:12,
                fontFamily:"'Bebas Neue',cursive",letterSpacing:2,
              }}>
              📋 PLAN FOR TOMORROW
            </button>
            <div style={{textAlign:"center",fontSize:10,color:"var(--muted)",marginTop:6}}>
              {regenCount>=MAX_DAILY_REGENS?"No more regens today.":`${MAX_DAILY_REGENS-regenCount} regens left today`}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── EFFORT RATING MODAL ──────────────────────────────────────────────────────
function EffortRatingModal({exercises, muscleGroup, currentUser, onRate, onClose}){
  const [selected,setSelected]=useState(null);
  const [showWeightLog,setShowWeightLog]=useState(false);
  const [saving,setSaving]=useState(false);

  const handleRate=async(effortId)=>{
    setSelected(effortId);
  };

  const handleSave=async()=>{
    if(!selected)return;
    setSaving(true);
    // Save effort rating to training log (no weights yet)
    await saveTrainingLog(currentUser, exercises.map(e=>({
      name:e.name,
      reps:e.reps,
      weightUsed:e.weight&&e.weight!=="bodyweight"?e.weight:null,
    })), selected);
    setSaving(false);
    onRate(selected);
  };

  if(showWeightLog){
    return(
      <WeightLogModal
        exercises={exercises}
        effortId={selected}
        currentUser={currentUser}
        onSave={async(loggedExercises)=>{
          setSaving(true);
          await saveTrainingLog(currentUser, loggedExercises, selected||"normal");
          setSaving(false);
          onRate(selected||"normal");
        }}
        onSkip={()=>setShowWeightLog(false)}
        onClose={onClose}
      />
    );
  }

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:1200}}>
      <div className="modal" style={{maxHeight:"80dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:28,marginBottom:6}}>🔥</div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3,background:"linear-gradient(90deg,#ff6b35,#c084fc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>HOW'D IT GO?</div>
          <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>WOLFMODE uses this to get smarter over time</div>
        </div>

        {/* Effort buttons */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {EFFORT_RATINGS.map(r=>{
            const sel=selected===r.id;
            return(
              <button key={r.id} onClick={()=>handleRate(r.id)} style={{
                padding:"14px 8px",borderRadius:14,cursor:"pointer",textAlign:"center",
                background:sel?`rgba(${r.color.replace("#","").match(/.{2}/g).map(h=>parseInt(h,16)).join(",")},0.2)`:"var(--bg3)",
                border:sel?`1px solid ${r.color}`:"1px solid var(--border)",
                transition:"all 0.15s",
              }}>
                <div style={{fontSize:28,marginBottom:4}}>{r.emoji}</div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1.5,color:sel?r.color:"#fff"}}>{r.label}</div>
                {sel&&<div style={{fontSize:9,color:"var(--muted)",marginTop:2}}>{r.advice}</div>}
              </button>
            );
          })}
        </div>

        <div style={{display:"flex",gap:8}}>
          <button className="btn-primary" onClick={handleSave} disabled={!selected||saving}
            style={{flex:1,background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none"}}>
            {saving?"SAVING...":"SAVE"}
          </button>
          <button className="btn-ghost" onClick={()=>{if(selected)setShowWeightLog(true);else onClose();}}
            style={{flex:"0 0 auto",padding:"0 14px",fontSize:11}}>
            📝 Log weights
          </button>
        </div>
        <button onClick={onClose} style={{
          width:"100%",marginTop:8,padding:8,background:"transparent",border:"none",
          color:"var(--muted)",fontSize:11,cursor:"pointer",
        }}>Skip — don't rate this one</button>
      </div>
    </div>
  );
}

// ── WEIGHT LOG MODAL ─────────────────────────────────────────────────────────
function WeightLogModal({exercises, effortId, currentUser, onSave, onSkip, onClose}){
  const [weights,setWeights]=useState(()=>{
    const init={};
    exercises.forEach(e=>{
      // Pre-fill with AI suggestion if available, strip "lbs" etc
      const w=e.weight&&e.weight!=="bodyweight"?e.weight.replace(/[^0-9.]/g,""):"";
      init[e.name]=w;
    });
    return init;
  });
  const [saving,setSaving]=useState(false);

  const save=async()=>{
    setSaving(true);
    const logged=exercises.map(e=>({
      name:e.name,
      reps:e.reps,
      weightUsed:weights[e.name]?`${weights[e.name]} lbs`:null,
    }));
    await onSave(logged);
  };

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:1300}}>
      <div className="modal" style={{maxHeight:"90dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3,marginBottom:4}}>LOG WEIGHTS</div>
        <div style={{fontSize:11,color:"var(--muted)",marginBottom:14}}>Optional — helps WOLFMODE suggest better weights next time. Pre-filled with AI's suggestion.</div>

        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {exercises.map((ex,i)=>(
            <div key={i} style={{
              padding:"10px 12px",background:"var(--bg3)",
              border:"1px solid var(--border)",borderRadius:12,
              display:"flex",alignItems:"center",gap:10,
            }}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1.5,color:"#fff",marginBottom:2}}>{ex.name}</div>
                <div style={{fontSize:10,color:"var(--muted)"}}>{ex.sets} sets × {ex.reps}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                <input
                  type="number"
                  value={weights[ex.name]||""}
                  onChange={e=>setWeights(p=>({...p,[ex.name]:e.target.value}))}
                  placeholder="—"
                  style={{
                    width:60,padding:"6px 8px",textAlign:"center",
                    background:"var(--bg2)",border:"1px solid var(--border)",
                    borderRadius:8,color:"#fff",fontSize:13,
                  }}
                />
                <span style={{fontSize:11,color:"var(--muted)"}}>lbs</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",gap:8}}>
          <button className="btn-primary" onClick={save} disabled={saving}
            style={{flex:1,background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none"}}>
            {saving?"SAVING...":"SAVE WEIGHTS"}
          </button>
          <button className="btn-ghost" onClick={onSkip} style={{flex:"0 0 auto",padding:"0 14px",fontSize:11}}>Skip</button>
        </div>
      </div>
    </div>
  );
}

// ── ACTIVE WORKOUT CARD ──────────────────────────────────────────────────────
// Shows on Pack tab — persists all day via localStorage, clears at midnight Central
function ActiveWorkoutCard({currentUser, targetDate, onComplete, onDismiss, userName, experience, injuries}){
  const data=getActiveWorkout(currentUser, targetDate);
  const [expanded,setExpanded]=useState(true);

  if(!data)return null;

  const {workout,muscleGroup,completed}=data;
  const isToday=targetDate==="today";
  const mgObj=AI_MUSCLE_GROUPS?.find(m=>m.id===muscleGroup);

  return(
    <div style={{
      margin:"0 16px 10px",
      background:isToday
        ?"linear-gradient(135deg, rgba(255,107,53,0.12), rgba(124,92,191,0.08))"
        :"rgba(124,92,191,0.06)",
      border:isToday?"1px solid rgba(255,107,53,0.35)":"1px solid rgba(124,92,191,0.25)",
      borderRadius:16,
      overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{
            fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,
            color:isToday?"#ff6b35":"var(--accent2)",marginBottom:2,
          }}>
            {isToday?"🔥 TODAY'S WORKOUT":"📋 TOMORROW'S PLAN"}
          </div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:1.5,color:"#fff",lineHeight:1.1}}>
            {workout.title}
          </div>
          <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>
            ~{workout.estimatedMinutes} min · {workout.exercises?.length} exercises
            {mgObj?` · ${mgObj.label}`:""}
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
          {completed&&(
            <span style={{
              padding:"3px 10px",borderRadius:20,fontSize:10,
              background:"rgba(46,204,113,0.15)",border:"1px solid var(--green)",
              color:"var(--green)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1,
            }}>✓ DONE</span>
          )}
          <button onClick={()=>setExpanded(e=>!e)} style={{
            background:"none",border:"none",cursor:"pointer",
            color:"var(--muted)",fontSize:18,padding:"0 4px",
            transition:"transform .2s",transform:expanded?"rotate(180deg)":"rotate(0)",
          }}>▾</button>
          <button onClick={()=>onDismiss(targetDate)} style={{
            background:"none",border:"none",cursor:"pointer",
            color:"var(--muted)",fontSize:20,padding:"0 4px",lineHeight:1,
          }}>×</button>
        </div>
      </div>

      {/* Exercise list */}
      {expanded&&(
        <div style={{padding:"0 14px 14px"}}>
          <div style={{
            padding:"8px 12px",marginBottom:10,
            background:"rgba(0,0,0,0.2)",borderRadius:10,
            fontSize:12,color:"rgba(255,255,255,0.7)",lineHeight:1.5,fontStyle:"italic",
          }}>
            💭 {workout.reasoning}
          </div>

          {workout.exercises?.map((ex,i)=>(
            <ExerciseCard
              key={i}
              exercise={ex}
              userName={userName}
              experience={experience}
              injuries={injuries}
              idx={i}
            />
          ))}

          {/* Mark complete button — only for today, only if not done */}
          {isToday&&!completed&&(
            <button className="btn-primary" onClick={()=>onComplete(data)}
              style={{
                width:"100%",marginTop:8,
                background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none",
              }}>
              ✓ MARK COMPLETE
            </button>
          )}
          {isToday&&completed&&(
            <div style={{
              textAlign:"center",padding:"10px",
              fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,
              color:"var(--green)",
            }}>
              ✓ CRUSHED IT TODAY 🐺
            </div>
          )}
          {!isToday&&(
            <div style={{
              textAlign:"center",padding:"8px",fontSize:11,color:"var(--muted)",
            }}>
              This becomes today's workout at midnight Central
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WorkoutModal({onClose,onSubmit,loading}){
  const [selected,setSelected]=useState([]);
  const [details,setDetails]=useState({}); // {workoutId: {sets,reps,weight,duration,distance,...}}
  const [note,setNote]=useState("");
  const [step,setStep]=useState("pick"); // "pick" | "details"

  const toggle=w=>setSelected(s=>s.find(x=>x.id===w.id)?s.filter(x=>x.id!==w.id):[...s,w]);
  const setField=(id,key,val)=>setDetails(d=>({...d,[id]:{...d[id],[key]:val}}));

  const handleSubmit=()=>{
    const summary=formatWorkoutSummary(selected,details);
    const totalDuration=selected.reduce((sum,w)=>sum+(Number(details[w.id]?.duration)||0),0)||null;
    onSubmit(selected,note,totalDuration,details,summary);
  };

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"85dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>

        {step==="pick"&&(
          <>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:6}}>LOG WORKOUT</div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:12}}>Select one or more workout types</div>
            <div className="workout-grid" style={{marginBottom:14}}>
              {WORKOUT_TYPES.map(w=>{
                const sel=!!selected.find(x=>x.id===w.id);
                return(
                  <button key={w.id} className={`workout-tile ${sel?"selected":""}`} onClick={()=>toggle(w)}>
                    <div style={{fontSize:24,marginBottom:4}}>{w.icon}</div>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1,color:sel?"var(--accent2)":"var(--muted)"}}>{w.label}</div>
                    {sel&&<div style={{position:"absolute",top:4,right:4,width:14,height:14,borderRadius:"50%",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff"}}>✓</div>}
                  </button>
                );
              })}
            </div>
            {selected.length>0&&(
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                {selected.map(w=><span key={w.id} style={{padding:"4px 10px",background:"rgba(124,92,191,0.2)",border:"1px solid rgba(124,92,191,0.4)",borderRadius:20,fontSize:12,color:"var(--accent2)"}}>{w.icon} {w.label}</span>)}
              </div>
            )}
            <button className="btn-primary" disabled={selected.length===0} onClick={()=>setStep("details")}>
              NEXT → ADD DETAILS
            </button>
          </>
        )}

        {step==="details"&&(
          <>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <button onClick={()=>setStep("pick")} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:20,lineHeight:1}}>←</button>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3}}>ADD DETAILS</div>
            </div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:14}}>All fields are optional — fill in what you tracked.</div>

            {selected.map(w=>{
              const fields=WORKOUT_FIELDS[w.id]||WORKOUT_FIELDS.other;
              return(
                <div key={w.id} style={{marginBottom:16,padding:"12px 14px",background:"var(--bg3)",borderRadius:14,border:"1px solid var(--border)"}}>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:2,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:20}}>{w.icon}</span>{w.label}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {fields.map(f=>(
                      <div key={f.key} style={{gridColumn:f.isSelect?"1/-1":"auto"}}>
                        <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>{f.label}</div>
                        {f.isSelect?(
                          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                            {f.options.map(opt=>(
                              <button key={opt} onClick={()=>setField(w.id,f.key,details[w.id]?.[f.key]===opt?"":opt)}
                                style={{padding:"6px 14px",borderRadius:20,cursor:"pointer",fontSize:12,
                                  background:details[w.id]?.[f.key]===opt?"rgba(124,92,191,0.25)":"var(--bg2)",
                                  border:details[w.id]?.[f.key]===opt?"1px solid var(--accent)":"1px solid var(--border)",
                                  color:details[w.id]?.[f.key]===opt?"var(--accent2)":"var(--muted)"}}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        ):(
                          <input className="input" type={f.text?"text":"number"} placeholder={f.placeholder}
                            value={details[w.id]?.[f.key]||""}
                            onChange={e=>setField(w.id,f.key,e.target.value)}
                            style={{padding:"10px 12px"}} min={f.text?undefined:0} step={f.text?undefined:"any"}/>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Note (optional)</div>
              <input className="input" placeholder="How it went, PRs, etc..." value={note} onChange={e=>setNote(e.target.value)} maxLength={120}/>
            </div>

            {/* Preview */}
            <div style={{padding:"10px 14px",background:"rgba(124,92,191,0.1)",border:"1px solid rgba(124,92,191,0.2)",borderRadius:10,marginBottom:12}}>
              {formatWorkoutSummary(selected,details).length===0
                ?<div style={{fontSize:13,color:"var(--muted)"}}>Fill in details above to see preview</div>
                :formatWorkoutSummary(selected,details).map((w,i)=>(
                  <div key={i} style={{fontSize:13,color:"var(--accent2)",lineHeight:1.6}}>
                    <span style={{fontWeight:600}}>{w.label}</span>{w.detail?`: ${w.detail}`:""}
                  </div>
                ))
              }
            </div>

            <button className="btn-primary" onClick={handleSubmit} disabled={loading}>{loading?"LOGGING...":"LOG IT 💪"}</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function App(){
  const [screen,setScreen]=useState("loading");
  const [members,setMembers]=useState([]);
  const [profiles,setProfiles]=useState({});
  const [currentUser,setCurrentUser]=useState(null);
  const [sharedData,setSharedData]=useState({});
  const [history,setHistory]=useState({});
  const [feed,setFeed]=useState([]);
  const [challenges,setChallenges]=useState([]);
  const [gymSlots,setGymSlots]=useState([]);
  const [adminName,setAdminName]=useState(null);
  const [view,setView]=useState("pack");
  const [workoutOpen,setWorkoutOpen]=useState(false);
  const [adminOpen,setAdminOpen]=useState(false);
  const [profileOpen,setProfileOpen]=useState(false);
  const [lastSeen,setLastSeen]=useState({feed:0,challenges:0,gym:0});
  const [packGoals,setPackGoals]=useState([]);
  const [garageEquipment,setGarageEquipment]=useState(HOME_GYM_DEFAULT);
  const [reactions,setReactions]=useState({});
  const [editWorkout,setEditWorkout]=useState(null);
  const [weeklyRecap,setWeeklyRecap]=useState(null);
  const [aiTrainerOpen,setAiTrainerOpen]=useState(false);
  const [nutritionOpen,setNutritionOpen]=useState(false);
  const [pendingEffortRating,setPendingEffortRating]=useState(null);
  const [activeWorkoutRefresh,setActiveWorkoutRefresh]=useState(0); // bump to re-render cards
  const [toast,setToast]=useState("");
  const unsubs=useRef([]);const tt=useRef(null);
  const showToast=useCallback(msg=>{setToast(msg);clearTimeout(tt.current);tt.current=setTimeout(()=>setToast(""),3000);},[]);

  useEffect(()=>{
    (async()=>{
      const md=await fsGet("wolfpack/members");const m=md?.list||[];setMembers(m);
      const u1=fsListen("wolfpack/workouts",d=>{if(d){setSharedData(d.byDate||{});setHistory(d.byDate||{});}});
      const u2=fsListen("wolfpack/profiles",d=>{if(d)setProfiles(d.users||{});});
      const u3=fsListen("wolfpack/feed",d=>{if(d)setFeed((d.posts||[]).sort((a,b)=>b.ts-a.ts));});
      const u4=fsListen("wolfpack/challenges",d=>{if(d)setChallenges(d.list||[]);});
      const u5=fsListen("wolfpack/gym",d=>{if(d)setGymSlots(d.slots||[]);});
      const u6=fsListen("wolfpack/packgoals",d=>{if(d)setPackGoals(d.list||[]);});
      const u8=fsListen("wolfpack/settings",d=>{if(d?.garageEquipment)setGarageEquipment(d.garageEquipment);});
      const u7=fsListen("wolfpack/reactions",d=>{if(d)setReactions(d.data||{});});
      unsubs.current=[u1,u2,u3,u4,u5,u6,u7];
      const ad=await fsGet("wolfpack/admin");if(ad?.name)setAdminName(ad.name);
      setScreen(m.length>0?"login":"onboard");
    })();
    return()=>unsubs.current.forEach(u=>u?.());
  },[]);

  useEffect(()=>{const u=onForegroundMessage(p=>{const{title,body}=p.notification||{};showToast(`${title||"WOLFPACK"}: ${body||""}`);});return()=>u?.();},[showToast]);

  const handleJoin=async(name,avatar,pin,avatarImg)=>{
    if(members.map(m=>m.toLowerCase()).includes(name.toLowerCase())){setCurrentUser(name);setScreen("main");return;}
    await fsSet(`wolfpack/pin_${name}`,{pin});
    const nm=[...members,name],profile={avatar:avatar||"🐺",...(avatarImg?{avatarImg}:{})};
    const np={...profiles,[name]:profile};
    if(members.length===0){await fsSet("wolfpack/admin",{name});setAdminName(name);}
    await fsSet("wolfpack/members",{list:nm});await fsSet("wolfpack/profiles",{users:np});
    setMembers(nm);setProfiles(np);setCurrentUser(name);setScreen("main");
    showToast(`Welcome to the pack, ${name}! 🐺`);
  };

  const handleLogin=(name,action)=>{
    if(action==="join"){setScreen("onboard");return;}
    setCurrentUser(name);
    setScreen("main");
    // Load lastSeen from profile
    fsGet("wolfpack/profiles").then(d=>{
      const seen=d?.users?.[name]?.lastSeen;
      if(seen) setLastSeen(seen);
    });
  };

  const handleResetPin=async m=>{await fsDelete(`wolfpack/pin_${m}`);showToast(`${m}'s PIN cleared. They can log in freely now.`);};

  const handleAdminBackfill=async(member,date,workouts)=>{
    const time="12:00 PM";
    const icons=workouts.map(w=>w.icon).join("");
    const labels=workouts.map(w=>w.label).join(" + ");
    const entry={done:true,workouts:workouts.map(w=>({id:w.id,icon:w.icon,label:w.label})),workoutIcon:icons,workoutLabel:labels,note:"(admin backfill)",time,ts:new Date(date+"T12:00:00").getTime()};
    const newHistory={...history,[date]:{...(history[date]||{}),[member]:entry}};
    await fsSet("wolfpack/workouts",{byDate:newHistory});
    // Update local state immediately so streak/recap reflect the change
    setHistory(newHistory);
    setSharedData(newHistory);

    // Also update acceptedAt for any active challenge this member is in
    // so their goal recalculates from challenge start
    const newChallenges=challenges.map(c=>{
      if(c.status!=="active")return c;
      if(!c.participants?.[member])return c;
      if(c.participants[member]?.status!=="accepted")return c;
      // If the backfill date is before their acceptedAt, push acceptedAt back
      const currentAccepted=c.participants[member]?.acceptedAt||c.startDate;
      if(date<currentAccepted){
        return{...c,participants:{...c.participants,[member]:{...c.participants[member],acceptedAt:c.startDate}}};
      }
      return c;
    });
    if(JSON.stringify(newChallenges)!==JSON.stringify(challenges)){
      await fsSet("wolfpack/challenges",{list:newChallenges});
    }
    showToast(`✓ Logged ${icons} for ${member} on ${date}`);
  };

  const handleDeleteAccount=async m=>{
    const nm=members.filter(x=>x!==m),np={...profiles};delete np[m];
    const nc=challenges.map(c=>{const p={...c.participants};delete p[m];return{...c,participants:p};});
    const ns=gymSlots.filter(s=>s.bookedBy!==m);
    await Promise.all([fsSet("wolfpack/members",{list:nm}),fsSet("wolfpack/profiles",{users:np}),fsSet("wolfpack/challenges",{list:nc}),fsSet("wolfpack/gym",{slots:ns}),fsDelete(`wolfpack/pin_${m}`)]);
    setMembers(nm);setProfiles(np);showToast(`${m} removed from the pack.`);
  };

  const handleAddPackGoal=async t=>{
    const goal={id:Date.now().toString(),author:currentUser,text:t,cheers:[],ts:Date.now(),date:todayStr()};
    await fsSet("wolfpack/packgoals",{list:[goal,...packGoals]});
  };
  const handleCheerGoal=async(id,user)=>{
    const nl=packGoals.map(g=>{if(g.id!==id)return g;const c=g.cheers||[];return{...g,cheers:c.includes(user)?c.filter(x=>x!==user):[...c,user]};});
    await fsSet("wolfpack/packgoals",{list:nl});
  };
  const handleDeletePackGoal=async id=>{
    await fsSet("wolfpack/packgoals",{list:packGoals.filter(g=>g.id!==id)});
  };
  const handleSaveBackfill=async updatedHistory=>{
    await fsSet("wolfpack/workouts",{byDate:updatedHistory});
  };

  // Reactions
  const handleReact=async(member,emoji)=>{
    const memberReactions=reactions[member]||{};
    const emojiList=memberReactions[emoji]||[];
    const updated={...reactions,[member]:{...memberReactions,[emoji]:emojiList.includes(currentUser)?emojiList.filter(x=>x!==currentUser):[...emojiList,currentUser]}};
    await fsSet("wolfpack/reactions",{data:updated});
  };

  // Edit workout
  const handleSaveEditedWorkout=async(date,entry)=>{
    const newHistory={...history,[date]:{...(history[date]||{}),[currentUser]:entry}};
    await fsSet("wolfpack/workouts",{byDate:newHistory});
    setHistory(newHistory);
    setSharedData(newHistory);
    setEditWorkout(null);showToast("Workout updated!");
  };
  const handleDeleteWorkout=async(date)=>{
    const newDay={...(history[date]||{})};
    delete newDay[currentUser];
    const newHistory={...history,[date]:newDay};
    await fsSet("wolfpack/workouts",{byDate:newHistory});
    // Force local state update immediately
    setHistory(newHistory);
    setSharedData(newHistory);
    setEditWorkout(null);
    showToast("Workout deleted.");
  };

  // Weekly recap — compute on Monday
  useEffect(()=>{
    if(!currentUser||members.length===0)return;
    const today=new Date();
    if(today.getDay()!==1)return; // only on Monday
    const lastWeekStart=new Date(today);lastWeekStart.setDate(today.getDate()-7);
    const lastWeekEnd=new Date(today);lastWeekEnd.setDate(today.getDate()-1);
    const days=getDateRange(localDateStr(lastWeekStart),localDateStr(lastWeekEnd));
    const stats=members.map(m=>({name:m,days:days.filter(d=>history[d]?.[m]?.done).length})).sort((a,b)=>b.days-a.days);
    setWeeklyRecap({stats,week:localDateStr(lastWeekStart),dismissed:false});
  },[currentUser,members,history]);

  // Milestone auto-posts — check after logging
  const checkMilestones=async(newHistory)=>{
    const streak=getStreak(newHistory,currentUser,profiles[currentUser]);
    const sessions=getTotalWorkouts(newHistory,currentUser);
    const streakMilestone=MILESTONES.find(m=>streak===m);
    const sessionMilestone=SESSION_MILESTONES.find(m=>sessions===m);
    const posts=[];
    if(streakMilestone) posts.push({id:Date.now().toString(),author:currentUser,text:`🔥 ${currentUser} just hit a ${streakMilestone}-day streak! The wolf is on fire! 🐺`,ts:Date.now(),likes:[],isAuto:true});
    if(sessionMilestone) posts.push({id:(Date.now()+1).toString(),author:currentUser,text:`💪 ${currentUser} just logged their ${sessionMilestone}th workout session! Beast mode! 🏋️`,ts:Date.now()+1,likes:[],isAuto:true});
    if(posts.length>0) await fsSet("wolfpack/feed",{posts:[...posts,...feed]});
  };
  const handleSaveWeight=async wl=>{
    const np={...profiles,[currentUser]:{...profiles[currentUser],weightLog:wl}};
    await fsSet("wolfpack/profiles",{users:np});setProfiles(np);
  };
  const handleSaveGoal=async(goal,share)=>{
    const np={...profiles,[currentUser]:{...profiles[currentUser],personalGoal:goal,goalDate:todayStr(),shareGoal:typeof share==="boolean"?share:(profiles[currentUser]?.shareGoal||false)}};
    await fsSet("wolfpack/profiles",{users:np});setProfiles(np);
  };
  const handleChangePin=async newPin=>{
    await fsSet(`wolfpack/pin_${currentUser}`,{pin:newPin});
  };
  const handleChangeName=async(newName,setErr,setDone)=>{
    if(!newName.trim()){setErr("Name can't be empty");return;}
    if(newName.trim()===currentUser){return;}
    // Check name not taken
    if(members.map(m=>m.toLowerCase()).includes(newName.trim().toLowerCase())&&newName.trim().toLowerCase()!==currentUser.toLowerCase()){
      setErr("That name is already taken");return;
    }
    const oldName=currentUser;
    const nm=members.map(m=>m===oldName?newName.trim():m);
    // Update profile
    const np={...profiles,[newName.trim()]:{...profiles[oldName]}};
    delete np[oldName];
    // Update workout history keys
    const newHistory={};
    Object.entries(history).forEach(([date,dayData])=>{
      const newDay={...dayData};
      if(newDay[oldName]){newDay[newName.trim()]=newDay[oldName];delete newDay[oldName];}
      newHistory[date]=newDay;
    });
    // Update challenges
    const newChallenges=challenges.map(c=>{
      const newParts={};
      Object.entries(c.participants||{}).forEach(([m,v])=>{newParts[m===oldName?newName.trim():m]=v;});
      return{...c,participants:newParts,createdBy:c.createdBy===oldName?newName.trim():c.createdBy};
    });
    // Update feed
    const newFeed=feed.map(p=>({...p,author:p.author===oldName?newName.trim():p.author,comments:(p.comments||[]).map(c=>({...c,author:c.author===oldName?newName.trim():c.author}))}));
    // Update gym slots
    const newSlots=gymSlots.map(s=>({...s,bookedBy:s.bookedBy===oldName?newName.trim():s.bookedBy}));
    // Update PIN
    const pinData=await fsGet(`wolfpack/pin_${oldName}`);
    await Promise.all([
      fsSet("wolfpack/members",{list:nm}),
      fsSet("wolfpack/profiles",{users:np}),
      fsSet("wolfpack/workouts",{byDate:newHistory}),
      fsSet("wolfpack/challenges",{list:newChallenges}),
      fsSet("wolfpack/feed",{posts:newFeed}),
      fsSet("wolfpack/gym",{slots:newSlots}),
      ...(pinData?[fsSet(`wolfpack/pin_${newName.trim()}`,pinData),fsDelete(`wolfpack/pin_${oldName}`)]:[]),
    ]);
    // Update admin if needed
    if(adminName===oldName){await fsSet("wolfpack/admin",{name:newName.trim()});setAdminName(newName.trim());}
    setMembers(nm);setProfiles(np);setCurrentUser(newName.trim());
    setDone(true);
    showToast(`Name updated to ${newName.trim()}!`);
  };

  const [loggingWorkout,setLoggingWorkout]=useState(false);
  const handleLogWorkout=async(workouts,note,duration,details,summary)=>{
    if(loggingWorkout)return; // prevent double-tap
    setLoggingWorkout(true);
    const key=todayStr(),time=new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
    // Support multiple workout types - merge with existing entries for today
    const existing=history[key]?.[currentUser]||{};
    const prevWorkouts=existing.workouts||[];
    const prevDetails=existing.details||{};
    const newWorkouts=[...prevWorkouts,...workouts.map(w=>({id:w.id,icon:w.icon,label:w.label}))];
    // Merge details preserving existing ones
    const mergedDetails={...prevDetails,...(details||{})};
    const icons=newWorkouts.map(w=>w.icon).join("");
    const labels=newWorkouts.map(w=>w.label).join(" + ");
    // Build summary using MERGED details so previous workout details are preserved
    const summaryLines=newWorkouts.map(w=>{
      const d=mergedDetails?.[w.id]||{};
      const parts=[];
      if(d.focus) parts.push(d.focus);
      if(d.distance) parts.push(`${d.distance} mi`);
      if(d.rounds) parts.push(`${d.rounds} rounds`);
      if(d.sets&&d.reps) parts.push(`${d.sets} sets x ${d.reps} reps`);
      else if(d.sets) parts.push(`${d.sets} sets`);
      else if(d.reps) parts.push(`${d.reps} reps`);
      if(d.weight) parts.push(`${d.weight} lbs`);
      if(d.duration) parts.push(`${d.duration} min`);
      return parts.length>0?`${w.label}: ${parts.join(" · ")}`:w.label;
    });
    const totalDur=newWorkouts.reduce((s,w)=>s+(Number(mergedDetails?.[w.id]?.duration)||0),0)||null;
    const entry={done:true,workouts:newWorkouts,workoutIcon:icons,workoutLabel:summaryLines.join(" | "),summary:summaryLines,note,duration:totalDur,details:mergedDetails,time,ts:Date.now()};
    const newData={...history,[key]:{...(history[key]||{}),[currentUser]:entry}};
    await fsSet("wolfpack/workouts",{byDate:newData});
    setLoggingWorkout(false);setWorkoutOpen(false);launchConfetti();showToast(`${icons} Logged! Keep grinding! 🐺`);
    await checkMilestones(newData);
  };

  // ── AI Trainer: log the AI-generated workout as a lift entry ──────────────
  const handleLogAIWorkout=async({summary,note,minutes,exercises,muscleGroup})=>{
    if(loggingWorkout)return;
    setLoggingWorkout(true);
    const key=todayStr(),time=new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
    const existing=history[key]?.[currentUser]||{};
    const prevWorkouts=existing.workouts||[];
    const prevDetails=existing.details||{};
    const aiLift={id:"lift",icon:"🏋️",label:"Lifting"};
    const newWorkouts=[...prevWorkouts,aiLift];
    const newDetails={...prevDetails,lift:{...(prevDetails.lift||{}),duration:String(minutes||45),focus:muscleGroup||"Full Body"}};
    const icons=newWorkouts.map(w=>w.icon).join("");
    const summaryLines=newWorkouts.map(w=>{
      if(w.id==="lift"&&w===aiLift) return `WOLFMODE: ${summary}`;
      const d=newDetails?.[w.id]||{};
      const parts=[];
      if(d.focus) parts.push(d.focus);
      if(d.duration) parts.push(`${d.duration} min`);
      return parts.length>0?`${w.label}: ${parts.join(" · ")}`:w.label;
    });
    // Store structured wolfmode session data for AI learning
    const wolfmodeSession={
      title:note?.replace("WOLFMODE: ",""),
      muscleGroup:muscleGroup||"fullbody",
      generatedAt:Date.now(),
      exercises:(exercises||[]).map(e=>({
        name:e.name,
        sets:e.sets,
        reps:e.reps,
        suggestedWeight:e.weight,
        weightUsed:null, // filled in optionally later
        effortRating:null, // filled in by effort check-in
      })),
    };
    const entry={done:true,workouts:newWorkouts,workoutIcon:icons,workoutLabel:summaryLines.join(" | "),summary:summaryLines,note:note||"",duration:minutes||null,details:newDetails,time,ts:Date.now(),wolfmodeSession};
    const newData={...history,[key]:{...(history[key]||{}),[currentUser]:entry}};
    await fsSet("wolfpack/workouts",{byDate:newData});
    setLoggingWorkout(false);
    launchConfetti();
    showToast(`🔥 WOLFMODE logged! 🐺`);
    await checkMilestones(newData);
  };

  const handlePost=async(t,photo)=>{
    const post={id:Date.now().toString(),author:currentUser,text:t,ts:Date.now(),likes:[],...(photo?{photo}:{})};
    await fsSet("wolfpack/feed",{posts:[post,...feed]});showToast("Posted! 🐺");
  };
  const handleLike=async id=>{await fsSet("wolfpack/feed",{posts:feed.map(p=>{if(p.id!==id)return p;const l=p.likes||[];return{...p,likes:l.includes(currentUser)?l.filter(x=>x!==currentUser):[...l,currentUser]};})});};
  const handleDelPost=async id=>{await fsSet("wolfpack/feed",{posts:feed.filter(p=>p.id!==id)});};
  const handleComment=async(postId,text)=>{
    const comment={author:currentUser,text,ts:Date.now()};
    const newFeed=feed.map(p=>{
      if(p.id!==postId)return p;
      return{...p,comments:[...(p.comments||[]),comment]};
    });
    await fsSet("wolfpack/feed",{posts:newFeed});
  };
  const handleDeleteComment=async(postId,idx)=>{
    const newFeed=feed.map(p=>{
      if(p.id!==postId)return p;
      const comments=[...(p.comments||[])];
      comments.splice(idx,1);
      return{...p,comments};
    });
    await fsSet("wolfpack/feed",{posts:newFeed});
  };
  const handleBookGym=async(date,slot,durationMins,displayTime)=>{
    // Check for conflicts
    const daySlots=gymSlots.filter(s=>s.date===date);
    const conflict=daySlots.find(s=>s.bookedBy!==currentUser&&slotOverlaps(slot.h,slot.m,s));
    if(conflict){showToast("That time overlaps with an existing booking!");return;}
    const myConflict=daySlots.find(s=>s.bookedBy===currentUser&&slotOverlaps(slot.h,slot.m,s));
    if(myConflict){showToast("You already have a booking that overlaps!");return;}
    const booking={id:Date.now().toString(),date,time:slot.label,displayTime,startH:slot.h,startM:slot.m,durationMins,bookedBy:currentUser,createdAt:Date.now()};
    await fsSet("wolfpack/gym",{slots:[...gymSlots,booking]});
    showToast(`Gym booked: ${displayTime}! 💪`);
  };
  const handleCancelGym=async id=>{await fsSet("wolfpack/gym",{slots:gymSlots.filter(s=>s.id!==id)});showToast("Cancelled.");};
  const handleAddChallenge=async c=>{await fsSet("wolfpack/challenges",{list:[c,...challenges]});showToast("Challenge created! ⚔️");};
  const handleLogProgress=async(cid,member,progress,done)=>{
    const nl=challenges.map(c=>{
      if(c.id!==cid)return c;
      const u={...c,participants:{...c.participants,[member]:{progress,done}}};
      if(Object.values(u.participants).every(p=>p.done)){u.status="completed";launchConfetti();showToast("🏆 Challenge complete!");}
      return u;
    });
    await fsSet("wolfpack/challenges",{list:nl});
    if(done)showToast("✓ You completed your part! 🎉");else showToast("Progress logged!");
  };
  const handleDelChallenge=async id=>{await fsSet("wolfpack/challenges",{list:challenges.filter(c=>c.id!==id)});showToast("Challenge removed.");};
  const handleEditChallenge=async u=>{await fsSet("wolfpack/challenges",{list:challenges.map(c=>c.id===u.id?u:c)});showToast("Challenge updated!");};
  const handleAcceptChallenge=async(challengeId,member)=>{
    const newList=challenges.map(c=>{
      if(c.id!==challengeId)return c;
      return{...c,participants:{...c.participants,[member]:{
        ...c.participants[member],
        status:"accepted",
        acceptedAt:todayStr(), // track when they joined for penalty purposes
      }}};
    });
    await fsSet("wolfpack/challenges",{list:newList});
    showToast("Challenge accepted! Rest days are now locked. ⚔️");
  };
  const handleDeclineChallenge=async(challengeId,member)=>{
    const newList=challenges.map(c=>{
      if(c.id!==challengeId)return c;
      const np={...c.participants};
      delete np[member];
      return{...c,participants:np};
    });
    await fsSet("wolfpack/challenges",{list:newList});
    showToast("Challenge declined.");
  };
  const handleMarkPaid=async(challengeId,member,amount,method)=>{
    const payment={amount,method,date:todayStr(),ts:Date.now()};
    const newList=challenges.map(c=>{
      if(c.id!==challengeId)return c;
      const existingPayments=c.payments?.[member]||[];
      return{...c,payments:{...c.payments,[member]:[...existingPayments,payment]}};
    });
    await fsSet("wolfpack/challenges",{list:newList});
    showToast(`✓ $${amount} ${method} payment recorded for ${member}`);
  };
  const handleLogPayment=async(challengeId,member,amount,method)=>{
    await handleMarkPaid(challengeId,member,amount,method);
  };

  const handleForfeit=async(challengeId,member)=>{
    const newList=challenges.map(c=>{
      if(c.id!==challengeId)return c;
      return{...c,participants:{...c.participants,[member]:{...c.participants[member],forfeited:true,forfeitedAt:Date.now()}}};
    });
    await fsSet("wolfpack/challenges",{list:newList});
    showToast(`🏳️ Forfeited. You owe $${challenges.find(c=>c.id===challengeId)?.forfeitCap||0}.`);
  };

  // ── DOT CONDITIONS ────────────────────────────────────────────────────────
  // Feed dot: any post newer than lastSeen.feed not by currentUser
  const hasFeedDot = feed.some(p => {
    // New post by someone else
    if(p.author !== currentUser && p.ts > lastSeen.feed) return true;
    // New comment on any post by someone else
    if((p.comments||[]).some(c => c.author !== currentUser && c.ts > lastSeen.feed)) return true;
    return false;
  });

  // Challenges dot: any pending invite
  const hasChallengeDot = challenges.some(c =>
    c.status === "active" && c.participants?.[currentUser]?.status === "pending"
  );

  // Gym dot: any new booking on a day you're also booked, newer than lastSeen.gym
  const hasGymDot = (() => {
    const myDates = new Set(gymSlots.filter(s => s.bookedBy === currentUser).map(s => s.date));
    return gymSlots.some(s =>
      s.bookedBy !== currentUser &&
      myDates.has(s.date) &&
      s.createdAt > lastSeen.gym
    );
  })();

  if(screen==="loading")return<div className="loading-screen"><div className="loading-wolf">🐺</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:32,letterSpacing:6,background:"linear-gradient(135deg,#fff,#9b7de0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>WOLFPACK</div><div style={{color:"var(--muted)",fontSize:13}}>Loading the pack...</div></div>;
  if(screen==="onboard")return<Onboarding onJoin={handleJoin}/>;
  if(screen==="login")return<Login members={members} profiles={profiles} onLogin={handleLogin} adminName={adminName}/>;

  return(
    <div className="app">
      <canvas id="confetti-canvas"/>
      <Toast msg={toast}/>
      <div className="header">
        <div><div className="header-title">WOLFPACK</div><div style={{fontSize:11,color:"var(--muted)",letterSpacing:1}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {currentUser===adminName&&(
            <button onClick={()=>setAdminOpen(true)} style={{background:"none",border:"1px solid var(--border)",borderRadius:10,padding:"6px 8px",cursor:"pointer",color:"var(--muted)",fontSize:16,lineHeight:1}}>⚙️</button>
          )}
          <div style={{textAlign:"right",marginRight:4}}><div style={{fontSize:11,color:"var(--muted)"}}>welcome back</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:2,color:"var(--accent2)"}}>{currentUser}</div></div>
          <div onClick={()=>setProfileOpen(true)} style={{cursor:"pointer"}}><AvatarDisplay profile={profiles[currentUser]} size={40}/></div>
        </div>
      </div>
      <div className="scroll">
        {view==="pack"&&(
          <>
            {/* Active workout cards — show above everything when present */}
            <ActiveWorkoutCard
              key={`today-${activeWorkoutRefresh}`}
              currentUser={currentUser}
              targetDate="today"
              userName={currentUser}
              experience={profiles[currentUser]?.aiTrainer?.experience}
              injuries={(profiles[currentUser]?.aiTrainer?.injuries||[]).join(", ")}
              onComplete={(data)=>{
                markActiveWorkoutComplete(currentUser,"today");
                setActiveWorkoutRefresh(r=>r+1);
                // Log the workout
                handleLogAIWorkout({
                  summary:data.workout.exercises.map(e=>`${e.name}: ${e.sets}×${e.reps}${e.weight&&e.weight!=="bodyweight"?` @ ${e.weight}`:""}`).join(" + "),
                  note:`WOLFMODE: ${data.workout.title}`,
                  minutes:data.workout.estimatedMinutes,
                  exercises:data.workout.exercises,
                  muscleGroup:data.muscleGroup,
                });
                // Show effort rating after completing
                setPendingEffortRating({exercises:data.workout.exercises,muscleGroup:data.muscleGroup});
              }}
              onDismiss={(targetDate)=>{
                dismissActiveWorkout(currentUser,targetDate);
                setActiveWorkoutRefresh(r=>r+1);
              }}
            />
            <ActiveWorkoutCard
              key={`tomorrow-${activeWorkoutRefresh}`}
              currentUser={currentUser}
              targetDate="tomorrow"
              userName={currentUser}
              experience={profiles[currentUser]?.aiTrainer?.experience}
              injuries={(profiles[currentUser]?.aiTrainer?.injuries||[]).join(", ")}
              onComplete={()=>{}}
              onDismiss={(targetDate)=>{
                dismissActiveWorkout(currentUser,targetDate);
                setActiveWorkoutRefresh(r=>r+1);
              }}
            />
            <PackTab currentUser={currentUser} members={members} profiles={profiles} history={history} sharedData={sharedData} onLogWorkout={()=>setWorkoutOpen(true)} onOpenAITrainer={()=>setAiTrainerOpen(true)} onOpenNutrition={()=>setNutritionOpen(true)} onEditWorkout={()=>setEditWorkout({date:todayStr(),entry:sharedData[todayStr()]?.[currentUser]||{}})} adminName={adminName} onOpenAdmin={()=>setAdminOpen(true)} packGoals={packGoals} onAddGoal={handleAddPackGoal} onCheer={handleCheerGoal} onDeleteGoal={handleDeletePackGoal} onOpenProfile={()=>setProfileOpen(true)} reactions={reactions} onReact={handleReact} weeklyRecap={weeklyRecap} onDismissRecap={()=>setWeeklyRecap(r=>r?{...r,dismissed:true}:null)}/>
          </>
        )}
        {view==="feed"&&<FeedTab currentUser={currentUser} profiles={profiles} feed={feed} onPost={handlePost} onLike={handleLike} onDelete={handleDelPost} onComment={handleComment} onDeleteComment={handleDeleteComment}/>}
        {view==="gym"&&<GymTab currentUser={currentUser} gymSlots={gymSlots} onBook={handleBookGym} onCancel={handleCancelGym}/>}
        {view==="challenges"&&<ChallengesTab currentUser={currentUser} adminName={adminName} members={members} profiles={profiles} challenges={challenges} history={history} onAdd={handleAddChallenge} onLogProgress={handleLogProgress} onDelete={handleDelChallenge} onEditChallenge={handleEditChallenge} onForfeit={handleForfeit} onAccept={handleAcceptChallenge} onDecline={handleDeclineChallenge} onOpenProfile={()=>setProfileOpen(true)} onMarkPaid={handleMarkPaid} onLogPayment={handleLogPayment}/>}
        {view==="stats"&&<StatsTab currentUser={currentUser} members={members} profiles={profiles} history={history} challenges={challenges} feed={feed}/>}
      </div>
      <nav className="nav">
        {NAV.map(n=>{
          const hasDot=n.id==="feed"?hasFeedDot:n.id==="challenges"?hasChallengeDot:n.id==="gym"?hasGymDot:false;
          return(
            <button key={n.id} className={`nav-btn ${view===n.id?"active":""}`}
              onClick={()=>{
                const now=Date.now();
                setView(n.id);
                setLastSeen(p=>{
                  const updated={...p,[n.id]:now};
                  // Persist to Firebase
                  if(currentUser){
                    fsGet("wolfpack/profiles").then(d=>{
                      if(d?.users?.[currentUser]){
                        fsSet("wolfpack/profiles",{users:{...d.users,[currentUser]:{...d.users[currentUser],lastSeen:updated}}});
                      }
                    });
                  }
                  return updated;
                });
              }}
              style={{position:"relative"}}>
              <span className="icon" style={{position:"relative",display:"inline-block"}}>
                {n.icon}
                {hasDot&&view!==n.id&&(
                  <span style={{position:"absolute",top:-2,right:-4,width:8,height:8,borderRadius:"50%",background:"var(--red)",border:"2px solid var(--bg)"}}/>
                )}
              </span>
              <span>{n.label}</span>
            </button>
          );
        })}
      </nav>
      {workoutOpen&&<WorkoutModal onClose={()=>setWorkoutOpen(false)} onSubmit={handleLogWorkout} loading={loggingWorkout}/>}
      {aiTrainerOpen&&<AITrainerModal currentUser={currentUser} profile={profiles[currentUser]} history={history} packHomeGym={garageEquipment} onClose={()=>{setAiTrainerOpen(false);if(!profiles[currentUser]?.aiTrainer?.goal||!profiles[currentUser]?.aiTrainer?.experience){setProfileOpen(true);}}} onUseWorkout={()=>{setActiveWorkoutRefresh(r=>r+1);}} showToast={showToast}/>}
      {nutritionOpen&&<CoachPlanModal currentUser={currentUser} profile={profiles[currentUser]} coach={profiles[currentUser]?.aiTrainer?.coach||{}} onPlanGenerated={async(plan)=>{const p=profiles[currentUser];const updated={...p,aiTrainer:{...(p?.aiTrainer||{}),coach:{...(p?.aiTrainer?.coach||{}),lastPlan:{...plan,generatedAt:Date.now()}}}};await fsSet("wolfpack/profiles",{users:{...profiles,[currentUser]:updated}});}} onClose={()=>setNutritionOpen(false)}/>}
      {pendingEffortRating&&<EffortRatingModal exercises={pendingEffortRating.exercises} muscleGroup={pendingEffortRating.muscleGroup} currentUser={currentUser} onRate={(effortId)=>{setPendingEffortRating(null);showToast(`${EFFORT_RATINGS.find(r=>r.id===effortId)?.emoji} Got it — WOLFMODE will adjust next time!`);}} onClose={()=>setPendingEffortRating(null)}/>}
      {editWorkout&&editWorkout.entry?.done&&<EditWorkoutModal entry={editWorkout.entry} date={editWorkout.date} currentUser={currentUser} onClose={()=>setEditWorkout(null)} onSave={handleSaveEditedWorkout} onDelete={()=>handleDeleteWorkout(editWorkout.date)}/>}
      {profileOpen&&<ProfileModal currentUser={currentUser} profile={profiles[currentUser]} profiles={profiles} history={history} challenges={challenges} onClose={()=>setProfileOpen(false)} onSaveWeight={handleSaveWeight} onSaveGoal={handleSaveGoal} onChangePin={handleChangePin} onChangeName={handleChangeName} onSaveProfile={np=>setProfiles(np)} onSaveBackfill={handleSaveBackfill}/>}
      {adminOpen&&<AdminPanel members={members} profiles={profiles} currentUser={currentUser} adminName={adminName} onResetPin={handleResetPin} onDeleteAccount={handleDeleteAccount} onAdminBackfill={handleAdminBackfill} onClose={()=>setAdminOpen(false)} garageEquipment={garageEquipment} onSaveGarageEquipment={async(list)=>{await fsSet("wolfpack/settings",{garageEquipment:list});setGarageEquipment(list);showToast("🏠 Garage gym updated!");}}/>}
    </div>
  );
}
