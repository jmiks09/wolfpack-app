import { useState } from "react";
import { addDays, challengeWeeks, dailyHit, editableFrom, fmtAmount, legacyPassMode, stepsThreshold, passableHabits, passesForWeek, validPassesForWeek, proteinTarget, scoreHabitWeek, scoreTotal, workoutKinds } from "../../../lib/habits";
import { PersonalGoalForm } from "./PersonalGoalForm";

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
export function HabitTodayCard({challenge:ch,log,history,currentUser,today,onLog,onSetGoalWeight,onLogWorkout,onSavePersonal,onDeletePersonal,onUsePass}){
  const [goalForm,setGoalForm]=useState(null); // "new" or a goal
  const [day,setDay]=useState(today);
  const [gw,setGw]=useState("");
  const myLog=log?.byUser?.[currentUser]||{};
  const entry=myLog.days?.[day]||{};
  const earliest=editableFrom(ch,today);
  const week=challengeWeeks(ch).find(w=>w.from<=day&&day<=w.to);
  // Passes: apply each of this week's passes to one goal.
  const passLimit=ch.passesPerWeek??1;
  const legacy=week?legacyPassMode(myLog,week):true;
  const weekPasses=week?passesForWeek(myLog,week):[];
  const legacyDays=week&&legacy?Object.keys(myLog.days||{}).filter(d=>myLog.days[d]?.pass&&d>=week.from&&d<=week.to).sort():[];
  const validCount=week&&!legacy?validPassesForWeek(ch,myLog,week).length:0;
  const passableIds=new Set(passableHabits(ch).map(h=>h.id));
  const passesLeft=passLimit-(legacy?legacyDays.length:validCount);
  const passEditable=!!week&&week.to>=earliest;
  const habitById=id=>ch.habits.find(h=>h.id===id);
  const applyPass=async id=>{
    for(const d of legacyDays)await onLog(ch.id,d,{pass:false}); // switching from an old day pass
    await onUsePass(ch.id,week.monday,[...weekPasses,id]);
  };
  const removePass=i=>onUsePass(ch.id,week.monday,weekPasses.filter((_,j)=>j!==i));
  const inTrial=today<ch.penaltyStart;
  const set=patch=>onLog(ch.id,day,patch);
  const personal=Object.values(myLog.personal||{}).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));

  const renderHabit=(h,isPersonal)=>{
          const row=(right,hint)=>(
            <div key={h.id} style={{display:"flex",alignItems:"center",gap:10,minHeight:40}}>
              <div style={{fontSize:20,width:26,textAlign:"center"}}>{h.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14}}>{h.label}{isPersonal&&<span style={{fontSize:11,marginLeft:6}} title={h.shared?"Shared with the pack":"Private"}>{h.shared?"👀":"🔒"}</span>}</div>
                {hint&&<div style={{fontSize:11,color:"var(--muted)"}}>{hint}</div>}
              </div>
              {right}
              {isPersonal&&<button onClick={()=>setGoalForm(h)} aria-label={`Edit ${h.label}`} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:13,padding:"0 2px"}}>✏️</button>}
            </div>
          );
          if(h.type==="total"){
            const t=scoreTotal(ch,h,myLog,today);
            return row(<NumberField value={entry[h.id]} onSave={n=>set({[h.id]:n})} placeholder="+0" unit={h.unit} label={`${h.label} added`}/>,
              `${fmtAmount(t.total,h.unit)} of ${fmtAmount(t.target,h.unit)}${t.passed?" · goal reached! 🎉":t.onPace?" · on pace":` · pace is ${fmtAmount(Math.ceil(t.pace),h.unit)}`}`);
          }
          if(h.type==="check"){
            const on=!!entry[h.id];
            const s=week&&scoreHabitWeek(ch,h,week,myLog,history,currentUser,today);
            return row(
              <button onClick={()=>set({[h.id]:!on})} aria-pressed={on} style={{padding:"8px 14px",borderRadius:10,cursor:"pointer",...bebas,fontSize:14,background:on?"rgba(46,204,113,0.18)":"var(--bg2)",border:on?"1px solid var(--green)":"1px solid var(--border)",color:on?"var(--green)":"var(--muted)"}}>{on?"✓ DONE":"MARK DONE"}</button>,
              s?`${s.count} of ${s.target} this week`:null);
          }
          if(h.type==="workout"){
            const k=workoutKinds(history?.[day]?.[currentUser],h.minMinutes??20,stepsThreshold(h));
            const hit=k[h.filter||"any"]||(legacy&&(h.filter||"any")==="any"&&entry.pass);
            const s=week&&scoreHabitWeek(ch,h,week,myLog,history,currentUser,today);
            return row(
              hit?<span style={{color:"var(--green)",...bebas,fontSize:14}}>✓ LOGGED</span>
                 :<button onClick={()=>onLogWorkout(day)} className="btn-ghost" style={{fontSize:12,padding:"8px 10px"}}>{day===today?"Log workout":"Add workout"}</button>,
              `${s?`${s.count} of ${s.target} this week · `:""}${stepsThreshold(h)?`workout log or ${stepsThreshold(h).toLocaleString("en-US")}+ steps`:"from your workout log"}`);
          }
          if(h.type==="protein"&&!myLog.goalWeight){
            return row(
              <div style={{display:"flex",gap:6}}>
                <input className="input" type="number" inputMode="numeric" placeholder="lbs" value={gw} onChange={e=>setGw(e.target.value)} style={{width:70,padding:"8px"}} aria-label="Goal body weight"/>
                <button className="btn-primary" style={{width:"auto",padding:"0 12px",fontSize:13}} disabled={!Number(gw)} onClick={()=>onSetGoalWeight(ch.id,Number(gw))}>SET</button>
              </div>,
              "Enter your goal body weight (only you see it)");
          }
          const hit=dailyHit(h,entry,myLog.goalWeight,legacy);
          const tgt=h.type==="protein"?`${proteinTarget(h,myLog.goalWeight)} g or more`:h.type==="max"?`${h.target} ${h.unit||""} or less`:`${h.target} ${h.unit||""} or more`;
          return row(
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <NumberField value={entry[h.id]} onSave={n=>set({[h.id]:n})} placeholder="0" unit={h.type==="protein"?"g":h.unit} label={h.label}/>
              <span style={{width:14,fontSize:13,color:hit?"var(--green)":hit===false?"var(--red)":"transparent"}}>{hit?"✓":"✗"}</span>
            </div>,
            <>Goal: {tgt}{h.type==="protein"&&<button onClick={()=>{setGw(String(myLog.goalWeight));onSetGoalWeight(ch.id,null);}} style={{background:"none",border:"none",color:"var(--accent2)",fontSize:11,cursor:"pointer",padding:"0 0 0 6px"}}>change</button>}</>);
  };

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
      {legacy&&entry.pass&&<div style={{fontSize:12,color:"var(--accent2)",marginBottom:8}}>Pass used: this day counts as a workout day and covers your daily limits.</div>}

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {ch.habits.map(h=>renderHabit(h,false))}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:6,paddingTop:10,borderTop:"1px dashed var(--border)"}}>
          <div style={{...bebas,fontSize:13,color:"var(--muted)"}}>MY GOALS</div>
          <button onClick={()=>setGoalForm("new")} style={{background:"none",border:"none",color:"var(--accent2)",fontSize:12,cursor:"pointer",padding:0}}>+ Add personal goal</button>
        </div>
        {personal.length===0&&<div style={{fontSize:11,color:"var(--muted)"}}>Add your own goals, like prayer or savings. Private unless you share them; they never affect money.</div>}
        {personal.map(h=>renderHabit(h,true))}
      </div>

      {week&&passLimit>0&&<div style={{marginTop:12,paddingTop:10,borderTop:"1px dashed var(--border)",display:"flex",flexDirection:"column",gap:8}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8}}>
          <div style={{...bebas,fontSize:13,color:"var(--muted)"}}>🎟️ {passLimit===1?"PASS":"PASSES"} · WEEK OF {new Date(week.monday+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}).toUpperCase()}</div>
          <div style={{fontSize:11,color:"var(--muted)"}}>{Math.max(0,passesLeft)} of {passLimit} left</div>
        </div>
        {legacyDays.map(d=>(
          <div key={d} style={{fontSize:12,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{padding:"4px 10px",borderRadius:14,background:"rgba(124,92,191,0.2)",border:"1px solid var(--accent)"}}>🎟️ Used on {dayLabel(d,today)}</span>
            <span style={{fontSize:11,color:"var(--muted)"}}>Counts as a workout day and covers that day's limits.</span>
          </div>
        ))}
        {weekPasses.map((id,i)=>{const h=habitById(id);return(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{padding:"4px 10px",borderRadius:14,fontSize:12,background:passableIds.has(id)?"rgba(124,92,191,0.2)":"var(--bg2)",border:passableIds.has(id)?"1px solid var(--accent)":"1px dashed var(--border)",color:passableIds.has(id)?"var(--text)":"var(--muted)"}}>🎟️ On {h?`${h.icon} ${h.label}`:"a removed goal"}</span>
            {!passableIds.has(id)&&<span style={{fontSize:11,color:"var(--muted)"}}>Doesn't count: not a penalty goal.</span>}
            {passEditable&&<button onClick={()=>removePass(i)} aria-label={`Remove pass from ${h?.label||"goal"}`} style={{background:"none",border:"none",color:"var(--muted)",fontSize:12,cursor:"pointer",textDecoration:"underline"}}>Undo</button>}
          </div>);})}
        {passEditable&&(passesLeft>0||legacyDays.length>0)&&
          <select className="input" aria-label="Use a pass on" value="" onChange={e=>{if(e.target.value)applyPass(e.target.value);}} style={{padding:"8px 10px",fontSize:13}}>
            <option value="">{legacyDays.length&&passesLeft<=0?"Switch your pass to a goal…":"Use a pass on…"}</option>
            {passableHabits(ch).map(h=><option key={h.id} value={h.id}>{h.icon} {h.label}{h.type==="workout"?" (+1 this week)":h.type==="check"?" (+1 this week)":" (excuse 1 missed day)"}</option>)}
          </select>}
        {passEditable&&passesLeft>0&&weekPasses.length===0&&legacyDays.length===0&&<div style={{fontSize:11,color:"var(--muted)",lineHeight:1.5}}>Sick or traveling? Put your pass on the goal you'll come up short on. A strength or cardio pass also counts as a workout day.</div>}
      </div>}
      {goalForm&&<PersonalGoalForm challenge={ch} existing={goalForm==="new"?null:goalForm} today={today}
        onSave={g=>onSavePersonal(ch.id,g)} onDelete={id=>onDeletePersonal(ch.id,id)} onClose={()=>setGoalForm(null)}/>}
    </div>
  );
}
