import { useState } from "react";
import { AI_MUSCLE_GROUPS } from "../lib/aiConfig";
import { WORKOUT_TYPES } from "../lib/constants";
import { fmtDate } from "../lib/dates";

// ── EDIT WORKOUT MODAL ────────────────────────────────────────────────────────
export function EditWorkoutModal({entry, date, currentUser, onClose, onSave, onDelete}){
  const ALL_TYPES=[
    {id:"lift",icon:"🏋️",label:"Weight Training"},
    {id:"run",icon:"🏃",label:"Running"},
    {id:"bike",icon:"🚴",label:"Cycling"},
    {id:"hiit",icon:"⚡",label:"HIIT"},
    {id:"walk",icon:"🚶",label:"Walking"},
    {id:"cardio",icon:"❤️‍🔥",label:"Mixed Cardio"},
    {id:"swim",icon:"🏊",label:"Swimming"},
    {id:"other",icon:"💪",label:"Other"},
  ];
  const [selected,setSelected]=useState(
    entry.workouts?.map(w=>ALL_TYPES.find(x=>x.id===w.id)).filter(Boolean)||
    ALL_TYPES.filter(w=>entry.workoutType===w.id)||[]
  );
  const [note,setNote]=useState(entry.note||"");
  const [duration,setDuration]=useState(()=>{
    const d={};
    (entry.workouts||[]).forEach(w=>{
      d[w.id]=entry.details?.[w.id]?.duration||entry.details?.[w.key]?.duration||"";
    });
    return d;
  });
  const toggle=w=>setSelected(s=>s.find(x=>x.id===w.id)?s.filter(x=>x.id!==w.id):[...s,w]);

  const save=()=>{
    if(selected.length===0)return;
    const icons=selected.map(w=>w.icon).join("");
    const updatedDetails={...(entry.details||{})};
    selected.forEach(w=>{if(duration[w.id])updatedDetails[w.id]={...(updatedDetails[w.id]||{}),duration:duration[w.id]};});
    const totalDur=selected.reduce((s,w)=>s+(Number(duration[w.id])||0),0)||null;
    const summaryLines=selected.map(w=>{
      // If this is a WOLFMODE lift, preserve the full WOLFMODE label
      if(w.id==="lift"&&entry.wolfmodeSession){
        const ms=entry.wolfmodeSession;
        const mgLabel=AI_MUSCLE_GROUPS.find(m=>m.id===ms.muscleGroup)?.label||ms.muscleGroup||"";
        const exCount=ms.exercises?.filter(e=>!e.skipped||e.substitutedWith).length||ms.exercises?.length||0;
        const mins=duration[w.id]||ms.estimatedMinutes||"";
        return [`WOLFMODE · Weight Training`,mgLabel,exCount?`${exCount} exercises`:null,mins?`${mins} min`:null].filter(Boolean).join(" · ");
      }
      // Find details by id or any lift_ key
      const d=updatedDetails[w.id]||Object.entries(updatedDetails).find(([k,v])=>k.startsWith("lift_")&&w.id==="lift")?.[1]||{};
      const parts=[];
      if(d.focus)parts.push(d.focus);
      if(d.distance)parts.push(`${d.distance} mi`);
      if(d.pace)parts.push(`${d.pace}/mi`);
      if(d.duration)parts.push(`${d.duration} min`);
      return parts.length>0?`${w.label}: ${parts.join(" · ")}`:w.label;
    });
    onSave(date,{...entry,workouts:selected.map(w=>({id:w.id,icon:w.icon,label:w.label})),workoutIcon:icons,workoutLabel:summaryLines.join(" | "),summary:summaryLines,note,duration:totalDur,details:updatedDetails});
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
        <input className="input" placeholder="Note..." value={note} onChange={e=>setNote(e.target.value)} style={{marginBottom:8}} maxLength={80}/>
        {selected.map(w=>(
          <div key={w.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:13,color:"var(--muted)",flex:1}}>{w.icon} {w.label}</span>
            <input className="input" type="number" placeholder="mins"
              value={duration[w.id]||""}
              onChange={e=>setDuration(d=>({...d,[w.id]:e.target.value.slice(0,3)}))}
              style={{width:70,textAlign:"center"}} min={1}/>
            <span style={{fontSize:11,color:"var(--muted)"}}>min</span>
          </div>
        ))}
        <div style={{fontSize:11,color:"var(--muted)",marginBottom:12}}>duration per workout (optional)</div>
        <button className="btn-primary" onClick={save} disabled={selected.length===0}>SAVE CHANGES</button>
        <button onClick={onDelete} style={{width:"100%",marginTop:8,padding:"10px",background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.25)",borderRadius:10,cursor:"pointer",color:"var(--red)",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1}}>
          DELETE WORKOUT
        </button>
        <button className="btn-ghost" style={{width:"100%",marginTop:6}} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
