import { QUOTES } from "./constants";
import { getDateRange, getWeekStart, getWorkoutDays, isRestDay, localDateStr, todayStr } from "./dates";

export function getStreak(h,n,profile){
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

export function getTotalWorkouts(h,n){
  // Count total sessions — each workout type logged counts as 1 session
  return Object.values(h).reduce((sum,d)=>{
    if(!d?.[n]?.done)return sum;
    const sessions=d[n]?.workouts?.length||1; // multi-type = multiple sessions
    return sum+sessions;
  },0);
}

export function getQuote(){
  // Rotate by day of year so it changes daily and uses the full quote list
  const now=new Date();
  const start=new Date(now.getFullYear(),0,0);
  const diff=now-start;
  const oneDay=1000*60*60*24;
  const dayOfYear=Math.floor(diff/oneDay);
  return QUOTES[dayOfYear%QUOTES.length];
}

export function calcPenalties(c,h,profiles){
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

export function computeBadges(n,h,feed,ch,profile){const e=[];const t=getTotalWorkouts(h,n),s=getStreak(h,n,profile),p=feed.filter(x=>x.author===n).length;const cc=ch.filter(c=>c.participants?.[n]?.done||(c.goalType==="dateRange"&&c.startDate&&c.endDate&&getWorkoutDays(c.startDate,c.endDate,profile).filter(d=>h[d]?.[n]?.done).length>=c.goal)).length;if(t>=1)e.push("first_blood");if(s>=5)e.push("week_warrior");if(s>=15)e.push("consistent");if(s>=20)e.push("monthly");if(t>=100)e.push("centurion");if(p>=10)e.push("social");if(cc>=1)e.push("challenger");return e;}
