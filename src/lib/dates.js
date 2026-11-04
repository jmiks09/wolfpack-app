export const todayStr=()=>{
  const d=new Date();
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};

// Use local date string for any Date object (avoids UTC timezone shift)
export const localDateStr=d=>{const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,"0");const day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`;};

export const isWeekend=d=>{const x=new Date(d+"T00:00:00");return x.getDay()===0||x.getDay()===6;};

export const DAY_NAMES=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// A person's chosen rest days (default Sat/Sun), capped by any challenge they were in on date d.
// profile.restRules = { key: { limit, start, end, name, emoji } } — written by App from habit challenges.
export const restLimitOn=(profile,d)=>{
  let limit=null;
  for(const r of Object.values(profile?.restRules||{})){
    if(!r||r.limit==null||!(r.start<=d&&d<=r.end))continue;
    limit=limit==null?r.limit:Math.min(limit,r.limit);
  }
  return limit;
};
// Steps that make a day count as a workout day (streaks, "this week", calendars):
// the step count set by a challenge the person is in on that date (the highest, if
// several), otherwise 10,000.
export const DEFAULT_STEP_DAY=10000;
export const stepDayOn=(profile,d)=>{
  let n=null;
  for(const r of Object.values(profile?.restRules||{})){
    if(!r||!(Number(r.steps)>0)||!(r.start<=d&&d<=r.end))continue;
    n=n==null?Number(r.steps):Math.max(n,Number(r.steps));
  }
  return n??DEFAULT_STEP_DAY;
};
// A workout was logged, or enough steps were.
export const isActiveDay=(entry,profile,d)=>!!entry?.done||(Number(entry?.steps)||0)>=stepDayOn(profile,d);
export const isStepDay=(entry,profile,d)=>!entry?.done&&(Number(entry?.steps)||0)>=stepDayOn(profile,d);
export const activeRestRules=(profile,d)=>Object.values(profile?.restRules||{}).filter(r=>r&&r.limit!=null&&r.start<=d&&d<=r.end);
export const getRestDays=(profile,d)=>{
  const chosen=[...(profile?.restDays||[0,6])].sort((a,b)=>a-b);
  const limit=d?restLimitOn(profile,d):null;
  return limit==null?chosen:chosen.slice(0,limit);
};

export const isRestDay=(d,profile)=>{const x=new Date(d+"T00:00:00");return getRestDays(profile,d).includes(x.getDay());};

export const next7Days=()=>Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return localDateStr(d);});

export const fmtDate=d=>new Date(d+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});

export const fmtTime=ts=>{
  const d=new Date(ts);
  const now=new Date();
  const isToday=d.toDateString()===now.toDateString();
  const yesterday=new Date(now);yesterday.setDate(now.getDate()-1);
  const isYesterday=d.toDateString()===yesterday.toDateString();
  const time=d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  if(isToday)return `Today ${time}`;
  if(isYesterday)return `Yesterday ${time}`;
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" "+time;
};

export const getWeekStart=d=>{const x=new Date(d+"T00:00:00");x.setDate(x.getDate()-x.getDay());return localDateStr(x);};

export const getDateRange=(s,e)=>{const dates=[];const sd=new Date(s+"T00:00:00"),ed=new Date(e+"T00:00:00");for(let d=new Date(sd);d<=ed;d.setDate(d.getDate()+1))dates.push(localDateStr(d));return dates;};

export const getWeekdays=(s,e)=>getDateRange(s,e).filter(d=>!isWeekend(d));

// Get workout days for a member based on their personal rest days
export const getWorkoutDays=(s,e,profile)=>getDateRange(s,e).filter(d=>!isRestDay(d,profile));

// ── ACTIVE WORKOUT HELPERS (localStorage, Central time) ─────────────────────
// Central time date string (CDT = UTC-5)
export function centralDateStr(offsetDays=0){
  const now=new Date();
  const central=new Date(now.getTime()+(-5*60*60*1000));
  if(offsetDays){central.setDate(central.getDate()+offsetDays);}
  return central.toISOString().slice(0,10);
}
