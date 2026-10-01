import { useState } from "react";
import { addDays, challengeWeeks, dailyHit, editableFrom, proteinTarget, scoreHabitWeek, workoutKinds } from "../../../lib/habits";

const bebas = {fontFamily:"'Bebas Neue',cursive",letterSpacing:2};
const dayLabel = (d,today) => d===today?"Today":d===addDays(today,-1)?"Yesterday":new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});

function NumberField({value,onSave,placeholder,unit,label}){
  const [v,setV]=useState(value??"");
  const [prev,setPrev]=useState(value);
  if(prev!==value){setPrev(value);setV(value??"");}
  const commit=()=>{const n=v===""?null:Number(v);if(n!==(value??null))onSave(n);};
  return(
    <div style={{display:"flex",alignItems:"center",gap:4}}>
      <input className="input" type="number" inputMode="numeric" value={v} placeholder={placeholder} aria-label={label}
        onChange={e=>setV(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();}}
        style={{width:76,padding:"8px 8px",textAlign:"right",fontSize:15}}/>
      {unit&&<span style={{fontSize:12,color:"var(--muted)",minWidth:22}}>{unit}</span>}
    </div>
  );
}

// ── HABIT TODAY CARD ──────────────────────────────────────────────────────────
export function HabitTodayCard({challenge:ch,log,history,currentUser,today,onLog,onSetGoalWeight,onLogWorkout}){
  const [day,setDay]=useState(today);
  const [gw,setGw]=useState("");
  const myLog=log?.byUser?.[currentUser]||{};
  const entry=myLog.days?.[day]||{};
  const earliest=editableFrom(ch,today);
  const week=challengeWeeks(ch).find(w=>w.from<=day&&day<=w.to);
  const passesUsed=week?Object.entries(myLog.days||{}).filter(([d,v])=>v?.pass&&d>=week.from&&d<=week.to).length:0;
  const canPass=entry.pass||passesUsed<(ch.passesPerWeek??1);
  const inTrial=today<ch.penaltyStart;
  const set=patch=>onLog(ch.id,day,patch);

  return(
    <div style={{marginBottom:14,padding:14,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{...bebas,fontSize:18}}>{ch.emoji} {ch.name}</div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <button aria-label="Previous day" disabled={day<=earliest} onClick={()=>setDay(addDays(day,-1))} style={{background:"none",border:"none",color:day<=earliest?"var(--border)":"var(--text)",fontSize:18,cursor:"pointer",padding:"0 6px"}}>‹</button>
          <div style={{fontSize:12,color:day===today?"var(--accent2)":"var(--text)",minWidth:84,textAlign:"center"}}>{dayLabel(day,today)}</div>
          <button aria-label="Next day" disabled={day>=today} onClick={()=>setDay(addDays(day,1))} style={{background:"none",border:"none",color:day>=today?"var(--border)":"var(--text)",fontSize:18,cursor:"pointer",padding:"0 6px"}}>›</button>
        </div>
      </div>
      {inTrial&&day===today&&<div style={{fontSize:11,color:"var(--muted)",marginBottom:8}}>Trial week: no penalties until {new Date(ch.penaltyStart+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}. You can fill in any day since the start.</div>}
      {entry.pass&&<div style={{fontSize:12,color:"var(--accent2)",marginBottom:8}}>Pass used: this day counts as a workout day and covers your daily limits.</div>}

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {ch.habits.map(h=>{
          const row=(right,hint)=>(
            <div key={h.id} style={{display:"flex",alignItems:"center",gap:10,minHeight:40}}>
              <div style={{fontSize:20,width:26,textAlign:"center"}}>{h.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14}}>{h.label}</div>
                {hint&&<div style={{fontSize:11,color:"var(--muted)"}}>{hint}</div>}
              </div>
              {right}
            </div>
          );
          if(h.type==="check"){
            const on=!!entry[h.id];
            const s=week&&scoreHabitWeek(ch,h,week,myLog,history,currentUser,today);
            return row(
              <button onClick={()=>set({[h.id]:!on})} aria-pressed={on} style={{padding:"8px 14px",borderRadius:10,cursor:"pointer",...bebas,fontSize:14,background:on?"rgba(46,204,113,0.18)":"var(--bg2)",border:on?"1px solid var(--green)":"1px solid var(--border)",color:on?"var(--green)":"var(--muted)"}}>{on?"✓ DONE":"MARK DONE"}</button>,
              s?`${s.count} of ${s.target} this week`:null);
          }
          if(h.type==="workout"){
            const k=workoutKinds(history?.[day]?.[currentUser],h.minMinutes??20);
            const hit=k[h.filter||"any"]||((h.filter||"any")==="any"&&entry.pass);
            const s=week&&scoreHabitWeek(ch,h,week,myLog,history,currentUser,today);
            return row(
              hit?<span style={{color:"var(--green)",...bebas,fontSize:14}}>✓ LOGGED</span>
                 :day===today?<button onClick={onLogWorkout} className="btn-ghost" style={{fontSize:12,padding:"8px 10px"}}>Log workout</button>
                 :<span style={{color:"var(--muted)",fontSize:12}}>None logged</span>,
              `${s?`${s.count} of ${s.target} this week · `:""}from your workout log`);
          }
          if(h.type==="protein"&&!myLog.goalWeight){
            return row(
              <div style={{display:"flex",gap:6}}>
                <input className="input" type="number" inputMode="numeric" placeholder="lbs" value={gw} onChange={e=>setGw(e.target.value)} style={{width:70,padding:"8px"}} aria-label="Goal body weight"/>
                <button className="btn-primary" style={{width:"auto",padding:"0 12px",fontSize:13}} disabled={!Number(gw)} onClick={()=>onSetGoalWeight(ch.id,Number(gw))}>SET</button>
              </div>,
              "Enter your goal body weight (only you see it)");
          }
          const hit=dailyHit(h,entry,myLog.goalWeight);
          const tgt=h.type==="protein"?`${proteinTarget(h,myLog.goalWeight)} g or more`:h.type==="max"?`${h.target} ${h.unit||""} or less`:`${h.target} ${h.unit||""} or more`;
          return row(
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <NumberField value={entry[h.id]} onSave={n=>set({[h.id]:n})} placeholder="0" unit={h.type==="protein"?"g":h.unit} label={h.label}/>
              <span style={{width:14,fontSize:13,color:hit?"var(--green)":hit===false?"var(--red)":"transparent"}}>{hit?"✓":"✗"}</span>
            </div>,
            <>Goal: {tgt}{h.type==="protein"&&<button onClick={()=>{setGw(String(myLog.goalWeight));onSetGoalWeight(ch.id,null);}} style={{background:"none",border:"none",color:"var(--accent2)",fontSize:11,cursor:"pointer",padding:"0 0 0 6px"}}>change</button>}</>);
        })}
      </div>

      <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}>
        <button disabled={!canPass} onClick={()=>set({pass:!entry.pass})} style={{background:"none",border:"none",fontSize:12,cursor:canPass?"pointer":"default",color:canPass?"var(--muted)":"var(--border)",textDecoration:"underline"}}>
          {entry.pass?"Remove pass for this day":canPass?`Use a pass for this day (${(ch.passesPerWeek??1)-passesUsed} left this week)`:"No passes left this week"}
        </button>
      </div>
    </div>
  );
}
